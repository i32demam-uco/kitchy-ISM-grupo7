import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InventoryItem, InventoryDelta } from '../types';
import { ImageMatchingService } from '../services/imageMatchingService';

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
    imageUrl: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=200',
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
  selectedPantryItemId: string | null;
  confirmedExpirationItemIds: string[];
}

const initialState: InventoryState = {
  items: initialPantry,
  isLoading: false,
  isOffline: false,
  filterUrgentOnly: false,
  selectedPantryItemId: null,
  confirmedExpirationItemIds: [],
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
      state.items = (action.payload || []).map((item) => ({
        ...item,
        imageUrl:
          item.imageUrl && !item.imageUrl.includes('photo-1546069901-ba9599a7e63c')
            ? item.imageUrl
            : ImageMatchingService.matchProductImage(item.name, item.category).imageUrl,
      }));
    },
    addInventoryItem: (state, action: PayloadAction<InventoryItem>) => {
      const item = { ...action.payload };
      if (!item.id || state.items.some((i) => i.id === item.id)) {
        item.id = `item-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      }
      if (!item.imageUrl || item.imageUrl.includes('photo-1546069901-ba9599a7e63c')) {
        item.imageUrl = ImageMatchingService.matchProductImage(item.name, item.category).imageUrl;
      }
      state.items.unshift(item);
    },
    addMultipleInventoryItems: (state, action: PayloadAction<InventoryItem[]>) => {
      const existingIds = new Set(state.items.map((i) => i.id));
      const formatted = (action.payload || []).map((item, idx) => {
        let finalId = item.id;
        if (!finalId || existingIds.has(finalId)) {
          finalId = `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 8)}`;
        }
        existingIds.add(finalId);

        return {
          ...item,
          id: finalId,
          imageUrl:
            item.imageUrl && !item.imageUrl.includes('photo-1546069901-ba9599a7e63c')
              ? item.imageUrl
              : ImageMatchingService.matchProductImage(item.name, item.category).imageUrl,
        };
      });
      state.items = [...formatted, ...state.items];
    },
    removeInventoryItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    removeMultipleInventoryItems: (state, action: PayloadAction<string[]>) => {
      const idsToDelete = new Set(action.payload);
      state.items = state.items.filter(i => !idsToDelete.has(i.id));
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
        if (action.payload.changes.expirationDate) {
          const expMs = new Date(action.payload.changes.expirationDate).getTime();
          const diffDays = Math.max(0, Math.ceil((expMs - Date.now()) / (24 * 3600 * 1000)));
          item.remainingDays = diffDays;
          if (diffDays <= 1) {
            item.urgencyLevel = 'Red';
          } else if (diffDays <= 2) {
            item.urgencyLevel = 'Amber';
          } else {
            item.urgencyLevel = 'Green';
          }
          item.hasUserSetExpiration = true;
          item.expirationConfirmed = true;
          if (!state.confirmedExpirationItemIds.includes(item.id)) {
            state.confirmedExpirationItemIds.push(item.id);
          }
        }
      }
    },
    confirmItemExpiration: (state, action: PayloadAction<string>) => {
      const item = state.items.find(i => i.id === action.payload);
      if (item) {
        item.hasUserSetExpiration = true;
        item.expirationConfirmed = true;
      }
      if (!state.confirmedExpirationItemIds.includes(action.payload)) {
        state.confirmedExpirationItemIds.push(action.payload);
      }
    },
    setFilterUrgentOnly: (state, action: PayloadAction<boolean>) => {
      state.filterUrgentOnly = action.payload;
    },
    applyInventoryDelta: (state, action: PayloadAction<InventoryDelta>) => {
      const delta = action.payload;
      const index = state.items.findIndex(
        (i) => i.id === delta.itemId || i.name.toLowerCase() === delta.itemName.toLowerCase()
      );

      if (delta.action === 'DELETED') {
        if (index !== -1) state.items.splice(index, 1);
      } else if (delta.action === 'CONSUMED' || delta.action === 'UPDATED') {
        if (index !== -1) {
          if (delta.newQuantity <= 0) {
            state.items.splice(index, 1);
          } else {
            state.items[index].quantity = delta.newQuantity;
          }
        }
      } else if (delta.action === 'ADDED') {
        if (index !== -1) {
          state.items[index].quantity = delta.newQuantity;
        } else {
          state.items.unshift({
            id: delta.itemId,
            houseId: '',
            name: delta.itemName,
            quantity: delta.newQuantity,
            unit: delta.unit || 'ud',
            expirationDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
            location: 'Nevera',
            price: 0,
            purchaseDate: new Date().toISOString(),
            addedByUserId: delta.performedByUserId,
            urgencyLevel: 'Green',
            remainingDays: 7,
            imageUrl: delta.imageUrl,
          });
        }
      }
    },
    consumeProductOptimistic: (
      state,
      action: PayloadAction<{ id: string; quantity: number }>
    ) => {
      const index = state.items.findIndex((i) => i.id === action.payload.id);
      if (index !== -1) {
        const item = state.items[index];
        const newQty = Math.max(0, item.quantity - action.payload.quantity);
        if (newQty <= 0) {
          state.items.splice(index, 1);
        } else {
          item.quantity = newQty;
        }
      }
    },
    setSelectedPantryItemId: (state, action: PayloadAction<string | null>) => {
      state.selectedPantryItemId = action.payload;
    },
  },
});

export const {
  setInventory,
  addInventoryItem,
  addMultipleInventoryItems,
  removeInventoryItem,
  removeMultipleInventoryItems,
  updateInventoryItemQuantity,
  updateInventoryItemDetails,
  setFilterUrgentOnly,
  applyInventoryDelta,
  consumeProductOptimistic,
  setSelectedPantryItemId,
  confirmItemExpiration,
} = inventorySlice.actions;

export default inventorySlice.reducer;

