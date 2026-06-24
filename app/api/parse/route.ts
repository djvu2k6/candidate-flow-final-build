import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// CRITICAL FIX: Allows Next.js/Vercel up to 60 seconds to process massive 15-page PDFs
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `
You are an expert document analyst for an immigration agency. 
You will receive a multi-page bio-data package — a single PDF containing multiple documents merged together. This may include any combination of:
- A bio-data summary sheet (name, DOB, passport details, skills)
- Passport pages (photo page, details page)
- Birth certificate
- Education certificates / marksheets
- Experience letters
- Medical certificates
- Police clearance certificates
- Any other supporting documents

Your job: scan ALL pages thoroughly and extract the following fields by pulling from whichever page contains that information. Cross-reference across pages. If there's a conflict, prefer the passport as the source of truth for identity fields.

Return ONLY a raw JSON object — no markdown, no backticks, no explanation. If a field is not found anywhere in the document, return null.

{
  "fullName": "Full legal name exactly as it appears on the passport or bio-data sheet",
  "email": "Email address or null",
  "phone": "Phone number including country code (often +91 or +972) if visible, or null",
  "dob": "Date of birth in YYYY-MM-DD format. Cross-check between birth certificate and passport. If conflict, prefer passport.",
  "gender": "Male / Female / Other — from any document",
  "passportNumber": "Passport number — alphanumeric, usually 8-9 characters. Extract from passport page.",
  "passportExpiry": "Passport expiry date in YYYY-MM-DD format — from passport page",
  "skills": ["skill1", "skill2"],
  "experienceYears": 0,
  "education": "Highest qualification found across all education certificates. e.g. 'Diploma in Electrical Engineering, Kerala Technical University, 2018'",
  "summary": "2-sentence professional summary based on everything you read across all documents",
  "documentsFound": ["list", "of", "document", "types", "you", "detected", "in", "this", "PDF"]
}

Critical rules:
- Scan every single page — do not stop after the first page.
- Never hallucinate. If genuinely not found after checking all pages, return null.
- Do NOT guess the passport expiry date. If it is blurry or illegible on the passport scan, return null.
- Dates must be YYYY-MM-DD. Best-guess for DOB if day/month unclear, but NEVER guess passport expiry.
- The documentsFound array helps staff know what was detected — list everything you see (e.g. "Passport", "Birth Certificate", "Diploma Certificate", "Experience Letter").
- Skills can be inferred from certificates, job titles, or experience letters if no explicit list exists.
`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'No valid file received. Please upload a PDF or image.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // Determine mime type — default to pdf if browser sends blank
    const mimeType = file.type && file.type !== 'application/octet-stream'
      ? file.type
      : 'application/pdf';

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1, // Low temp = more precise, less creative
      }
    });

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ]);

    let rawText = result.response.text();

    // Strip markdown fences if Gemini still wraps despite responseMimeType
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    // Validate it's actual JSON before sending
    let parsedData;
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseError) {
      console.error('JSON parse failed. Raw Gemini output:', rawText);
      return NextResponse.json(
        { error: 'Gemini returned invalid JSON. Try again or use manual entry.', details: rawText.slice(0, 300) },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedData, { status: 200 });

  } catch (error: any) {
    console.error('Gemini Parsing Error:', error.message);

    // Specific Gemini API errors
    if (error.message?.includes('API_KEY')) {
      return NextResponse.json(
        { error: 'Invalid or missing Gemini API key. Check your .env file.' },
        { status: 401 }
      );
    }

    if (error.message?.includes('quota') || error.message?.includes('429')) {
      return NextResponse.json(
        { error: 'Gemini rate limit hit. Wait a minute and try again.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process document.', details: error.message },
      { status: 500 }
    );
  }
}