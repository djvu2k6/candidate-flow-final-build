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

    const document = await (prisma.document as any).findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: "Document record not found in database" }, { status: 404 });
    }

    if (!document.file_data) {
      return NextResponse.json({ 
        error: "This is a legacy file. The binary data is missing from the database. The person who uploaded this needs to re-upload it using the latest system." 
      }, { status: 404 });
    }

    const buffer = Buffer.from(document.file_data);
    
    // Default to PDF if the mime type is missing, as browsers handle PDF previews best
    const contentType = document.mime_type || "application/pdf"; 
    const filename = document.title || "candidate-document";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Using 'inline' forces the browser to preview it!
        "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error: any) {
    console.error("Document preview failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to preview document" }, { status: 500 });
  }
}