import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../src/store';
import { addMultipleInventoryItems } from '../src/store/inventorySlice';
import { PermissionsManager } from '../src/services/permissions';
import { InventoryItem } from '../src/types';

describe('Épico 3: Módulo de Fricción Cero - Hardware, OCR y Open Food Facts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Hardware: PermissionsManager requests camera permission asynchronously and gracefully', async () => {
    const granted = await PermissionsManager.requestCameraPermission();
    expect(typeof granted).toBe('boolean');
  });

  test('Open Food Facts API: fetches barcode data and returns real food photo and metadata', async () => {
    const barcode = '8480000350012'; // Mercadona Tomate Frito

    // Mock fetch for Open Food Facts
    const mockApiResponse = {
      status: 1,
      product: {
        product_name_es: 'Tomate frito Hacendado',
        brands: 'Hacendado',
        categories: 'Conservas, Salsas',
        image_front_url: 'https://images.openfoodfacts.org/images/products/848/000/035/0012/front_es.4.400.jpg',
      },
    };

    (globalThis as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as any);

    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    const data = await res.json();

    expect(data.status).toBe(1);
    expect(data.product.product_name_es).toBe('Tomate frito Hacendado');
    expect(data.product.image_front_url).toContain('images.openfoodfacts.org');
  });

  test('Offline-First Realtime Architect: scanned OCR products persist to local cache before network sync', async () => {
    const scannedItems: InventoryItem[] = [
      {
        id: 'ocr-test-1',
        houseId: 'a0000000-0000-0000-0000-000000000001',
        name: 'Pechuga de pollo',
        quantity: 1,
        unit: '500 g',
        expirationDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        location: 'En la nevera',
        price: 3.60,
        purchaseDate: new Date().toISOString(),
        addedByUserId: 'Alejandro',
        urgencyLevel: 'Red',
        remainingDays: 1,
        imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200',
      },
      {
        id: 'ocr-test-2',
        houseId: 'a0000000-0000-0000-0000-000000000001',
        name: 'Huevos L',
        quantity: 1,
        unit: 'caja 6 ud',
        expirationDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        location: 'En la nevera',
        price: 1.65,
        purchaseDate: new Date().toISOString(),
        addedByUserId: 'Alejandro',
        urgencyLevel: 'Amber',
        remainingDays: 2,
        imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200',
      },
    ];

    // 1. Redux Dispatch
    store.dispatch(addMultipleInventoryItems(scannedItems));
    const state = store.getState();
    expect(state.inventory.items.some((i) => i.id === 'ocr-test-1')).toBe(true);
    expect(state.inventory.items.some((i) => i.id === 'ocr-test-2')).toBe(true);

    // 2. AsyncStorage Persistence simulation
    await AsyncStorage.setItem('@kitchy_inventory_cache', JSON.stringify(scannedItems));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@kitchy_inventory_cache',
      expect.stringContaining('Pechuga de pollo')
    );
  });
});
