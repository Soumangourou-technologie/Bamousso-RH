import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Crée et exporte directement le client. S'il manque des clés, 
// createClient lèvera une erreur claire au lieu de retourner null silencieusement.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
