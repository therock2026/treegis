import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://zlxchctqraanixyluulv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpseGNoY3RxcmFhbml4eWx1dWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTU0MTIsImV4cCI6MjA4NDQzMTQxMn0.T5_v2EpqHWocFCDcYQYWo5TkEVf-xUQeBURYgA7zX7U";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
