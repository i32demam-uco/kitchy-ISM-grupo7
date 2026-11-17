import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../src/store/authSlice';
import inventoryReducer from '../src/store/inventorySlice';
import hardwareReducer from '../src/store/hardwareSlice';
import houseSocialReducer from '../src/store/houseSocialSlice';
import shoppingListReducer from '../src/store/shoppingListSlice';
import recipesReducer from '../src/store/recipesSlice';
import { getProductImageUrl } from '../src/screens/ScannerScreen';
import { categorizeProduct } from '../src/utils/sanitizer';
import { formatPantryQuantity } from '../src/utils/quantityFormatter';
import { SwipeablePantryRow } from '../src/components/SwipeablePantryRow';
import { DashboardScreen } from '../src/screens/DashboardScreen';
import { InventoryItem } from '../src/types';

describe('PantryQuantityFormattingAndWaterPhoto Suite', () => {
  describe('1. Verificación Fotográfica de "Agua Fría" y Bebidas', () => {
    test('Agua Fría asigna fotografía válida y no nula / 404', () => {
      const waterUrl1 = getProductImageUrl('Agua Fría', 'Bebidas');
      const waterUrl2 = getProductImageUrl('Agua fria');
      const waterUrl3 = getProductImageUrl('Agua mineral');

      expect(waterUrl1).toBeDefined();
      expect(waterUrl1).toContain('photo-1550505095-81378a674395');
      expect(waterUrl2).toBe(waterUrl1);
      expect(waterUrl3).toBe(waterUrl1);
    });

    test('categorizeProduct asigna categoría Bebidas y unidad 1L a Agua Fría', () => {
      const parsed = categorizeProduct('1 AGUA FRIA 0,40');
      expect(parsed.name).toBe('1 Agua Fria 0,40');
      expect(parsed.category).toBe('Bebidas');
      expect(parsed.unit).toBe('1 l');
    });
  });

  describe('2. Formato de Cantidades en Despensa (formatPantryQuantity)', () => {
    test('Leche: 1L para 1 unidad sola, 2x1L para dos, 6x1L para seis', () => {
      expect(formatPantryQuantity(1, 'l', 'Leche entera')).toBe('1L');
      expect(formatPantryQuantity(1, '1 l', 'Leche semidesnatada')).toBe('1L');
      expect(formatPantryQuantity(2, 'l', 'Leche entera')).toBe('2x1L');
      expect(formatPantryQuantity(6, 'l', 'Leche entera')).toBe('6x1L');
    });

    test('Agua: 1L para una botella, 2x1L para dos botellas, 2x1.5L para 1.5 litros', () => {
      expect(formatPantryQuantity(1, '1l', 'Agua Fría')).toBe('1L');
      expect(formatPantryQuantity(2, '1l', 'Agua Fría')).toBe('2x1L');
      expect(formatPantryQuantity(1, '1.5l', 'Agua Mineral')).toBe('1.5L');
      expect(formatPantryQuantity(2, '1.5l', 'Agua Mineral')).toBe('2x1.5L');
    });

    test('Yogurts y Bífidus: 6 ud. (indica que quedan 6 unidades), 1 ud. para uno solo', () => {
      expect(formatPantryQuantity(6, 'ud', 'Yogur de fresa')).toBe('6 ud.');
      expect(formatPantryQuantity(6, 'unidades', 'Yogur natural')).toBe('6 ud.');
      expect(formatPantryQuantity(4, 'pack', 'Bífidus ciruela')).toBe('4 ud.');
      expect(formatPantryQuantity(1, 'ud', 'Yogur griego')).toBe('1 ud.');
    });

    test('Huevos y Conservas: 6 ud., 12 ud. y 2 ud.', () => {
      expect(formatPantryQuantity(6, 'unidades', 'Huevos L')).toBe('6 ud.');
      expect(formatPantryQuantity(12, 'unidades', 'Huevos camperos')).toBe('12 ud.');
      expect(formatPantryQuantity(2, 'ud.', 'Tomate frito Hacendado')).toBe('2 ud.');
      expect(formatPantryQuantity(1, 'ud.', 'Tomate frito Hacendado')).toBe('1 ud.');
    });

    test('Pesos directos: 500 g de pechuga', () => {
      expect(formatPantryQuantity(500, 'g', 'Pechuga de pollo')).toBe('500 g');
      expect(formatPantryQuantity(250, 'g', 'Queso rallado')).toBe('250 g');
    });
  });

  describe('3. Renderizado en Componentes de la Despensa', () => {
    test('SwipeablePantryRow muestra "2x1L" para leche de 2 unidades', () => {
      const milkItem: InventoryItem = {
        id: 'milk-test-2',
        houseId: 'h1',
        name: 'Leche entera Hacendado',
        quantity: 2,
        unit: 'l',
        expirationDate: new Date().toISOString(),
        location: 'En la nevera',
        price: 2.10,
        purchaseDate: new Date().toISOString(),
        addedByUserId: 'Alejandro',
        urgencyLevel: 'Green',
        remainingDays: 7,
      };

      let renderer: any;
      act(() => {
        renderer = ReactTestRenderer.create(
          <SwipeablePantryRow
            item={milkItem}
            isLast={false}
            onPress={() => {}}
            onQuickConsume={() => {}}
          />
        );
      });

      const texts = renderer.root.findAllByType('Text').map((t: any) => t.props.children).flat().join(' ');
      expect(texts).toContain('2x1L');
    });

    test('SwipeablePantryRow muestra "6 ud." para pack de yogurts', () => {
      const yogurtItem: InventoryItem = {
        id: 'yogurt-test-6',
        houseId: 'h1',
        name: 'Yogur sabores 16',
        quantity: 6,
        unit: 'ud',
        expirationDate: new Date().toISOString(),
        location: 'En la nevera',
        price: 2.70,
        purchaseDate: new Date().toISOString(),
        addedByUserId: 'Alejandro',
        urgencyLevel: 'Green',
        remainingDays: 14,
      };

      let renderer: any;
      act(() => {
        renderer = ReactTestRenderer.create(
          <SwipeablePantryRow
            item={yogurtItem}
            isLast={false}
            onPress={() => {}}
            onQuickConsume={() => {}}
          />
        );
      });

      const texts = renderer.root.findAllByType('Text').map((t: any) => t.props.children).flat().join(' ');
      expect(texts).toContain('6 ud.');
    });

    test('DashboardScreen muestra "1L" para leche entera de 1 unidad', async () => {
      const store = configureStore({
        reducer: {
          auth: authReducer,
          inventory: inventoryReducer,
          hardware: hardwareReducer,
          houseSocial: houseSocialReducer,
          shoppingList: shoppingListReducer,
          recipes: recipesReducer,
        },
      });

      let renderer: any;
      await act(async () => {
        renderer = ReactTestRenderer.create(
          <Provider store={store}>
            <DashboardScreen />
          </Provider>
        );
      });

      const texts = renderer.root.findAllByType('Text').map((t: any) => t.props.children).flat().join(' ');
      // Leche entera in initial pantry is quantity: 1, unit: 'l' -> renders "1L"
      expect(texts).toContain('1L');
    });
  });
});

