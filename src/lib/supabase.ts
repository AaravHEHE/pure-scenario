/**
 * Loads the Supabase client module, and supabase-js with it (~430 KB), on
 * first use instead of at startup. App code gets the client through this and
 * never imports "@/integrations/supabase/client" statically, or the library
 * lands back in the startup bundle (src/test/supabase-lazy.test.ts checks).
 *
 * Resolves to the module rather than the client so the client isn't treated
 * as a thenable: use `const { supabase } = await loadSupabase();`.
 */
export function loadSupabase() {
  return import("@/integrations/supabase/client");
}
