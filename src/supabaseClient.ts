import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rldsbulzmgzuencdluie.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZHNidWx6bWd6dWVuY2RsdWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5MDAwNTAsImV4cCI6MjA1NTQ3NjA1MH0.ABSdCCpsHQ3nLgmawF1jw-UgAzQDii5b3pBp1J1px24';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 