export function getFunctionsBaseUrl() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("Falta VITE_SUPABASE_URL");
  }

  // Si estás en local dev con Supabase CLI
  if (supabaseUrl.includes("localhost")) {
    return "http://127.0.0.1:54321/functions/v1";
  }

  // Producción
  return `${supabaseUrl}/functions/v1`;
}