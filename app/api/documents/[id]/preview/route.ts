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

    // FIX 1: Explicitly select ONLY the fields we need. 
    // This stops Prisma from pulling unnecessary data and choking the connection.
    const document = await (prisma.document as any).findUnique({
      where: { id },
      select: {
        file_data: true,
        mime_type: true,
        title: true,
      }
    });

    if (!document) {
      return NextResponse.json({ error: "Document record not found in database" }, { status: 404 });
    }

    if (!document.file_data) {
      return NextResponse.json({
        error: "This is a legacy file. The binary data is missing from the database. The person who uploaded this needs to re-upload it using the latest system."
      }, { status: 404 });
    }

    // FIX 2: Safely handle the buffer regardless of how Prisma returns it
    const buffer = Buffer.isBuffer(document.file_data)
      ? document.file_data
      : Buffer.from(document.file_data);

    const contentType = document.mime_type || "application/pdf";
    const filename = document.title || "candidate-document";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
        // FIX 3: THE MAGIC BULLET! 
        // This prevents the browser from sending duplicate requests and crashing your DB pool.
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("Document preview failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to preview document" }, { status: 500 });
  }
}