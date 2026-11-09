import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { InventoryItem, ShoppingItem } from '../types';

const supabaseUrl = 'https://dramxjsfpzwbhxkraedn.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_SUch-J5CmxeICQyNYkhQfw_CcAs6Bsh';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Real-time Supabase Subscription for Collaborative Pantry (RNF7, CU-04)
export const subscribeToHouseRealtime = (
  houseId: string,
  onInventoryChange: (payload: any) => void,
  onShoppingListChange: (payload: any) => void
) => {
  try {
    const channel = supabase
      .channel(`house-room-${houseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `house_id=eq.${houseId}`,
        },
        (payload) => onInventoryChange(payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_list',
          filter: `house_id=eq.${houseId}`,
        },
        (payload) => onShoppingListChange(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
};
