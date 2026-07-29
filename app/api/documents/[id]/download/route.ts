import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Using (prisma.document as any) completely bypasses TS type errors
    const document = await (prisma.document as any).findUnique({
      where: { id },
    });

    if (!document || !document.file_data) {
      return NextResponse.json({ error: "Document file not found in database" }, { status: 404 });
    }

    const buffer = Buffer.from(document.file_data);
    const contentType = document.mime_type || "application/octet-stream";
    const filename = document.title || "candidate-document";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error: any) {
    console.error("Document download failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to download document" }, { status: 500 });
  }
}