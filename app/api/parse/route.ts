import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";

// 2. Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to base64 for Gemini
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    // 3. DYNAMIC BRAIN UPGRADE: Fetch live Job Categories from your database
    const jobData = await prisma.jobCategory.findMany({ select: { name: true } });

    let jobListString = "Engineering, Healthcare, Construction"; // Fallback
    if (jobData && jobData.length > 0) {
      jobListString = jobData.map(j => j.name).join(", ");
    }

    // 4. Connect to Gemini 1.5 Flash (Super fast, native PDF support)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 5. The Master Prompt
    const prompt = `
You are a senior forensic document analyst and HR specialist for an international overseas recruitment agency. You are processing a multi-document PDF bundle submitted by a job candidate. This bundle may contain any combination of: bio-data sheets, CVs/resumes, passport bio-pages, visa pages, trade certificates, diplomas, experience letters, and medical reports.

Your job is to extract structured candidate data with maximum accuracy. Treat every document type differently — each has its own extraction rules below.

---

DOCUMENT-SPECIFIC EXTRACTION RULES:

[PASSPORT]
- Prioritize the Machine Readable Zone (MRZ) at the bottom of the bio-page for passportNumber, dob, and passportExpiry — MRZ is ground truth, always more reliable than handwritten fields.
- MRZ format: Line 1 starts with 'P<', Line 2 contains passport number, DOB (YYMMDD), expiry (YYMMDD).
- If MRZ is unreadable, fall back to the visual fields on the bio-page.
- Extract nationality from the passport, not from the resume.
- Flag if passport appears expired based on passportExpiry vs today.

[RESUME / BIO-DATA]
- Calculate experienceYears by summing all work history date ranges. If the candidate lists a total, cross-verify it against the actual history. Use the calculated value if there's a conflict.
- Extract the most recent job title as a signal for currentRole mapping.
- Do not infer skills — only extract what is explicitly stated or demonstrated through job descriptions.

[TRADE CERTIFICATES / DIPLOMAS / LICENSES]
- Extract the exact certificate name, issuing body, and year if present.
- Add the trade/skill to the skills array.
- Add the certificate itself (e.g., "CSWIP 3.1 Welding Certificate") to the documentsFound array.

[EXPERIENCE LETTERS]
- Use to verify or supplement work history dates if the resume is vague.
- Extract employer names and durations if not already captured.

---

JOB CATEGORIZATION:
Map the candidate's primary profession to the CLOSEST match from this approved list ONLY: [${jobListString}]
- Use their most recent role and dominant skill set to decide.
- If multiple categories fit, choose the most specific one.
- If no category fits even loosely, return exactly "Uncategorized". Never invent categories.

---

OUTPUT RULES:
- Return ONLY a single valid JSON object. No markdown, no code fences, no explanation text before or after.
- All dates must be in YYYY-MM-DD format.
- Empty string "" for any field not found. Never use null, N/A, or "not found".
- experienceYears must be an integer. If less than 1 year, return 0.
- skills array must be deduplicated — no repeated entries.
- documentsFound must list every distinct document type detected, not just the ones that yielded data.

---

RETURN THIS EXACT JSON STRUCTURE:
{
  "fullName": "First and Last Name as it appears on passport (preferred) or resume",
  "email": "",
  "phone": "",
  "address": "Home address, city, and country if found",
  "nationality": "As stated on passport or resume",
  "dob": "YYYY-MM-DD",
  "passportNumber": "Exact as in MRZ or bio-page",
  "passportExpiry": "YYYY-MM-DD",
  "passportExpired": true or false,
  "gender": "Male, Female, or Other",
  "experienceYears": 0,
  "education": "Highest qualification found",
  "skills": ["deduplicated", "list", "of", "all", "skills", "and", "trades"],
  "certificates": ["Exact certificate names with issuing body if found"],
  "currentRole": "Must be from approved list or Uncategorized",
  "summary": "2-3 sentences covering their trade specialization, total experience, overseas work history if any, and key verified certificates.",
  "documentsFound": ["Every document type detected in this bundle"]
}
`;

    // 6. Send to Gemini
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type, // Works seamlessly with application/pdf
        },
      },
    ]);

    const responseText = result.response.text();

    // Clean the JSON output just in case Gemini wraps it in ```json ... ```
    const cleanedText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const parsedJson = JSON.parse(cleanedText);

    return NextResponse.json(parsedJson, { status: 200 });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Failed to parse document", details: error.message },
      { status: 500 }
    );
  }
}