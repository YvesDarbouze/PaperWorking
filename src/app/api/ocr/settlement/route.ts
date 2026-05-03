import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';

/* ═══════════════════════════════════════════════════════
   POST /api/ocr/settlement

   Accepts a HUD-1 / ALTA settlement statement (PDF or image)
   as either a Firebase Storage download URL or a raw
   base64-encoded buffer, runs it through Gemini Vision,
   and returns a typed extraction of the key financial fields.

   Request body (JSON):
     { fileUrl: string }        — Firebase Storage download URL
     { fileBase64: string,
       mimeType?: string }      — base64 file content + optional MIME

   Response 200:
     { data: SettlementExtraction }

   Errors:
     400  — missing/invalid input
     401  — unauthenticated
     413  — file exceeds 10 MB
     415  — unsupported MIME type
     503  — OCR service not configured
     502  — file fetch failed or Gemini error / timeout
   ═══════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

// ── Types ────────────────────────────────────────────────

interface OcrRequestBody {
  fileUrl?: string;
  fileBase64?: string;
  mimeType?: string;
}

export interface SettlementExtraction {
  /** Total closing costs paid at settlement */
  closingCosts: number;
  /** Seller's net proceeds after all deductions */
  netProceeds: number;
  /** Total loan / mortgage payoffs */
  payoffs: number;
  /** County / municipal recording fees */
  recordingFees: number;
  /** Total acquisition cost / purchase price */
  acquisitionCost: number;
  /** Total disposition / settlement charges */
  dispositionCost: number;
  /** Title insurance and title-related fees */
  titleFees: number;
  /** Transfer taxes / documentary stamps */
  transferTaxes: number;
  /** Model's self-reported extraction confidence */
  confidence: 'high' | 'medium' | 'low';
}

// ── Constants ────────────────────────────────────────────

const ALLOWED_STORAGE_HOSTS = [
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
];

const ALLOWED_MIMES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

type AllowedMime = (typeof ALLOWED_MIMES)[number];

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB — Gemini inline data limit
const FILE_FETCH_TIMEOUT_MS = 30_000;
const OCR_TIMEOUT_MS = 60_000;

const NUMERIC_FIELDS = [
  'closingCosts',
  'netProceeds',
  'payoffs',
  'recordingFees',
  'acquisitionCost',
  'dispositionCost',
  'titleFees',
  'transferTaxes',
] as const;

const EXTRACTION_PROMPT = `You are an expert real estate closing analyst. Analyze the attached HUD-1 or ALTA/RESPA settlement statement and extract the following financial fields.

Return ONLY a single valid JSON object with these exact keys (use 0 for any field not present in the document):

{
  "closingCosts":     <total closing costs paid at settlement, USD>,
  "netProceeds":      <seller's net proceeds after all deductions, USD>,
  "payoffs":          <total loan or mortgage payoffs, USD>,
  "recordingFees":    <county or municipal recording fees, USD>,
  "acquisitionCost":  <total acquisition cost or purchase price, USD>,
  "dispositionCost":  <total disposition or settlement charges, USD>,
  "titleFees":        <title insurance and title-related fees, USD>,
  "transferTaxes":    <transfer taxes or documentary stamps, USD>,
  "confidence":       <"high" if all fields found, "medium" if most found, "low" if few found>
}

Do not include markdown, code fences, explanation, or any text outside the JSON object.`;

// ── Route Handler ────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  // ── Parse body ──────────────────────────────────────────
  let body: OcrRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { fileUrl, fileBase64, mimeType: rawMimeType = 'application/pdf' } = body;

  if (!fileUrl && !fileBase64) {
    return NextResponse.json(
      { error: 'Provide either fileUrl (Firebase Storage URL) or fileBase64 with mimeType' },
      { status: 400 }
    );
  }

  // ── Guard: API key ───────────────────────────────────────
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error('[OCR/settlement] GEMINI_API_KEY environment variable is not set');
    return NextResponse.json({ error: 'OCR service is not configured' }, { status: 503 });
  }

  // ── Resolve base64 payload ───────────────────────────────
  let base64Data: string;
  let resolvedMimeType: string = rawMimeType;

  if (fileUrl) {
    // SSRF guard — only Firebase Storage URLs are allowed
    let parsed: URL;
    try {
      parsed = new URL(fileUrl);
    } catch {
      return NextResponse.json({ error: 'fileUrl is not a valid URL' }, { status: 400 });
    }

    const isAllowedHost = ALLOWED_STORAGE_HOSTS.some(
      host => parsed.hostname === host || parsed.hostname.endsWith('.' + host)
    );
    if (!isAllowedHost) {
      return NextResponse.json(
        { error: 'fileUrl must point to a Firebase Storage host' },
        { status: 400 }
      );
    }

    // Fetch the file from Firebase Storage server-side
    let fileResponse: Response;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FILE_FETCH_TIMEOUT_MS);
      try {
        fileResponse = await fetch(fileUrl, { signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError';
      console.error('[OCR/settlement] File fetch error:', err?.message ?? err);
      return NextResponse.json(
        { error: isAbort ? 'File fetch timed out' : 'Failed to retrieve file from storage' },
        { status: 502 }
      );
    }

    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: `Storage responded with ${fileResponse.status}` },
        { status: 400 }
      );
    }

    // Reject oversized files before buffering
    const contentLength = Number(fileResponse.headers.get('content-length') ?? '0');
    if (contentLength > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
    }

    const buffer = await fileResponse.arrayBuffer();
    if (buffer.byteLength > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
    }

    base64Data = Buffer.from(buffer).toString('base64');

    // Prefer the Content-Type from the storage response over the caller's hint
    const ct = fileResponse.headers.get('content-type');
    if (ct) resolvedMimeType = ct.split(';')[0].trim();
  } else {
    base64Data = fileBase64!;
  }

  // ── Validate MIME type ───────────────────────────────────
  if (!(ALLOWED_MIMES as readonly string[]).includes(resolvedMimeType)) {
    return NextResponse.json(
      { error: `Unsupported file type "${resolvedMimeType}". Accepted: ${ALLOWED_MIMES.join(', ')}` },
      { status: 415 }
    );
  }

  // ── Gemini OCR ───────────────────────────────────────────
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0,
      },
    });

    const ocrPromise = model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: EXTRACTION_PROMPT },
            { inlineData: { mimeType: resolvedMimeType as AllowedMime, data: base64Data } },
          ],
        },
      ],
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('OCR_TIMEOUT')), OCR_TIMEOUT_MS)
    );

    const result = await Promise.race([ocrPromise, timeoutPromise]);
    const rawText = result.response.text().trim();

    // ── Parse and type-coerce the extraction ─────────────────
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      console.error('[OCR/settlement] Gemini returned non-JSON:', rawText.slice(0, 300));
      return NextResponse.json(
        { error: 'OCR model returned an unparseable response' },
        { status: 502 }
      );
    }

    const extraction: SettlementExtraction = {
      closingCosts:    Number(raw.closingCosts)    || 0,
      netProceeds:     Number(raw.netProceeds)     || 0,
      payoffs:         Number(raw.payoffs)         || 0,
      recordingFees:   Number(raw.recordingFees)   || 0,
      acquisitionCost: Number(raw.acquisitionCost) || 0,
      dispositionCost: Number(raw.dispositionCost) || 0,
      titleFees:       Number(raw.titleFees)       || 0,
      transferTaxes:   Number(raw.transferTaxes)   || 0,
      confidence:
        raw.confidence === 'high' || raw.confidence === 'medium' || raw.confidence === 'low'
          ? raw.confidence
          : 'low',
    };

    return NextResponse.json({ data: extraction }, { status: 200 });

  } catch (err: any) {
    const isTimeout = err?.message === 'OCR_TIMEOUT';
    console.error('[OCR/settlement] Gemini error:', err?.message ?? err);
    return NextResponse.json(
      { error: isTimeout ? 'OCR processing timed out after 60 s' : 'OCR processing failed' },
      { status: 502 }
    );
  }
}
