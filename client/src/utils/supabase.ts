import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Supabase credentials missing. Real-time features will be disabled.');
  // Crée un client factice pour éviter les crashs, avec des méthodes vides.
  supabase = {
    from: () => ({ subscription: null, channel: () => ({ subscribe: () => {} }) }),
    // Ajoutez d'autres méthodes que vous utilisez si nécessaire pour éviter les erreurs
  } as any;
}

export { supabase };
