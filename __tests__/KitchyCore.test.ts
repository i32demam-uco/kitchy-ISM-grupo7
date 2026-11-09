import { store } from '../src/store';
import {
  addInventoryItem,
  removeInventoryItem,
  setFilterUrgentOnly,
} from '../src/store/inventorySlice';
import {
  addShoppingItem,
  addMultipleShoppingItems,
  toggleCheckItem,
  clearCheckedItems,
} from '../src/store/shoppingListSlice';
import {
  nextStep,
  prevStep,
  toggleTimer,
  decrementTimer,
  resetTimer,
} from '../src/store/recipesSlice';
import {
  setCurrentTab,
  toggleProximity,
  setGeofenceAlertVisible,
} from '../src/store/hardwareSlice';
import { setActiveHouse } from '../src/store/authSlice';

describe('Kitchy Core Logic & Redux Store', () => {
  test('Inventory: adds item and removes item correctly', () => {
    const newItem = {
      id: 'test-inv-1',
      houseId: 'a0000000-0000-0000-0000-000000000001',
      name: 'Yogur natural',
      quantity: 4,
      unit: 'ud',
      expirationDate: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
      location: 'En la nevera',
      price: 1.20,
      purchaseDate: new Date().toISOString(),
      addedByUserId: 'Alejandro',
      urgencyLevel: 'Green' as const,
      remainingDays: 10,
    };

    store.dispatch(addInventoryItem(newItem));
    let state = store.getState();
    expect(state.inventory.items.some((i) => i.id === 'test-inv-1')).toBe(true);

    store.dispatch(removeInventoryItem('test-inv-1'));
    state = store.getState();
    expect(state.inventory.items.some((i) => i.id === 'test-inv-1')).toBe(false);
  });

  test('ShoppingList: adds items, toggles check, and clears checked', () => {
    const item1 = {
      id: 'test-shop-1',
      houseId: 'a0000000-0000-0000-0000-000000000001',
      name: 'Sal marina',
      quantity: 1,
      unit: 'kg',
      isChecked: false,
      source: 'Manual' as const,
      addedByUserId: 'Alejandro',
      createdAt: new Date().toISOString(),
    };

    const item2 = {
      id: 'test-shop-2',
      houseId: 'a0000000-0000-0000-0000-000000000001',
      name: 'Pimienta negra',
      quantity: 1,
      unit: 'bote',
      isChecked: false,
      source: 'RecipeDelta' as const,
      addedByUserId: 'Alejandro',
      createdAt: new Date().toISOString(),
    };

    store.dispatch(addMultipleShoppingItems([item1, item2]));
    let state = store.getState();
    expect(state.shoppingList.items.some((i) => i.id === 'test-shop-1')).toBe(true);
    expect(state.shoppingList.items.some((i) => i.id === 'test-shop-2')).toBe(true);

    // Toggle check
    store.dispatch(toggleCheckItem('test-shop-1'));
    state = store.getState();
    const checked = state.shoppingList.items.find((i) => i.id === 'test-shop-1');
    expect(checked?.isChecked).toBe(true);

    // Clear completed
    store.dispatch(clearCheckedItems());
    state = store.getState();
    expect(state.shoppingList.items.some((i) => i.id === 'test-shop-1')).toBe(false);
    expect(state.shoppingList.items.some((i) => i.id === 'test-shop-2')).toBe(true);
  });

  test('Mode Cocina: advances step and manages timer', () => {
    const initialIndex = store.getState().recipes.currentStepIndex;
    store.dispatch(nextStep());
    let state = store.getState();
    expect(state.recipes.currentStepIndex).toBe(initialIndex + 1);

    store.dispatch(prevStep());
    state = store.getState();
    expect(state.recipes.currentStepIndex).toBe(initialIndex);

    // Timer toggle
    expect(state.recipes.isTimerRunning).toBe(false);
    store.dispatch(toggleTimer());
    state = store.getState();
    expect(state.recipes.isTimerRunning).toBe(true);

    const initialSec = state.recipes.timerSecondsRemaining;
    store.dispatch(decrementTimer());
    state = store.getState();
    expect(state.recipes.timerSecondsRemaining).toBe(initialSec - 1);
  });

  test('Hardware & Multihogar: tab switching and proximity gestures', () => {
    store.dispatch(setCurrentTab('cook'));
    expect(store.getState().hardware.currentTab).toBe('cook');

    const initialProx = store.getState().hardware.isProximityActive;
    store.dispatch(toggleProximity());
    expect(store.getState().hardware.isProximityActive).toBe(!initialProx);

    // Multi-house switch (RF1, RF3)
    store.dispatch(setActiveHouse('a0000000-0000-0000-0000-000000000002'));
    expect(store.getState().auth.activeHouse.id).toBe('a0000000-0000-0000-0000-000000000002');
  });
});

