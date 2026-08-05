import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ebfcpkkjtmprryevbopi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZmNwa2tqdG1wcnJ5ZXZib3BpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDI1MTMsImV4cCI6MjEwMDkxODUxM30.3AmMWOSvbo9mWxGjRh_pN5_hrddw-8-3xMU2qlTnIak';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);