import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';
// Initialize the Groq client with your API key
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { resumeText } = await request.json();

    if (!resumeText) {
      return NextResponse.json({ error: "No resume text provided" }, { status: 400 });
    }

    // Call Groq API using Llama 3 with explicit JSON schema instructions
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert enterprise HR parser specializing in global tech talent and immigration compliance. 
          Analyze the raw resume text provided and extract the data into a perfectly structured JSON object. 
          
          You MUST respond with a single, valid JSON object matching this exact structure:
          {
            "name": "Full Name",
            "email": "Email Address",
            "phone": "Phone Number",
            "dob": "YYYY-MM-DD if found, else empty",
            "nationality": "Nationality if stated, else empty",
            "passport": "Passport number if stated, else empty",
            "currentRole": "Job Title",
            "country": "Inferred or stated current country of residence",
            "skills": ["Skill1", "Skill2", "Skill3"],
            "experienceYears": 5,
            "education": "Highest degree obtained and university",
            "visaTrackRecommendation": "H-1B Track, L-1 Track, O-1A Track, or EB-2 NIW based on seniority and background"
          }
          Do not include any introductory remarks, markdown code blocks, or explanatory text. Return ONLY the raw JSON string.`,
        },
        {
          role: "user",
          content: `Here is the raw text of the resume to parse:\n\n${resumeText}`,
        },
      ],
      // Use Llama 3 8b or 70b depending on your speed needs (8b is lightning-fast and great for structured text)
      model: "llama-3.1-8b-instant", 
      temperature: 0.1, 
      response_format: { type: "json_object" },
    });

    const responseContent = chatCompletion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error("Empty response received from Groq AI engine");
    }

    // Parse the string into a clean object to return to the frontend
    const parsedData = JSON.parse(responseContent);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Groq Parsing Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process resume with AI" },
      { status: 500 }
    );
  }
}