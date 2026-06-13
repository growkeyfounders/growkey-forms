import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.warn(
    "Supabase no está configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY): " +
      "el login queda deshabilitado, pero los formularios públicos siguen funcionando.",
  );
}

// Fallback placeholder: evita que createClient lance sin las env VITE_*
// y tumbe los formularios públicos (/onboarding, /offer), que no necesitan sesión.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
);
