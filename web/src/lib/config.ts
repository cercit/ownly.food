// Public browser values only. The anon key is safe in the browser: it can do only what row-level security allows.
// Same values as web/.env.example and app/ownly-api.js.
const env = import.meta.env;

export const SUPABASE_URL: string = env.VITE_SUPABASE_URL ?? 'https://brliajwgrhsnbgxaucsu.supabase.co';
export const SUPABASE_ANON_KEY: string = env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJybGlhandncmhzbmJneGF1Y3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzA5NTAsImV4cCI6MjEwODM0Njk1MH0.LsVUzMeXM7k4OYd2hEhrEhkv1l2q26wko0BAprSW4S8';

export const CONCEPT_TEXT = 'Concept prototype by Sameer Mittimani. Not an official Rapido product.';
export const DEMO_PAYMENT_NOTE = 'Demo payment: no real money moves.';
export const MAX_MEMBERS = 12;
export const CHENNAI_AREAS = ['T. Nagar', 'Adyar', 'Velachery', 'OMR', 'Anna Nagar', 'Nungambakkam', 'Mylapore'] as const;
