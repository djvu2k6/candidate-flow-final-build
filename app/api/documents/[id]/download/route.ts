import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Map common MIME types to their corresponding extensions
const MIME_TO_EXTENSION: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const document = await (prisma.document as any).findUnique({
      where: { id },
      // ADD THIS SELECT BLOCK:
      select: {
        file_data: true,
        mime_type: true,
        title: true,
      }
    });


    if (!document || !document.file_data) {
      return NextResponse.json(
        { error: "Document file not found in database" },
        { status: 404 }
      );
    }

    const buffer = Buffer.from(document.file_data);
    const contentType = document.mime_type || "application/octet-stream";
    let filename = document.title || "candidate-document";

    // 1. Check if the filename already has an extension. If not, append it based on MIME type.
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(filename);
    if (!hasExtension && MIME_TO_EXTENSION[contentType]) {
      filename += MIME_TO_EXTENSION[contentType];
    }

    // 2. Format headers according to standard RFC 5987 (handles unicode & spaces properly)
    const encodedFilename = encodeURIComponent(filename);
    const safeFilename = filename.replace(/["\\]/g, "_");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error: any) {
    console.error("Document download failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to download document" },
      { status: 500 }
    );
  }
}