import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../src/store/authSlice';
import inventoryReducer, { setInventory } from '../src/store/inventorySlice';
import hardwareReducer, { setPagerScrollEnabled } from '../src/store/hardwareSlice';
import houseSocialReducer from '../src/store/houseSocialSlice';
import shoppingListReducer from '../src/store/shoppingListSlice';
import recipesReducer from '../src/store/recipesSlice';
import { DashboardScreen } from '../src/screens/DashboardScreen';
import { InventoryItem } from '../src/types';

const createStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      inventory: inventoryReducer,
      hardware: hardwareReducer,
      houseSocial: houseSocialReducer,
      shoppingList: shoppingListReducer,
      recipes: recipesReducer,
    },
  });

describe('Notification Scrolling & Touch Responder Optimization Suite', () => {
  const mockItems: InventoryItem[] = [
    {
      id: 'item-urgent-1',
      name: 'Pechuga de pollo',
      quantity: 500,
      unit: 'g',
      category: 'Carnes',
      location: 'Nevera',
      urgencyLevel: 'Red',
      expirationDate: '2026-11-14',
      houseId: 'house-1',
      price: 3.5,
      purchaseDate: '2026-11-10',
      addedByUserId: 'user-1',
      remainingDays: 1,
    },
    {
      id: 'item-urgent-2',
      name: 'Yogur natural',
      quantity: 4,
      unit: 'ud.',
      category: 'Lácteos y Huevos',
      location: 'Nevera',
      urgencyLevel: 'Amber',
      expirationDate: '2026-11-15',
      houseId: 'house-1',
      price: 1.8,
      purchaseDate: '2026-11-10',
      addedByUserId: 'user-1',
      remainingDays: 2,
    },
  ];

  test('Urgent carousel has smooth horizontal scroll configuration without touch clipping', async () => {
    const store = createStore();
    store.dispatch(setInventory(mockItems));

    let renderer: any;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <DashboardScreen />
        </Provider>
      );
    });

    const urgentScroll = renderer.root.findByProps({ testID: 'urgent-scroll-view' });
    expect(urgentScroll).toBeDefined();
    expect(urgentScroll.props.horizontal).toBe(true);
    expect(urgentScroll.props.nestedScrollEnabled).toBe(true);
    expect(urgentScroll.props.directionalLockEnabled).toBe(true);
    expect(urgentScroll.props.decelerationRate).toBe('fast');
    expect(urgentScroll.props.scrollEventThrottle).toBe(16);

    // Padding must be on contentContainerStyle, not on style, to avoid touch deadzones on Android
    expect(urgentScroll.props.contentContainerStyle.paddingHorizontal).toBe(20);

    // Verify touch responder capture immediately releases parent pager
    act(() => {
      urgentScroll.props.onStartShouldSetResponderCapture();
    });
    expect(store.getState().hardware.isPagerScrollEnabled).toBe(false);

    // Verify onTouchEnd restores pager scroll
    act(() => {
      urgentScroll.props.onTouchEnd();
    });
    expect(store.getState().hardware.isPagerScrollEnabled).toBe(true);
  });

  test('Notifications Modal uses non-blocking responder hierarchy with independent backdrop and smooth scroll', async () => {
    const store = createStore();
    store.dispatch(setInventory(mockItems));

    let renderer: any;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <DashboardScreen />
        </Provider>
      );
    });

    // Open notifications modal
    const bellBtn = renderer.root.findByProps({ testID: 'btn-dashboard-notifications' });
    await act(async () => {
      bellBtn.props.onPress();
    });

    // Check independent backdrop
    const backdrop = renderer.root.findByProps({ testID: 'backdrop-notifications-modal' });
    expect(backdrop).toBeDefined();

    // Verify the inner scroll view has fluid scrolling props
    const notifScroll = renderer.root.findByProps({ testID: 'notifications-modal-scroll' });
    expect(notifScroll).toBeDefined();
    expect(notifScroll.props.nestedScrollEnabled).toBe(true);
    expect(notifScroll.props.showsVerticalScrollIndicator).toBe(true);
    expect(notifScroll.props.keyboardShouldPersistTaps).toBe('handled');
    expect(notifScroll.props.bounces).toBe(true);
    expect(notifScroll.props.overScrollMode).toBe('always');
    expect(notifScroll.props.scrollEventThrottle).toBe(16);

    // Verify clicking close button works smoothly
    const closeBtn = renderer.root.findByProps({ testID: 'btn-close-notifications-modal' });
    await act(async () => {
      closeBtn.props.onPress();
    });
  });
});
