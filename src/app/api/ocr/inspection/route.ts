import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';

export const dynamic = 'force-dynamic';

interface OcrRequestBody {
  fileUrl?: string;
  fileBase64?: string;
  mimeType?: string;
}

export interface InspectionExtractionIssue {
  category: 'Structural' | 'Plumbing' | 'Electrical' | 'HVAC' | 'Foundation' | 'Roof';
  description: string;
  severity: 'Critical' | 'Major' | 'Minor' | 'Cosmetic';
  estimatedRepairCost: number;
}

export interface InspectionExtraction {
  issues: InspectionExtractionIssue[];
  confidence: 'high' | 'medium' | 'low';
}

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

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const FILE_FETCH_TIMEOUT_MS = 30_000;
const OCR_TIMEOUT_MS = 60_000;

const EXTRACTION_PROMPT = `You are an expert real estate home inspector and analyst. Analyze the attached inspection report and extract the issues found.

Return ONLY a single valid JSON object matching this structure exactly:

{
  "issues": [
    {
      "category": "Structural" | "Plumbing" | "Electrical" | "HVAC" | "Foundation" | "Roof",
      "description": "<concise description of the issue>",
      "severity": "Critical" | "Major" | "Minor" | "Cosmetic",
      "estimatedRepairCost": <estimated cost to repair in USD as a number, use 0 if unknown>
    }
  ],
  "confidence": "high" | "medium" | "low"
}

If you find issues that do not strictly match the 6 categories above, map them to the closest one (e.g., 'Structural' or 'Foundation' for framing). Do not include markdown, code fences, or any text outside the JSON object.`;

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
      { error: 'Provide either fileUrl or fileBase64 with mimeType' },
      { status: 400 }
    );
  }

  const GEMINI_API_KEY =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
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
      return NextResponse.json(
        { error: err?.name === 'AbortError' ? 'File fetch timed out' : 'Failed to retrieve file' },
        { status: 502 }
      );
    }

    if (!fileResponse.ok) {
      return NextResponse.json({ error: 'Storage responded with error' }, { status: 400 });
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
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
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
      raw = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: 'OCR model returned an unparseable response' }, { status: 502 });
    }

    const issues = Array.isArray(raw.issues) ? raw.issues.map((i: any) => ({
      category: ['Structural', 'Plumbing', 'Electrical', 'HVAC', 'Foundation', 'Roof'].includes(i.category) ? i.category : 'Structural',
      description: String(i.description || 'Unknown issue'),
      severity: ['Critical', 'Major', 'Minor', 'Cosmetic'].includes(i.severity) ? i.severity : 'Minor',
      estimatedRepairCost: Number(i.estimatedRepairCost) || 0,
    })) : [];

    const extraction: InspectionExtraction = {
      issues,
      confidence: raw.confidence === 'high' || raw.confidence === 'medium' || raw.confidence === 'low' ? raw.confidence : 'low',
    };

    return NextResponse.json({ data: extraction }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message === 'OCR_TIMEOUT' ? 'OCR processing timed out' : 'OCR processing failed' },
      { status: 502 }
    );
  }
}
