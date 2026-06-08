const paidProvidersEnabled = process.env.OFFTRAIL_ENABLE_PAID_PROVIDERS === "true";
const aiEnrichmentEnabled = process.env.OFFTRAIL_ENABLE_AI_ENRICHMENT === "true";
const hostedPersistenceEnabled = process.env.OFFTRAIL_ENABLE_HOSTED_PERSISTENCE === "true";

export const serverEnv = {
  paidProvidersEnabled,
  googleMapsApiKey: paidProvidersEnabled
    ? process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ""
    : "",
  foursquareApiKey: paidProvidersEnabled ? process.env.FOURSQUARE_API_KEY || "" : "",
  anthropicApiKey: paidProvidersEnabled && aiEnrichmentEnabled ? process.env.ANTHROPIC_API_KEY || "" : "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
  supabaseUrl: hostedPersistenceEnabled
    ? process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
    : "",
  supabaseAnonKey: hostedPersistenceEnabled
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ""
    : "",
  supabaseServiceRoleKey: hostedPersistenceEnabled ? process.env.SUPABASE_SERVICE_ROLE_KEY || "" : "",
  allowEstimatedRoutes: process.env.OFFTRAIL_ALLOW_ESTIMATED_ROUTES === "true"
};

export function hasSupabaseConfig() {
  return Boolean(
    serverEnv.supabaseUrl &&
      serverEnv.supabaseServiceRoleKey &&
      (serverEnv.supabaseAnonKey || serverEnv.supabaseServiceRoleKey)
  );
}
