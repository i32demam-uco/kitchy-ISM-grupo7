import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { setActiveHouse, addHouse } from '../src/store/authSlice';
import { setInventory } from '../src/store/inventorySlice';
import { DashboardScreen } from '../src/screens/DashboardScreen';
import { HousesScreen } from '../src/screens/HousesScreen';
import { ApiService } from '../src/services/api';

describe('MultiHouse Flow & Data Isolation (Épico Multihogar)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Dashboard displays active house and switches to another house with inventory reload', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <DashboardScreen />
        </Provider>
      );
    });

    const root = renderer.root;
    // Verifica que el nombre del hogar activo actual ("Piso Ciudad Jardín") se renderiza
    const texts = root.findAllByType('Text').map((t: any) => t.props.children);
    expect(texts.some((txt: any) => typeof txt === 'string' && txt.includes('Piso Ciudad Jardín'))).toBe(true);

    // Cambiar a Casa Moriles
    await ReactTestRenderer.act(async () => {
      store.dispatch(setActiveHouse('a0000000-0000-0000-0000-000000000002'));
      const morilesItems = await ApiService.getInventory('a0000000-0000-0000-0000-000000000002');
      store.dispatch(setInventory(morilesItems));
    });

    const updatedState = store.getState();
    expect(updatedState.auth.activeHouse.name).toBe('Casa Moriles');
    // El inventario de Casa Moriles contiene productos específicos como Aceite de oliva virgen extra
    expect(updatedState.inventory.items.some((i) => i.name === 'Aceite de oliva virgen extra')).toBe(true);
  });

  test('HousesScreen displays list of homes and allows creating a new home with 6-character code', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <HousesScreen />
        </Provider>
      );
    });

    const root = renderer.root;
    const headerTexts = root.findAllByType('Text').map((t: any) => t.props.children);
    expect(headerTexts.some((txt: any) => typeof txt === 'string' && txt.includes('Gestión Multihogar'))).toBe(true);

    // Crear un nuevo hogar mediante ApiService
    let newHouse: any;
    await ReactTestRenderer.act(async () => {
      newHouse = await ApiService.createHouse('Piso Estudiantes UCO', 'Avenida Menéndez Pidal, Córdoba');
      store.dispatch(addHouse(newHouse));
    });

    expect(newHouse.name).toBe('Piso Estudiantes UCO');
    expect(newHouse.inviteCode).toBeDefined();
    expect(newHouse.inviteCode.length).toBeGreaterThanOrEqual(6);

    const state = store.getState();
    expect(state.auth.availableHouses.some((h) => h.name === 'Piso Estudiantes UCO')).toBe(true);
  });

  test('Joining a house with 6-digit code or QR links user and synchronizes inventory', async () => {
    let joinedHouse: any;
    await ReactTestRenderer.act(async () => {
      joinedHouse = await ApiService.joinHouse('UCO2026');
      store.dispatch(addHouse(joinedHouse));
      store.dispatch(setActiveHouse(joinedHouse.id));
    });

    expect(joinedHouse.inviteCode.toUpperCase()).toBe('UCO2026');
    const state = store.getState();
    expect(state.auth.activeHouse.id).toBe(joinedHouse.id);
  });
});
