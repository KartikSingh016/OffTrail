export const serverEnv = {
  googleMapsApiKey:
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    "",
  foursquareApiKey: process.env.FOURSQUARE_API_KEY || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
};

export function hasSupabaseConfig() {
  return Boolean(
    serverEnv.supabaseUrl &&
      serverEnv.supabaseServiceRoleKey &&
      (serverEnv.supabaseAnonKey || serverEnv.supabaseServiceRoleKey)
  );
}
