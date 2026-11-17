import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ShoppingItem } from '../types';

export interface ShoppingListState {
  items: ShoppingItem[];
  isLoading: boolean;
  isUrgent: boolean;
  urgentModeSource: 'NONE' | 'MANUAL' | 'AUTO_LOW_STOCK';
  urgentUpdatedAt: string | null;
}

// Regex para eliminar cantidades y unidades de medida (1 L, 500 g, 2x, etc.)
const UNIT_REGEX = /\b(\d+([.,]\d+)?)\s*(l|ml|g|kg|ud|unidades|latas|paquete|pack|brik)\b/gi;

// Regex para marcas blancas comunes
const BRAND_REGEX = /\b(hacendado|mercadona|carrefour|dia|lidl|eroski|alcampo|aldi|nestle|pascual|danone)\b/gi;

// Palabras conectoras / secundarias a filtrar
const STOP_WORDS = new Set([
  'de', 'con', 'en', 'y', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'entera', 'desnatada', 'semidesnatada', 'fresco', 'fresca', 'frescos', 'frescas',
  'para', 'del', 'al'
]);

export function normalizeTextForComparison(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(UNIT_REGEX, ' ')
    .replace(BRAND_REGEX, ' ')
    .replace(/[\d+.,\-_/\\()&%$#@!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractSignificantTokens(normalized: string): string[] {
  if (!normalized) return [];
  return normalized
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

export function isFuzzyMatch(ticketText: string, shoppingItemText: string): boolean {
  const normTicket = normalizeTextForComparison(ticketText);
  const normItem = normalizeTextForComparison(shoppingItemText);

  if (!normTicket || !normItem) return false;

  // Coincidencia exacta o inclusión directa
  if (normTicket === normItem || normTicket.includes(normItem) || normItem.includes(normTicket)) {
    return true;
  }

  const tokensTicket = extractSignificantTokens(normTicket);
  const tokensItem = extractSignificantTokens(normItem);

  return tokensTicket.some((t) => tokensItem.includes(t));
}

const initialItems: ShoppingItem[] = [
  {
    id: 's-001',
    houseId: 'a0000000-0000-0000-0000-000000000001',
    name: 'Aceite de oliva virgen extra',
    quantity: 1,
    unit: 'l',
    isChecked: false,
    source: 'Manual',
    addedByUserId: 'Alejandro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 's-002',
    houseId: 'a0000000-0000-0000-0000-000000000001',
    name: 'Pan rústico',
    quantity: 1,
    unit: 'barra',
    isChecked: true,
    source: 'Voice',
    addedByUserId: 'JP',
    createdAt: new Date().toISOString(),
  },
];

const initialState: ShoppingListState = {
  items: initialItems,
  isLoading: false,
  isUrgent: false,
  urgentModeSource: 'NONE',
  urgentUpdatedAt: null,
};

export const shoppingListSlice = createSlice({
  name: 'shoppingList',
  initialState,
  reducers: {
    setShoppingList: (state, action: PayloadAction<ShoppingItem[]>) => {
      state.items = action.payload;
      const pendingCount = action.payload.filter((i) => !i.isChecked).length;
      if (state.urgentModeSource !== 'MANUAL') {
        if (pendingCount >= 5) {
          state.isUrgent = true;
          state.urgentModeSource = 'AUTO_LOW_STOCK';
          state.urgentUpdatedAt = new Date().toISOString();
        } else if (state.urgentModeSource === 'AUTO_LOW_STOCK') {
          state.isUrgent = false;
          state.urgentModeSource = 'NONE';
          state.urgentUpdatedAt = new Date().toISOString();
        }
      }
    },
    setUrgencyStatus: (
      state,
      action: PayloadAction<{
        isUrgent: boolean;
        urgentModeSource?: 'NONE' | 'MANUAL' | 'AUTO_LOW_STOCK';
        urgentUpdatedAt?: string | null;
      }>
    ) => {
      state.isUrgent = action.payload.isUrgent;
      state.urgentModeSource =
        action.payload.urgentModeSource ?? (action.payload.isUrgent ? 'MANUAL' : 'NONE');
      state.urgentUpdatedAt = action.payload.urgentUpdatedAt ?? new Date().toISOString();
    },
    toggleUrgencyManual: (state) => {
      const nextUrgent = !state.isUrgent;
      state.isUrgent = nextUrgent;
      state.urgentModeSource = nextUrgent ? 'MANUAL' : 'NONE';
      state.urgentUpdatedAt = new Date().toISOString();
    },
    addShoppingItem: (state, action: PayloadAction<ShoppingItem>) => {
      state.items.unshift(action.payload);
      const pendingCount = state.items.filter((i) => !i.isChecked).length;
      if (pendingCount >= 5 && !state.isUrgent) {
        state.isUrgent = true;
        state.urgentModeSource = 'AUTO_LOW_STOCK';
        state.urgentUpdatedAt = new Date().toISOString();
      }
    },
    addMultipleShoppingItems: (state, action: PayloadAction<ShoppingItem[]>) => {
      state.items = [...action.payload, ...state.items];
      const pendingCount = state.items.filter((i) => !i.isChecked).length;
      if (pendingCount >= 5 && !state.isUrgent) {
        state.isUrgent = true;
        state.urgentModeSource = 'AUTO_LOW_STOCK';
        state.urgentUpdatedAt = new Date().toISOString();
      }
    },
    toggleCheckItem: (state, action: PayloadAction<string>) => {
      const item = state.items.find((i) => i.id === action.payload);
      if (item) {
        item.isChecked = !item.isChecked;
      }
      const pendingCount = state.items.filter((i) => !i.isChecked).length;
      if (pendingCount < 5 && state.urgentModeSource === 'AUTO_LOW_STOCK') {
        state.isUrgent = false;
        state.urgentModeSource = 'NONE';
        state.urgentUpdatedAt = new Date().toISOString();
      }
    },
    removeShoppingItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.id !== action.payload);
      const pendingCount = state.items.filter((i) => !i.isChecked).length;
      if (pendingCount < 5 && state.urgentModeSource === 'AUTO_LOW_STOCK') {
        state.isUrgent = false;
        state.urgentModeSource = 'NONE';
        state.urgentUpdatedAt = new Date().toISOString();
      }
    },
    clearCheckedItems: (state) => {
      state.items = state.items.filter((i) => !i.isChecked);
      const pendingCount = state.items.length;
      if (pendingCount < 5 && state.urgentModeSource === 'AUTO_LOW_STOCK') {
        state.isUrgent = false;
        state.urgentModeSource = 'NONE';
        state.urgentUpdatedAt = new Date().toISOString();
      }
    },
    reconcileScannedProducts: (state, action: PayloadAction<{ name: string }[]>) => {
      const scanned = action.payload;
      const reconciledIds: string[] = [];

      for (const p of scanned) {
        const match = state.items.find(
          (i) => !i.isChecked && !reconciledIds.includes(i.id) && isFuzzyMatch(p.name, i.name)
        );
        if (match) {
          reconciledIds.push(match.id);
        }
      }

      // Eliminar de la lista de la compra los productos coincidentes
      state.items = state.items.filter((i) => !reconciledIds.includes(i.id));

      const remainingPending = state.items.filter((i) => !i.isChecked).length;
      if (remainingPending === 0 || (remainingPending < 5 && state.urgentModeSource === 'AUTO_LOW_STOCK')) {
        state.isUrgent = false;
        state.urgentModeSource = 'NONE';
        state.urgentUpdatedAt = new Date().toISOString();
      }
    },
  },
});

export const {
  setShoppingList,
  setUrgencyStatus,
  toggleUrgencyManual,
  addShoppingItem,
  addMultipleShoppingItems,
  toggleCheckItem,
  removeShoppingItem,
  clearCheckedItems,
  reconcileScannedProducts,
} = shoppingListSlice.actions;

export default shoppingListSlice.reducer;
