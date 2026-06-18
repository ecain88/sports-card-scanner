import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ywcdfxscznoopslyncse.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3Y2RmeHNjem5vb3BzbHluY3NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NDMyOTUsImV4cCI6MjA5NjUxOTI5NX0.9S38mdOXRt-qKyYgaPcToCe_NC8FxFJDzyn_ZPFo5A0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetch.bind(globalThis),
  },
});
