import { afterEach, describe, expect, it } from "vitest";
import { extractPdfText, RAG_LIMITS } from "./rag";

/** Builds a minimal one-page PDF whose page shows each line of text. */
function makePdf(lines: string[], fontSize = 10): Uint8Array {
  const stream = lines.map((l, i) => `BT /F1 ${fontSize} Tf 20 ${780 - i * 12} Td (${l}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, i) => {
    const at = pdf.length;
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return at;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

const original = RAG_LIMITS.maxChunks;
afterEach(() => {
  RAG_LIMITS.maxChunks = original;
});

describe("extractPdfText", () => {
  it("reads the text of a PDF", async () => {
    const text = await extractPdfText(makePdf(["Visitors use the network NW-Guest."]));
    expect(text).toContain("NW-Guest");
  });

  it("cuts a single long text item to the remaining budget", async () => {
    RAG_LIMITS.maxChunks = 1; // budget: 1000 characters
    // 1100 characters at 0.5pt fit on the page, so pdf.js returns them as one item.
    const text = await extractPdfText(makePdf(["x".repeat(1100)], 0.5));
    expect(text.length).toBe(1000);
  });

  it("stops inside a single page once the text budget is reached", async () => {
    RAG_LIMITS.maxChunks = 1; // budget: 1 x (1200 - 200) = 1000 characters
    const lines = Array.from({ length: 60 }, (_, i) => `Line ${i} with some filler text to use up the budget`);
    const text = await extractPdfText(makePdf(lines));
    expect(text.length).toBeLessThanOrEqual(1000);
    expect(text).toContain("Line 0");
    expect(text).not.toContain("Line 59");
  });
});
