import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InventoryItem } from '../types';

const STORAGE_KEY = '@kitchy_inventory_cache';

const initialPantry: InventoryItem[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    houseId: 'a0000000-0000-0000-0000-000000000001',
    masterProductId: 'b0000000-0000-0000-0000-000000000001',
    name: 'Pechuga de pollo',
    quantity: 500,
    unit: 'g',
    expirationDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    location: 'En la nevera',
    price: 3.60,
    purchaseDate: new Date().toISOString(),
    addedByUserId: 'JP',
    urgencyLevel: 'Red',
    remainingDays: 1,
    imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    houseId: 'a0000000-0000-0000-0000-000000000001',
    masterProductId: 'b0000000-0000-0000-0000-000000000002',
    name: 'Huevos L',
    quantity: 6,
    unit: 'unidades',
    expirationDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    location: 'En la nevera',
    price: 1.65,
    purchaseDate: new Date().toISOString(),
    addedByUserId: 'David',
    urgencyLevel: 'Amber',
    remainingDays: 2,
    imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    houseId: 'a0000000-0000-0000-0000-000000000001',
    masterProductId: 'b0000000-0000-0000-0000-000000000003',
    name: 'Tomate frito Hacendado',
    quantity: 2,
    unit: 'ud.',
    expirationDate: new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString(),
    location: 'Despensa',
    price: 1.70,
    purchaseDate: new Date().toISOString(),
    addedByUserId: 'JP',
    urgencyLevel: 'Green',
    remainingDays: 28,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    houseId: 'a0000000-0000-0000-0000-000000000001',
    masterProductId: 'b0000000-0000-0000-0000-000000000004',
    name: 'Leche entera',
    quantity: 1,
    unit: 'l',
    expirationDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    location: 'En la nevera',
    price: 1.05,
    purchaseDate: new Date().toISOString(),
    addedByUserId: 'David',
    urgencyLevel: 'Green',
    remainingDays: 7,
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200',
  },
];

interface InventoryState {
  items: InventoryItem[];
  isLoading: boolean;
  isOffline: boolean;
  filterUrgentOnly: boolean;
}

const initialState: InventoryState = {
  items: initialPantry,
  isLoading: false,
  isOffline: false,
  filterUrgentOnly: false,
};

// Async thunk to save cache
export const persistInventoryLocal = createAsyncThunk(
  'inventory/persistLocal',
  async (items: InventoryItem[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }
);

export const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setInventory: (state, action: PayloadAction<InventoryItem[]>) => {
      state.items = action.payload;
    },
    addInventoryItem: (state, action: PayloadAction<InventoryItem>) => {
      state.items.unshift(action.payload);
    },
    addMultipleInventoryItems: (state, action: PayloadAction<InventoryItem[]>) => {
      state.items = [...action.payload, ...state.items];
    },
    removeInventoryItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    updateInventoryItemQuantity: (
      state,
      action: PayloadAction<{ id: string; delta?: number; quantity?: number }>
    ) => {
      const item = state.items.find(i => i.id === action.payload.id);
      if (item) {
        if (action.payload.quantity !== undefined) {
          item.quantity = Math.max(0, action.payload.quantity);
        } else if (action.payload.delta !== undefined) {
          item.quantity = Math.max(0, item.quantity + action.payload.delta);
        }
      }
    },
    updateInventoryItemDetails: (
      state,
      action: PayloadAction<{ id: string; changes: Partial<InventoryItem> }>
    ) => {
      const item = state.items.find(i => i.id === action.payload.id);
      if (item) {
        Object.assign(item, action.payload.changes);
      }
    },
    setFilterUrgentOnly: (state, action: PayloadAction<boolean>) => {
      state.filterUrgentOnly = action.payload;
    },
  },
});

export const {
  setInventory,
  addInventoryItem,
  addMultipleInventoryItems,
  removeInventoryItem,
  updateInventoryItemQuantity,
  updateInventoryItemDetails,
  setFilterUrgentOnly,
} = inventorySlice.actions;

export default inventorySlice.reducer;

