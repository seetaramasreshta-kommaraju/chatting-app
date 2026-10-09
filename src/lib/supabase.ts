import { createClient } from '@supabase/supabase-js';

// These should be configured in .env
// We fallback to empty strings to avoid crashing during initial render
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
