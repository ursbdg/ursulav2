
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zkjgsjyeoukjruioxxhj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpramdzanllb3VranJ1aW94eGhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMjY5ODYsImV4cCI6MjA2NzYwMjk4Nn0.hMkS1iHLqJCdXqsWt8Vwmgj-G6nptQKUPLqcjHTtiik';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

