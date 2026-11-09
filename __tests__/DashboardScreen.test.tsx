import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { DashboardScreen } from '../src/screens/DashboardScreen';

describe('DashboardScreen (Figma Screen 1 Fidelity & Behavior)', () => {
  test('renders multihouse header, urgency carousel and pantry inventory', async () => {
    let renderer: any;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <DashboardScreen />
        </Provider>
      );
    });

    const root = renderer.root;
    const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
    const allText = texts.join(' ');

    // Multihome & greeting
    expect(allText).toContain('kitchy');
    expect(allText).toContain('Tu cocina,');
    expect(allText).toContain('Alejandro');
    expect(allText).toContain('Piso Ciudad Jardín');

    // Urgent carousel
    expect(allText).toContain('Urgente');
    expect(allText).toContain('Pechuga de pollo');
    expect(allText).toContain('Caduca en 24 h');

    // Pantry list
    expect(allText).toContain('Tu Despensa');
    expect(allText).toContain('Tomate frito Hacendado');
    expect(allText).toContain('Huevos L');
    expect(allText).toContain('Leche entera');

    // Bottom Scan Banner
    expect(allText).toContain('¡Escanea tu primer ticket o usa NFC!');
  });
});
