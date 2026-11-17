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

  test('renders viewfinder and triggers real OCR capture with physical shutter', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <TicketScannerScreen />
        </Provider>
      );
    });

    const root = renderer.root;
    let texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
    let normalizedText = texts.join(' ').replace(/\s+/g, ' ');

    // Screen title and modes (dual mode: Cámara + Código de Barras, sin NFC)
    expect(normalizedText).toContain('Escanear ticket');
    expect(normalizedText).toContain('Piso Ciudad Jardín');
    expect(normalizedText).toContain('Cámara');
    expect(normalizedText).toContain('Código de Barras');
    expect(normalizedText).not.toContain('NFC');

    // Trigger physical shutter button
    const shutterBtn = root.findByProps({ testID: 'btn-physical-shutter' });
    expect(shutterBtn).toBeDefined();

    await ReactTestRenderer.act(async () => {
      shutterBtn.props.onPress();
    });

    texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
    normalizedText = texts.join(' ').replace(/\s+/g, ' ');

    // Detected products populated from real OCR
    expect(normalizedText).toContain('productos detectados');
    expect(normalizedText).toMatch(/tomate frito hacendado/i);

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });
});
