import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";

const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  throw new Error("GEMINI_API_KEY environment variable is missing!");
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

// Helper function to pause briefly during retries
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1. Convert File directly to Base64 (DO NOT convert to text string)
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    // 2. Ensure MIME type is accurate
    let mimeType = file.type;
    if (!mimeType || mimeType === "application/octet-stream") {
      mimeType = file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg";
    }

    // 3. Fetch live Job Categories from database
    let jobListString = "Engineering, Healthcare, Construction";
    try {
      const jobData = await prisma.jobCategory.findMany({ select: { name: true } });
      if (jobData && jobData.length > 0) {
        jobListString = jobData.map((j) => j.name).join(", ");
      }
    } catch (dbError) {
      console.warn("[PARSE API] Job category lookup failed; using fallback list.");
    }

    // 4. Extraction Prompt
    const prompt = `
You are an expert HR document parser specializing in candidate recruitment files (Resumes, Passports, Aadhaar/ID cards, Trade Certificates).

Analyze this document visual content directly and extract candidate details.

RULES:
- Read visual text, tables, and headers directly from the document.
- Never output raw PDF syntax (%PDF, stream bytes, or code markers).
- [PASSPORT]: Extract passportNumber, dob (YYYY-MM-DD), passportExpiry (YYYY-MM-DD), and nationality.
- [EXPERIENCE]: Calculate experienceYears as an integer (default to 0 if not stated).
- [JOB CATEGORY]: Map currentRole to the CLOSEST match from this list ONLY: [${jobListString}]. If none fit, use "Uncategorized".
- Return ONLY a single valid JSON object. No markdown wrapping (no \`\`\`json).

REQUIRED JSON FORMAT:
{
  "fullName": "",
  "email": "",
  "phone": "",
  "address": "",
  "nationality": "",
  "dob": "YYYY-MM-DD",
  "passportNumber": "",
  "passportExpiry": "YYYY-MM-DD",
  "passportExpired": false,
  "gender": "",
  "experienceYears": 0,
  "education": "",
  "skills": [],
  "certificates": [],
  "currentRole": "Uncategorized",
  "summary": "Concise 2-sentence summary of candidate qualifications."
}
`;

    // 5. Multi-Model Fallback List
    const candidateModels = [
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
    ];

    let result: any = null;
    let lastError: any = null;

    // Iterate through available models
    for (const modelName of candidateModels) {
      // Retry up to 2 times per model on 503 traffic spikes
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[PARSE API] Trying model: ${modelName} (Attempt ${attempt})`);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: "application/json" },
          });

          result = await model.generateContent([
            prompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
          ]);

          if (result) break;
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || "";
          console.warn(`[PARSE API] ${modelName} attempt ${attempt} failed: ${errMsg.substring(0, 100)}`);

          // If hit by 503 high-demand spike, pause 1.2s before retrying/switching models
          if (errMsg.includes("503") || errMsg.includes("Service Unavailable") || errMsg.includes("high demand")) {
            await wait(1200);
            continue;
          }

          // If rate limited or quota error, break attempt loop to try next model or throw
          if (errMsg.includes("429") || errMsg.includes("quota")) {
            break;
          }
        }
      }

      if (result) break; // Stop as soon as one model succeeds
    }

    if (!result) {
      const is503 = lastError?.message?.includes("503") || lastError?.message?.includes("high demand");
      const isQuota = lastError?.message?.includes("429") || lastError?.message?.includes("quota");

      return NextResponse.json(
        {
          error: is503
            ? "Gemini servers are experiencing a temporary high demand spike. Please try again in a moment."
            : isQuota
            ? "API quota limit hit. Please check your key usage."
            : "Failed to process document with Gemini.",
          details: lastError?.message || "All fallback models failed.",
        },
        { status: is503 ? 503 : isQuota ? 429 : 500 }
      );
    }

    const responseText = result.response.text();
    const parsedJson = JSON.parse(responseText);

    return NextResponse.json(parsedJson, { status: 200 });

  } catch (error: any) {
    console.error("Parse Route Error:", error);
    return NextResponse.json(
      { error: "Failed to parse document bundle", details: error.message },
      { status: 500 }
    );
  }
}