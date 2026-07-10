import { createClient } from "@/lib/supabase";

/**
 * Envia um arquivo para um bucket privado do Supabase Storage.
 * Retorna o "path" salvo (não a URL pública — os buckets são privados).
 * Para exibir/baixar depois, gerar uma signed URL com supabase.storage.from(bucket).createSignedUrl(path, ...).
 */
export async function uploadDocumento(
  bucket: "fotos-clientes" | "documentos-clientes" | "comprovantes" | "contratos-assinados",
  empresaId: string,
  file: File
): Promise<string | null> {
  const supabase = createClient();
  const caminho = `${empresaId}/${crypto.randomUUID()}-${file.name}`;

  const { error } = await supabase.storage.from(bucket).upload(caminho, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    console.error("Erro ao enviar arquivo:", error.message);
    return null;
  }

  return caminho;
}
