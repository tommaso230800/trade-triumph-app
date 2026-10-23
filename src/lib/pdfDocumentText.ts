import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import worker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = worker;
export async function readPdfText(file: File): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new Error("Il PDF supera 20 MB.");
  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;
  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map(item => "str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : "").join(""));
    }
    return pages.join("\n\n");
  } finally { await doc.destroy(); }
}