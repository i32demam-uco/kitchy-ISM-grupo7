import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ShoppingItem } from '../types';

interface ShoppingListState {
  items: ShoppingItem[];
  isLoading: boolean;
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
};

export const shoppingListSlice = createSlice({
  name: 'shoppingList',
  initialState,
  reducers: {
    setShoppingList: (state, action: PayloadAction<ShoppingItem[]>) => {
      state.items = action.payload;
    },
    addShoppingItem: (state, action: PayloadAction<ShoppingItem>) => {
      state.items.unshift(action.payload);
    },
    addMultipleShoppingItems: (state, action: PayloadAction<ShoppingItem[]>) => {
      state.items = [...action.payload, ...state.items];
    },
    toggleCheckItem: (state, action: PayloadAction<string>) => {
      const item = state.items.find(i => i.id === action.payload);
      if (item) {
        item.isChecked = !item.isChecked;
      }
    },
    removeShoppingItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    clearCheckedItems: (state) => {
      state.items = state.items.filter(i => !i.isChecked);
    },
  },
});

export const {
  setShoppingList,
  addShoppingItem,
  addMultipleShoppingItems,
  toggleCheckItem,
  removeShoppingItem,
  clearCheckedItems,
} = shoppingListSlice.actions;

export default shoppingListSlice.reducer;

