import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ¡OJO! Reemplaza esto con los tuyos
const supabaseUrl = 'https://dramxjsfpzwbhxkraedn.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_SUch-J5CmxeICQyNYkhQfw_CcAs6Bsh'; // La clave "sb_publishable_..."

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});