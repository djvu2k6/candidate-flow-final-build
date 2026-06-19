import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize the Gemini API (Ensure you add GEMINI_API_KEY to your .env.local)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Highly optimized prompt to minimize tokens
const SYSTEM_PROMPT = `
You are a strict, highly efficient ATS data extraction engine.
Extract the following candidate details from the provided resume document.
Return ONLY a valid JSON object matching the exact schema below. Do not include markdown blocks, explanations, or any extra text. If a field is missing, return null.

{
  "fullName": "Full Name",
  "email": "Email Address",
  "phone": "Phone Number",
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "experienceYears": 0,
  "summary": "A concise 2-sentence professional summary."
}
`;

export async function POST(req: Request) {
  try {
    // 1. Get the uploaded PDF file from the request
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided.' }, { status: 400 });
    }

    // 2. Convert the file into a Base64 string for Gemini
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // 3. Configure the Gemini 1.5 Flash model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        // Enforce JSON output to prevent UI crashes and save tokens
        responseMimeType: "application/json",
      }
    });

    // 4. Send the PDF and the Prompt to Gemini
    const result = await model.generateContent([
      SYSTEM_PROMPT,
      {
        inlineData: {
          data: base64Data,
          mimeType: 'application/pdf',
        },
      },
    ]);

    // 5. Parse the strictly formatted JSON response
    const rawText = result.response.text();
    const parsedData = JSON.parse(rawText);

    return NextResponse.json(parsedData, { status: 200 });

  } catch (error: any) {
    console.error("Gemini Parsing Error:", error);
    return NextResponse.json(
      { error: 'Failed to process resume', details: error.message },
      { status: 500 }
    );
  }
}