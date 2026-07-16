import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "misc";

    if (!file) {
      return NextResponse.json({ error: "No file received." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name.replace(/\s+/g, '_');
    const filename = `${Date.now()}-${originalName}`;
    
    // Use public/uploads for local storage since we are hosting on InterServer
    const uploadDir = join(process.cwd(), "public", "uploads", folder);

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Return the public URL
    const fileUrl = `/uploads/${folder}/${filename}`;

    return NextResponse.json({ url: fileUrl }, { status: 201 });
  } catch (error: any) {
    console.error("Error occurred while saving file:", error);
    return NextResponse.json({ error: "Failed to upload file." }, { status: 500 });
  }
}
