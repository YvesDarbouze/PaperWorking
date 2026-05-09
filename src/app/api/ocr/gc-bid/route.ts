import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';

/* ═══════════════════════════════════════════════════════
   POST /api/ocr/gc-bid

   Accepts a General Contractor bid or invoice (PDF or image)
   as either a Firebase Storage download URL or a raw
   base64-encoded buffer, runs it through Gemini Vision,
   and returns a typed extraction of the bid's financial
   line items, contractor details, and total amount.

   Request body (JSON):
     { fileUrl: string }                    — Firebase Storage download URL
     { fileBase64: string, mimeType?: string } — base64 file + optional MIME

   Response 200:
     { data: GCBidExtraction }

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

export type GCBidCategory =
  | 'Demolition'
  | 'Foundation'
  | 'Framing'
  | 'Roofing'
  | 'Plumbing'
  | 'Electrical'
  | 'HVAC'
  | 'Insulation'
  | 'Drywall'
  | 'Flooring'
  | 'Cabinets & Counters'
  | 'Paint & Finish'
  | 'Windows & Doors'
  | 'Landscaping'
  | 'Permit Fees'
  | 'Labor'
  | 'Materials'
  | 'Other';

export interface GCBidLineItem {
  description: string;
  category: GCBidCategory;
  amount: number;
  unit?: string;
  quantity?: number;
}

export interface GCBidExtraction {
  contractorName: string;
  contractorPhone?: string;
  contractorEmail?: string;
  contractorLicense?: string;
  bidDate?: string; // ISO date string YYYY-MM-DD
  validUntil?: string; // ISO date string
  totalAmount: number;
  laborCost: number;
  materialsCost: number;
  lineItems: GCBidLineItem[];
  paymentTerms?: string;
  notes?: string;
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

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const FILE_FETCH_TIMEOUT_MS = 30_000;
const OCR_TIMEOUT_MS = 60_000;

const VALID_CATEGORIES: GCBidCategory[] = [
  'Demolition', 'Foundation', 'Framing', 'Roofing', 'Plumbing',
  'Electrical', 'HVAC', 'Insulation', 'Drywall', 'Flooring',
  'Cabinets & Counters', 'Paint & Finish', 'Windows & Doors',
  'Landscaping', 'Permit Fees', 'Labor', 'Materials', 'Other',
];

const EXTRACTION_PROMPT = `You are an expert construction cost analyst and real estate investor. Analyze the attached General Contractor bid, proposal, or invoice document and extract its structured data.

Return ONLY a single valid JSON object matching this structure exactly (use empty string or 0 for missing fields, empty array for missing lists):

{
  "contractorName": "<full company or contractor name, or empty string if not found>",
  "contractorPhone": "<phone number or empty string>",
  "contractorEmail": "<email address or empty string>",
  "contractorLicense": "<license number or empty string>",
  "bidDate": "<YYYY-MM-DD format date bid was issued, or empty string>",
  "validUntil": "<YYYY-MM-DD format expiration date, or empty string>",
  "totalAmount": <total bid amount in USD as a number, 0 if not found>,
  "laborCost": <total labor costs in USD as a number, 0 if not broken out>,
  "materialsCost": <total materials costs in USD as a number, 0 if not broken out>,
  "lineItems": [
    {
      "description": "<concise work description>",
      "category": "<one of: Demolition|Foundation|Framing|Roofing|Plumbing|Electrical|HVAC|Insulation|Drywall|Flooring|Cabinets & Counters|Paint & Finish|Windows & Doors|Landscaping|Permit Fees|Labor|Materials|Other>",
      "amount": <dollar amount as number>,
      "unit": "<unit of measure if present, e.g. sq ft, linear ft, or empty string>",
      "quantity": <quantity as number if present, or 0>
    }
  ],
  "paymentTerms": "<payment schedule or terms, or empty string>",
  "notes": "<any important conditions, exclusions, or scope notes, or empty string>",
  "confidence": "<high if all major fields found, medium if most found, low if few found>"
}

Map each line item to the closest matching category from the list. If the document is a summary without line items, create one line item for the total. Do not include markdown, code fences, or any text outside the JSON object.`;

// ── Route Handler ────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

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

  const GEMINI_API_KEY =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error('[OCR/gc-bid] GOOGLE_GENERATIVE_AI_API_KEY is not set');
    return NextResponse.json({ error: 'OCR service is not configured' }, { status: 503 });
  }

  let base64Data: string;
  let resolvedMimeType: string = rawMimeType;

  if (fileUrl) {
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
      console.error('[OCR/gc-bid] File fetch error:', err?.message ?? err);
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

    const contentLength = Number(fileResponse.headers.get('content-length') ?? '0');
    if (contentLength > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
    }

    const buffer = await fileResponse.arrayBuffer();
    if (buffer.byteLength > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
    }

    base64Data = Buffer.from(buffer).toString('base64');
    const ct = fileResponse.headers.get('content-type');
    if (ct) resolvedMimeType = ct.split(';')[0].trim();
  } else {
    base64Data = fileBase64!;
  }

  if (!(ALLOWED_MIMES as readonly string[]).includes(resolvedMimeType)) {
    return NextResponse.json(
      { error: `Unsupported file type "${resolvedMimeType}". Accepted: ${ALLOWED_MIMES.join(', ')}` },
      { status: 415 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
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

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      console.error('[OCR/gc-bid] Gemini returned non-JSON:', rawText.slice(0, 300));
      return NextResponse.json(
        { error: 'OCR model returned an unparseable response' },
        { status: 502 }
      );
    }

    const lineItems: GCBidLineItem[] = Array.isArray(raw.lineItems)
      ? raw.lineItems.map((item: any) => ({
          description: String(item.description || 'Unlabeled item'),
          category: VALID_CATEGORIES.includes(item.category) ? item.category : 'Other',
          amount: Number(item.amount) || 0,
          unit: String(item.unit || ''),
          quantity: Number(item.quantity) || 0,
        }))
      : [];

    const extraction: GCBidExtraction = {
      contractorName: String(raw.contractorName || ''),
      contractorPhone: String(raw.contractorPhone || ''),
      contractorEmail: String(raw.contractorEmail || ''),
      contractorLicense: String(raw.contractorLicense || ''),
      bidDate: String(raw.bidDate || ''),
      validUntil: String(raw.validUntil || ''),
      totalAmount: Number(raw.totalAmount) || 0,
      laborCost: Number(raw.laborCost) || 0,
      materialsCost: Number(raw.materialsCost) || 0,
      lineItems,
      paymentTerms: String(raw.paymentTerms || ''),
      notes: String(raw.notes || ''),
      confidence:
        raw.confidence === 'high' || raw.confidence === 'medium' || raw.confidence === 'low'
          ? raw.confidence
          : 'low',
    };

    return NextResponse.json({ data: extraction }, { status: 200 });
  } catch (err: any) {
    const isTimeout = err?.message === 'OCR_TIMEOUT';
    console.error('[OCR/gc-bid] Gemini error:', err?.message ?? err);
    return NextResponse.json(
      { error: isTimeout ? 'OCR processing timed out after 60 s' : 'OCR processing failed' },
      { status: 502 }
    );
  }
}
