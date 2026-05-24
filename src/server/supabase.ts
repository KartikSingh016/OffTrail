import { hasSupabaseConfig, serverEnv } from "./env";
import { fetchJson, HttpError } from "./retry";

type SupabaseUserResponse = {
  id?: string;
};

export async function getAuthenticatedUserId(token: string) {
  assertSupabaseConfig();

  const user = await fetchJson<SupabaseUserResponse>(
    `${serverEnv.supabaseUrl}/auth/v1/user`,
    {
      headers: {
        apikey: serverEnv.supabaseAnonKey || serverEnv.supabaseServiceRoleKey,
        Authorization: `Bearer ${token}`
      }
    },
    "Supabase auth user lookup"
  );

  if (!user.id) {
    throw new HttpError("Unauthorized", 401, "Missing Supabase user id.");
  }

  return user.id;
}

export async function insertSavedRoute(input: {
  userId: string;
  origin: unknown;
  destination: unknown;
  routeData: unknown;
  locations: unknown[];
}) {
  assertSupabaseConfig();

  const rows = await fetchJson<Array<{ id: string }>>(
    `${serverEnv.supabaseUrl}/rest/v1/saved_routes`,
    {
      method: "POST",
      headers: {
        apikey: serverEnv.supabaseServiceRoleKey,
        Authorization: `Bearer ${serverEnv.supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        user_id: input.userId,
        origin: input.origin,
        destination: input.destination,
        route_data: input.routeData,
        locations: input.locations
      })
    },
    "Supabase saved_routes insert"
  );

  return rows[0];
}

function assertSupabaseConfig() {
  if (!hasSupabaseConfig()) {
    throw new HttpError(
      "Supabase is not configured.",
      503,
      "Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
}
