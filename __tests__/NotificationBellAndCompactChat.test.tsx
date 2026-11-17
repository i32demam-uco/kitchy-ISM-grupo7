import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../src/store/authSlice';
import inventoryReducer, {
  setSelectedPantryItemId,
  updateInventoryItemDetails,
  confirmItemExpiration,
} from '../src/store/inventorySlice';
import hardwareReducer from '../src/store/hardwareSlice';
import houseSocialReducer, {
  addMessageOptimistic,
} from '../src/store/houseSocialSlice';
import shoppingListReducer from '../src/store/shoppingListSlice';
import recipesReducer from '../src/store/recipesSlice';
import { DashboardScreen } from '../src/screens/DashboardScreen';
import { FullPantryScreen } from '../src/screens/FullPantryScreen';
import { HousesScreen } from '../src/screens/HousesScreen';
import { getProductImageUrl } from '../src/screens/ScannerScreen';
import { categorizeProduct } from '../src/utils/sanitizer';
import { determineCategory } from '../src/utils/inventoryGrouping';

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      inventory: inventoryReducer,
      hardware: hardwareReducer,
      houseSocial: houseSocialReducer,
      shoppingList: shoppingListReducer,
      recipes: recipesReducer,
    },
  });
};

describe('NotificationBellAndCompactChat Suite', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('1. Granular Photo & Category Recognition', () => {
    test('distinguishes sliced bread vs toast vs baguette vs burger bun', () => {
      const slicedUrl = getProductImageUrl('Pan de molde integral Bimbo');
      const toastUrl = getProductImageUrl('Tostadas de trigo');
      const baguetteUrl = getProductImageUrl('Barra de pan rústica');
      const burgerUrl = getProductImageUrl('Pan brioche burger');

      expect(slicedUrl).not.toEqual(toastUrl);
      expect(slicedUrl).not.toEqual(baguetteUrl);
      expect(burgerUrl).not.toEqual(baguetteUrl);
    });

    test('distinguishes drink brands and water', () => {
      const cocaColaUrl = getProductImageUrl('Coca-Cola Zero 33cl');
      const pepsiUrl = getProductImageUrl('Pepsi Max');
      const fantaUrl = getProductImageUrl('Fanta Naranja');
      const waterUrl = getProductImageUrl('Agua fría mineral 1.5L');

      expect(cocaColaUrl).toContain('unsplash');
      expect(cocaColaUrl).not.toEqual(pepsiUrl);
      expect(cocaColaUrl).not.toEqual(fantaUrl);
      expect(cocaColaUrl).not.toEqual(waterUrl);
    });

    test('categorizes cold water and sodas into Bebidas', () => {
      expect(categorizeProduct('Agua fría mineral 1.5L').category).toBe('Bebidas');
      expect(categorizeProduct('Coca-Cola 2L').category).toBe('Bebidas');
      expect(categorizeProduct('Cerveza Mahou 6x25cl').category).toBe('Bebidas');
      expect(categorizeProduct('Zumo de naranja Don Simón').category).toBe('Bebidas');

      const catDetermined = determineCategory({
        name: 'Agua fría con gas',
        location: 'Nevera',
      });
      expect(catDetermined).toBe('Bebidas');
    });
  });

  describe('2. Dashboard Notification Bell & Expiration Alerts', () => {
    test('renders bell icon with total count badge on Dashboard', async () => {
      const store = createTestStore();
      let renderer: any;
      await act(async () => {
        renderer = ReactTestRenderer.create(
          <Provider store={store}>
            <DashboardScreen />
          </Provider>
        );
      });

      const root = renderer.root;
      const bellBtn = root.findByProps({ testID: 'btn-dashboard-notifications' });
      expect(bellBtn).toBeDefined();

      const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
      expect(texts.join(' ')).toContain('kitchy');
    });

    test('opening bell modal displays expiration warnings and allows setting expiration date', async () => {
      const store = createTestStore();
      let renderer: any;
      await act(async () => {
        renderer = ReactTestRenderer.create(
          <Provider store={store}>
            <DashboardScreen />
          </Provider>
        );
      });

      const root = renderer.root;
      const bellBtn = root.findByProps({ testID: 'btn-dashboard-notifications' });

      // Open notification bell modal
      await act(async () => {
        bellBtn.props.onPress();
      });

      const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat().join(' ');
      expect(texts).toContain('Notificaciones');
      expect(texts).toContain('AVISOS DE CADUCIDAD');

      // Find "Poner fecha de caducidad" for chicken
      const chickenId = 'c0000000-0000-0000-0000-000000000001';
      const setDateBtn = root.findByProps({ testID: `btn-notif-set-expiration-${chickenId}` });
      expect(setDateBtn).toBeDefined();

      // Click to set date
      await act(async () => {
        setDateBtn.props.onPress();
      });

      const state = store.getState();
      expect(state.hardware.currentTab).toBe('pantry');
      expect(state.inventory.selectedPantryItemId).toBe(chickenId);
    });

    test('updating product expiration date removes it from notifications immediately', async () => {
      const store = createTestStore();
      const chickenId = 'c0000000-0000-0000-0000-000000000001';

      let dashRenderer: any;
      await act(async () => {
        dashRenderer = ReactTestRenderer.create(
          <Provider store={store}>
            <DashboardScreen />
          </Provider>
        );
      });

      // Open notification modal
      const bellBtn = dashRenderer.root.findByProps({ testID: 'btn-dashboard-notifications' });
      await act(async () => {
        bellBtn.props.onPress();
      });

      let texts = dashRenderer.root.findAllByType('Text').map((t: any) => t.props.children).flat().join(' ');
      expect(texts).toContain('Pechuga de pollo');

      // User sets new expiration date
      const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      await act(async () => {
        store.dispatch(
          updateInventoryItemDetails({
            id: chickenId,
            changes: { expirationDate: nextWeek },
          })
        );
      });

      // Re-render Dashboard
      await act(async () => {
        dashRenderer.update(
          <Provider store={store}>
            <DashboardScreen />
          </Provider>
        );
      });

      // Assert that Pechuga de pollo expiration notification buttons are GONE from the modal
      const chickenSetBtnAfter = dashRenderer.root.findAllByProps({
        testID: `btn-notif-set-expiration-${chickenId}`,
      });
      expect(chickenSetBtnAfter.length).toBe(0);

      const chickenConfirmBtnAfter = dashRenderer.root.findAllByProps({
        testID: `btn-notif-confirm-${chickenId}`,
      });
      expect(chickenConfirmBtnAfter.length).toBe(0);
    });

    test('clicking direct confirm button on expiration notification removes it immediately', async () => {
      const store = createTestStore();
      const chickenId = 'c0000000-0000-0000-0000-000000000001';

      let renderer: any;
      await act(async () => {
        renderer = ReactTestRenderer.create(
          <Provider store={store}>
            <DashboardScreen />
          </Provider>
        );
      });

      // Open notification modal
      const bellBtn = renderer.root.findByProps({ testID: 'btn-dashboard-notifications' });
      await act(async () => {
        bellBtn.props.onPress();
      });

      // Confirm button for chicken
      const confirmBtn = renderer.root.findByProps({ testID: `btn-notif-confirm-${chickenId}` });
      expect(confirmBtn).toBeDefined();

      await act(async () => {
        confirmBtn.props.onPress();
      });

      // Assert state and UI: chicken is marked as confirmed and removed from expiration notifications
      const state = store.getState();
      expect(state.inventory.confirmedExpirationItemIds).toContain(chickenId);

      const chickenSetBtnAfter = renderer.root.findAllByProps({
        testID: `btn-notif-set-expiration-${chickenId}`,
      });
      expect(chickenSetBtnAfter.length).toBe(0);

      const chickenConfirmBtnAfter = renderer.root.findAllByProps({
        testID: `btn-notif-confirm-${chickenId}`,
      });
      expect(chickenConfirmBtnAfter.length).toBe(0);
    });
  });

  describe('3. FullPantryScreen Auto-Opening Item from Notification', () => {
    test('automatically opens ProductDetailSheet for selectedPantryItemId', async () => {
      const chickenId = 'c0000000-0000-0000-0000-000000000001';
      const store = createTestStore();
      store.dispatch(setSelectedPantryItemId(chickenId));

      let renderer: any;
      await act(async () => {
        renderer = ReactTestRenderer.create(
          <Provider store={store}>
            <FullPantryScreen />
          </Provider>
        );
      });

      const root = renderer.root;
      const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat().join(' ');

      // ProductDetailSheet is opened for Pechuga de pollo
      expect(texts).toContain('Pechuga de pollo');
      expect(texts).toContain('Caducidad estimada');
      expect(texts).toContain('CATEGORÍA DEL ALIMENTO');
    });
  });

  describe('4. Compact Multi-House Chat Notifications & Read Status', () => {
    test('groups messages by house into compact notification cards', async () => {
      const store = createTestStore();

      // Add messages from another user to House 2 (Casa Moriles)
      const house2Id = 'a0000000-0000-0000-0000-000000000002';
      store.dispatch(
        addMessageOptimistic({
          id: 'msg-h2-1',
          houseId: house2Id,
          senderId: 'JP',
          senderName: 'José Pablo',
          messageType: 'TEXT',
          content: 'Hola en Moriles!',
          createdAt: new Date().toISOString(),
          status: 'sent',
        })
      );
      store.dispatch(
        addMessageOptimistic({
          id: 'msg-h2-2',
          houseId: house2Id,
          senderId: 'JP',
          senderName: 'José Pablo',
          messageType: 'TEXT',
          content: 'He comprado aceite de oliva',
          createdAt: new Date().toISOString(),
          status: 'sent',
        })
      );

      let renderer: any;
      await act(async () => {
        renderer = ReactTestRenderer.create(
          <Provider store={store}>
            <DashboardScreen />
          </Provider>
        );
      });

      const root = renderer.root;
      const bellBtn = root.findByProps({ testID: 'btn-dashboard-notifications' });

      // Open notification modal
      await act(async () => {
        bellBtn.props.onPress();
      });

      const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat().join(' ');
      expect(texts).toContain('MENSAJES EN TUS HOGARES');
      expect(texts).toContain('Casa Moriles');
      expect(texts).toContain('He comprado aceite de oliva');

      // Click "Ver conversación"
      const chatActionBtn = root.findByProps({ testID: `btn-notif-chat-${house2Id}` });
      await act(async () => {
        chatActionBtn.props.onPress();
      });

      const state = store.getState();
      expect(state.auth.activeHouse.id).toBe(house2Id);
      expect(state.hardware.currentTab).toBe('social');
      expect(state.houseSocial.lastReadTimestamps[house2Id]).toBeDefined();
    });

    test('HousesScreen displays unread badge and clicking Chat marks house as read', async () => {
      const store = createTestStore();
      const house2Id = 'a0000000-0000-0000-0000-000000000002';

      store.dispatch(
        addMessageOptimistic({
          id: 'msg-h2-unread',
          houseId: house2Id,
          senderId: 'JP',
          senderName: 'José Pablo',
          messageType: 'TEXT',
          content: 'Nuevo mensaje no leído',
          createdAt: new Date().toISOString(),
          status: 'sent',
        })
      );

      let renderer: any;
      await act(async () => {
        renderer = ReactTestRenderer.create(
          <Provider store={store}>
            <HousesScreen />
          </Provider>
        );
      });

      const root = renderer.root;
      const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat().join(' ');

      // Badge displays "1 nuevos"
      expect(texts).toContain('1 nuevos');

      // Click chat button
      const chatBtn = root.findByProps({ testID: `btn-chat-house-${house2Id}` });
      await act(async () => {
        chatBtn.props.onPress();
      });

      const state = store.getState();
      expect(state.hardware.currentTab).toBe('social');
      expect(state.houseSocial.lastReadTimestamps[house2Id]).toBeDefined();
    });
  });
});
