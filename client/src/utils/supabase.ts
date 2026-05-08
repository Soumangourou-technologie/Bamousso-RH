import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Supabase credentials missing. Real-time features will be disabled.');
  // Crée un client factice complet pour éviter les crashs.
  // Il simule la chaîne d'appels `supabase.channel(...).on(...).subscribe()`.
  const dummyChannel = {
    on: () => dummyChannel,
    subscribe: () => {},
  };
  supabase = {
    channel: () => dummyChannel,
    from: () => (({} as any)), // Simule `from` pour d'autres usages potentiels
    storage: { from: () => ({ upload: () => {}, getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    removeChannel: () => {},
  } as any;
}

export { supabase };
