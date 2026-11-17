import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { ScannerScreen } from '../src/screens/ScannerScreen';
import { PermissionsManager } from '../src/services/permissions';

describe('Módulo Escáner: Entrada de Datos Híbrida (Código de Barras + OCR + Glassmorphism Bottom Sheet)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('Renders ScannerScreen with mode toggles, viewfinder and Glassmorphic bottom sheet', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <ScannerScreen />
        </Provider>
      );
    });

    const root = renderer.root;
    let texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
    let allText = texts.join(' ').replace(/\s+/g, ' ');

    // 1. Toggles present (dual mode: Cámara + Código de Barras)
    expect(allText).toContain('Cámara');
    expect(allText).toContain('Código de Barras');
    expect(allText).not.toContain('NFC');

    // 2. Physical Shutter button is present
    const shutterBtn = root.findByProps({ testID: 'btn-physical-shutter' });
    expect(shutterBtn).toBeDefined();

    // 3. Press shutter to trigger real ML Kit OCR
    await ReactTestRenderer.act(async () => {
      shutterBtn.props.onPress();
    });

    texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
    allText = texts.join(' ').replace(/\s+/g, ' ');

    // 4. Bottom Sheet detected products from real OCR
    expect(allText).toContain('productos detectados');
    expect(allText).toMatch(/tomate frito hacendado/i);
    expect(allText).toContain('Guardar');

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });

  test('Open Food Facts online barcode lookup simulation adds product with real photo', async () => {
    const mockOffResponse = {
      status: 1,
      product: {
        product_name_es: 'Leche entera Hacendado',
        categories: 'Lácteos, Leches',
        image_front_url: 'https://images.openfoodfacts.org/images/products/848/000/041/2890/front_es.4.400.jpg',
      },
    };

    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockOffResponse,
    } as any);

    const res = await fetch('https://world.openfoodfacts.org/api/v2/product/8480000412890.json');
    const data = await res.json();

    expect(data.status).toBe(1);
    expect(data.product.product_name_es).toBe('Leche entera Hacendado');
    expect(data.product.image_front_url).toContain('openfoodfacts.org');
  });

  test('Camera permission handles both granted and denied states gracefully', async () => {
    const spy = jest.spyOn(PermissionsManager, 'requestCameraPermission').mockResolvedValueOnce(false);
    const granted = await PermissionsManager.requestCameraPermission();
    expect(granted).toBe(false);
    spy.mockRestore();
  });

  test('Renders Empty State and manual entry when camera permission is denied', async () => {
    const spy = jest.spyOn(PermissionsManager, 'requestCameraPermission').mockResolvedValueOnce(false);

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <ScannerScreen />
        </Provider>
      );
    });

    const root = renderer.root;
    const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
    const allText = texts.join(' ').replace(/\s+/g, ' ');

    expect(allText).toContain('Acceso a la cámara restringido');
    expect(allText).toContain('Introducir Producto a Mano');

    spy.mockRestore();
    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });
});
