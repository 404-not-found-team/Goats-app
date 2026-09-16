const SUPABASE_URL = 'https://bvositlxbeqztnhdembx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2b3NpdGx4YmVxenRuaGRlbWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMTY3NzAsImV4cCI6MjEwMjc5Mjc3MH0.41fAH1kEGYYmXSmS0Ny4lkYuXe2N5_pSPX2VVKYzhkQ';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window._supabase = _supabase;