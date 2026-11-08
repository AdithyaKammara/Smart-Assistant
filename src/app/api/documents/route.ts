import { chunkText, embedDocuments, extractPdfText, PdfTooLargeError, RAG_LIMITS } from "@/lib/rag";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/** Lists the signed-in user's documents. */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: "Could not load documents" }, { status: 500 });
  return Response.json({ documents: data });
}

/** Uploads one PDF: extract text, chunk, embed, store. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });

  // Reject oversized uploads before buffering the body (multipart adds a little overhead).
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (!declared || declared > RAG_LIMITS.maxFileBytes + 64 * 1024) {
    return Response.json({ error: "PDFs can be up to 10 MB" }, { status: 413 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Attach a PDF as 'file'" }, { status: 400 });
  if (file.size > RAG_LIMITS.maxFileBytes) return Response.json({ error: "PDFs can be up to 10 MB" }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Check the PDF signature, not just the browser-supplied type.
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    return Response.json({ error: "That file is not a PDF" }, { status: 415 });
  }

  let text: string;
  try {
    text = await extractPdfText(bytes);
  } catch (error) {
    if (error instanceof PdfTooLargeError) return Response.json({ error: error.message }, { status: 413 });
    return Response.json({ error: "Could not read that PDF" }, { status: 422 });
  }
  const chunks = chunkText(text).slice(0, RAG_LIMITS.maxChunks);
  if (chunks.length === 0) {
    return Response.json({ error: "No text found. Scanned PDFs are not supported yet." }, { status: 422 });
  }

  const name = file.name.slice(0, 200) || "document.pdf";
  const { data: doc, error: docError } = await supabase.from("documents").insert({ name }).select("id").single();
  if (docError || !doc) return Response.json({ error: "Could not save the document" }, { status: 500 });

  try {
    const embeddings = await embedDocuments(chunks);
    const { error } = await supabase.from("document_chunks").insert(
      chunks.map((content, i) => ({
        document_id: doc.id,
        chunk_index: i,
        content,
        embedding: JSON.stringify(embeddings[i]),
      })),
    );
    if (error) throw error;
  } catch (error) {
    console.error("[documents] embed or insert failed", error);
    await supabase.from("documents").delete().eq("id", doc.id);
    return Response.json({ error: "Could not index the document" }, { status: 502 });
  }

  return Response.json({ document: { id: doc.id, name }, chunks: chunks.length }, { status: 201 });
}

/** Deletes one document and its chunks (cascade). */
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return Response.json({ error: "Could not delete" }, { status: 500 });
  return new Response(null, { status: 204 });
}
