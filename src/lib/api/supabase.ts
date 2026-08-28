/**
 * Ported from GridBeat (Flutter) lib/services/supabase_service.dart usage —
 * DriverDetails/ConstructorDetails/CircuitDetails/HomeDetails bio/editorial
 * tables. The anon key is a public, RLS-scoped key by design (same one the
 * Flutter app ships in its compiled bundle) — safe to expose client-side.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
