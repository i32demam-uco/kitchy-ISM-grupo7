import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { TicketScannerScreen } from '../src/screens/TicketScannerScreen';

describe('TicketScannerScreen (Figma Screen 2 Fidelity & OCR flow)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('renders simulated receipt, laser view and detected items', async () => {
    let renderer: any;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <TicketScannerScreen />
        </Provider>
      );
    });

    const root = renderer.root;
    const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
    const normalizedText = texts.join(' ').replace(/\s+/g, ' ');

    // Screen title and modes
    expect(normalizedText).toContain('Escanear ticket');
    expect(normalizedText).toContain('Piso Ciudad Jardín');
    expect(normalizedText).toContain('Cámara');
    expect(normalizedText).toContain('NFC');

    // Receipt header & detected items
    expect(normalizedText).toContain('MERCADONA');
    expect(normalizedText).toContain('4 productos detectados');
    expect(normalizedText).toContain('Tomate frito Hacendado');
    expect(normalizedText).toContain('Huevos L');
    expect(normalizedText).toContain('Pechuga de pollo');
    expect(normalizedText).toContain('Leche entera');

    // Instant save button
    expect(normalizedText).toContain('Guardar 4 productos • 8.00 €');

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });
});
