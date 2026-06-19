import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `
You are a strict ATS data extraction engine.
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
    const formData = await req.formData();
    const file = formData.get('file') as File;

    // Bulletproof safety check: Prevent crashes if frontend accidentally sends a string
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'Invalid file upload. The backend received a string instead of a File object.' }, 
        { status: 400 }
      );
    }

    // Now we know it is 100% a valid File object
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // FIXED: The formatting here was broken by the comment
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash', // <--- Added "-latest" so the API finds the active server
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const result = await model.generateContent([
      SYSTEM_PROMPT,
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type || 'application/pdf',
        },
      },
    ]);

    let rawText = result.response.text();

    // Strip out markdown formatting if Gemini includes it
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsedData = JSON.parse(rawText);
    return NextResponse.json(parsedData, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Gemini Parsing Error Details:", error.message);
    
    return NextResponse.json(
      { error: 'Failed to process resume', details: error.message },
      { status: 500 }
    );
  }
}