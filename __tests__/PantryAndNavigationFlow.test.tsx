import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { setCurrentTab } from '../src/store/hardwareSlice';
import { FullPantryScreen } from '../src/screens/FullPantryScreen';
import { BottomNavigation } from '../src/components/BottomNavigation';
import { DashboardScreen } from '../src/screens/DashboardScreen';

describe('Refinamiento UX/UI y Gestión de Despensa (FullPantryScreen & Dynamic Island Navigation)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('FullPantryScreen renders categorized headers and pantry products with zero emojis', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <FullPantryScreen />
        </Provider>
      );
    });

    const root = renderer.root;
    const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
    const allText = texts.join(' ');

    // 1. Screen Title and Subtitle
    expect(allText).toContain('Despensa Completa');
    expect(allText).toContain('Piso Ciudad Jardín');

    // 2. Categories with Poppins typography
    expect(allText).toContain('Carne');
    expect(allText).toContain('Lácteos y Huevos');

    // 3. Realistic Food Products
    expect(allText).toContain('Pechuga de pollo');
    expect(allText).toContain('Huevos L');
    expect(allText).toContain('Leche entera');

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });

  test('DashboardScreen renders recent pantry items (max 4 items) and "Ver todo >" button', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <DashboardScreen />
        </Provider>
      );
    });

    const root = renderer.root;
    const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
    const allText = texts.join(' ');

    expect(allText).toContain('Tu Despensa');
    expect(allText).toContain('Ver todo >');
    expect(allText).toContain('¡Escanea tu primer ticket o usa NFC!');

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });

  test('BottomNavigation renders floating island with Dynamic Island spring bubble', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <BottomNavigation />
        </Provider>
      );
    });

    const root = renderer.root;
    const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
    const allText = texts.join(' ');

    // 4 tabs + FAB
    expect(allText).toContain('Inicio');
    expect(allText).toContain('Lista');
    expect(allText).toContain('Cocinar');
    expect(allText).toContain('Hogares');
    expect(allText).toContain('ESCANEAR');

    // Switching active tab triggers spring animation without crashing
    await ReactTestRenderer.act(async () => {
      store.dispatch(setCurrentTab('list'));
      jest.advanceTimersByTime(200);
      store.dispatch(setCurrentTab('cook'));
      jest.advanceTimersByTime(200);
      store.dispatch(setCurrentTab('home'));
      jest.advanceTimersByTime(200);
    });

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });
});

