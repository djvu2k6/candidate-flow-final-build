import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const candidateId = formData.get("candidate_id") as string;
    const title = formData.get("title") as string;

    if (!file || typeof file === "string" || !(file instanceof File)) {
      return NextResponse.json({ error: "No file received." }, { status: 400 });
    }

    if (!candidateId) {
      return NextResponse.json({ error: "Candidate ID is required to save the document." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Using (prisma.document as any) completely bypasses TS type errors
    const newDocument = await (prisma.document as any).create({
      data: {
        candidate_id: candidateId,
        title: title || file.name,
        file_data: buffer,
        mime_type: file.type || "application/octet-stream",
        status: "Uploaded",
      },
    });
    revalidatePath(`/candidate/${candidateId}`);

    return NextResponse.json({
      success: true,
      documentId: newDocument.id,
      name: file.name,
      type: file.type || "application/octet-stream",
    }, { status: 201 });

  } catch (error: any) {
    const message = error?.message || "Failed to upload file.";
    const status = /too large|entity/i.test(message) ? 413 : 500;
    console.error("Error occurred while saving file to DB:", error);
    return NextResponse.json({ error: message }, { status });
  }
}