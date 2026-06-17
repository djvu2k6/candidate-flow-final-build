export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // 1. Dynamically import pdfjs ONLY on the client side!
    // This entirely prevents the DOMMatrix Server-Side Rendering crash.
    const pdfjsLib = await import("pdfjs-dist");

    // 2. Use unpkg instead of cdnjs for a more reliable worker module fetch
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    
    // Load the document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    // Loop through each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
        
      fullText += pageText + "\n";
    }

    return fullText.trim();
  } catch (error) {
    console.error("Error reading PDF:", error);
    throw new Error("Failed to extract text from the PDF document.");
  }
}