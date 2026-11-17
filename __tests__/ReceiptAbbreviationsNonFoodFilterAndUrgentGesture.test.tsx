import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import hardwareReducer, { setPagerScrollEnabled } from '../src/store/hardwareSlice';
import inventoryReducer, { setInventory } from '../src/store/inventorySlice';
import authReducer from '../src/store/authSlice';
import shoppingListReducer from '../src/store/shoppingListSlice';
import recipesReducer from '../src/store/recipesSlice';
import houseSocialReducer from '../src/store/houseSocialSlice';
import { DashboardScreen } from '../src/screens/DashboardScreen';
import {
  expandReceiptAbbreviations,
  isFoodProduct,
  parseReceiptLine,
  categorizeProduct,
} from '../src/utils/sanitizer';
import { parseOcrBlocksToProducts, getProductImageUrl } from '../src/screens/ScannerScreen';
import { ImageMatchingService } from '../src/services/imageMatchingService';
import { InventoryItem } from '../src/types';

describe('Receipt Abbreviations, Non-Food Filtering & Urgent Scroll Gesture Suite', () => {
  describe('1. Verificación Visual de "Agua Frío" (Fotografía Real de Botella de Agua)', () => {
    test('Agua Frío y Agua Fría devuelven la fotografía fotorrealista de botella de agua fresca (no caja de regalo)', () => {
      const matchAguaFrio = ImageMatchingService.matchProductImage('Agua Frío', 'Bebidas');
      const matchAguaFria = ImageMatchingService.matchProductImage('Agua fría', 'Bebidas');
      const getImageUrlAgua = getProductImageUrl('Agua Frío', 'Bebidas');

      // Comprobar que no es el ID de la caja de regalo (photo-1549465220-1a8b9238cd48)
      expect(matchAguaFrio.imageUrl).not.toContain('photo-1549465220-1a8b9238cd48');
      expect(matchAguaFria.imageUrl).not.toContain('photo-1549465220-1a8b9238cd48');
      expect(getImageUrlAgua).not.toContain('photo-1549465220-1a8b9238cd48');

      // Debe asignar la imagen fotorrealista de botella de agua fría con gotas de condensación (photo-1550505095-81378a674395)
      expect(matchAguaFrio.imageUrl).toContain('photo-1550505095-81378a674395');
      expect(matchAguaFria.imageUrl).toContain('photo-1550505095-81378a674395');
      expect(getImageUrlAgua).toContain('photo-1550505095-81378a674395');
    });
  });

  describe('2. Reconocimiento de Recortamientos y Abreviaturas de Supermercado (OCR)', () => {
    test('CC Zero Zero se expande a Coca-Cola Zero Zero y se clasifica como Bebidas', () => {
      const expanded = expandReceiptAbbreviations('CC Zero Zero');
      expect(expanded).toBe('Coca-Cola Zero Zero');

      const categorized = categorizeProduct('CC Zero Zero');
      expect(categorized.name).toBe('Coca-Cola Zero Zero');
      expect(categorized.category).toBe('Bebidas');
      expect(categorized.unit).toBe('330 ml');

      const img = getProductImageUrl('Coca-Cola Zero Zero', 'Bebidas');
      expect(img).toContain('photo-1622483767028');
    });

    test('CC Zero y CC Normal se expanden correctamente', () => {
      expect(expandReceiptAbbreviations('CC Zero')).toBe('Coca-Cola Zero');
      expect(expandReceiptAbbreviations('CC Normal')).toBe('Coca-Cola Original');
      expect(expandReceiptAbbreviations('1x CC ZERO 1,20')).toBe('1x Coca-Cola Zero 1,20');
    });

    test('Expande múltiples abreviaturas habituales de tickets españoles', () => {
      // Lácteos y huevos
      expect(expandReceiptAbbreviations('12 HVOS L')).toBe('12 Huevos L');
      expect(expandReceiptAbbreviations('Q. CURADO OVEJA')).toBe('Queso curado OVEJA');
      expect(expandReceiptAbbreviations('LECHE ENT')).toBe('Leche entera');
      expect(expandReceiptAbbreviations('LECHE SEMI')).toBe('Leche semidesnatada');

      // Carnes
      expect(expandReceiptAbbreviations('PECH. POLLO')).toBe('Pechuga de pollo');
      expect(expandReceiptAbbreviations('PECH. PAVO')).toBe('Pechuga de pavo');
      expect(expandReceiptAbbreviations('TAQ. JAMON')).toBe('Taquitos de jamón');

      // Frutas y despensa
      expect(expandReceiptAbbreviations('TOM. FRITO HACENDADO')).toBe('Tomate frito HACENDADO');
      expect(expandReceiptAbbreviations('PLAT. CANARIAS')).toBe('Plátano de Canarias');
      expect(expandReceiptAbbreviations('AC. OLIVA VIRGEN')).toBe('Aceite de oliva VIRGEN');
      expect(expandReceiptAbbreviations('AOVE')).toBe('Aceite de oliva virgen extra');
    });

    test('parseReceiptLine procesa líneas con recortamientos expandidos correctamente', () => {
      const parsedCC = parseReceiptLine('2 CC ZERO ZERO 1,10 2,20');
      expect(parsedCC).not.toBeNull();
      expect(parsedCC!.name).toBe('Coca-Cola Zero Zero');
      expect(parsedCC!.category).toBe('Bebidas');
      expect(parsedCC!.quantity).toBe(2);

      const parsedHuevos = parseReceiptLine('1 HVOS L 1,80');
      expect(parsedHuevos).not.toBeNull();
      expect(parsedHuevos!.name).toContain('Huevos');
      expect(parsedHuevos!.category).toBe('Lácteos y Huevos');
    });
  });

  describe('3. Filtro Estricto de Artículos No Alimentarios (isFoodProduct)', () => {
    test('Rechaza bolsas de compra (plástico, rafia, papel, 0.15€)', () => {
      expect(isFoodProduct('BOLSA PLASTICO')).toBe(false);
      expect(isFoodProduct('BOLSA RAFIA')).toBe(false);
      expect(isFoodProduct('BOLSA 0,15')).toBe(false);
      expect(isFoodProduct('BOLSA COMPRA REUTILIZABLE')).toBe(false);
      expect(isFoodProduct('BOLSA')).toBe(false);
    });

    test('Permite alimentos que vienen en bolsa (patatas, ensalada, etc.)', () => {
      expect(isFoodProduct('Bolsa de patatas')).toBe(true);
      expect(isFoodProduct('Ensalada 4 estaciones bolsa')).toBe(true);
      expect(isFoodProduct('Bolsa de zanahorias')).toBe(true);
    });

    test('Rechaza artículos de limpieza, higiene, bazar y droguería', () => {
      expect(isFoodProduct('Detergente lavadora')).toBe(false);
      expect(isFoodProduct('Lejía con detergente')).toBe(false);
      expect(isFoodProduct('Suavizante azul')).toBe(false);
      expect(isFoodProduct('Lavavajillas concentrado')).toBe(false);
      expect(isFoodProduct('Papel higiénico 12 rollos')).toBe(false);
      expect(isFoodProduct('Champú anticaspa')).toBe(false);
      expect(isFoodProduct('Gel ducha hidratante')).toBe(false);
      expect(isFoodProduct('Servilletas 100 unidades')).toBe(false);
      expect(isFoodProduct('Pilas alcalinas AAA')).toBe(false);
      expect(isFoodProduct('Fregasuelos pino')).toBe(false);
    });

    test('parseReceiptLine devuelve null para artículos que no son comida', () => {
      expect(parseReceiptLine('1 BOLSA PLASTICO 0,15')).toBeNull();
      expect(parseReceiptLine('1 LEJIA LAVADORA 1,20')).toBeNull();
      expect(parseReceiptLine('1 PAPEL HIGIENICO 3,45')).toBeNull();
      expect(parseReceiptLine('1 DETERGENTE GEL 7,90')).toBeNull();
      expect(parseReceiptLine('1 SERVILLETAS BLANCAS 0,85')).toBeNull();
    });

    test('parseOcrBlocksToProducts ignora artículos no comestibles en un ticket completo de supermercado', () => {
      const ticketOcr = {
        text: [
          'MERCADONA, S.A.',
          '1 LECHE ENTERA 1,05',
          '2 CC ZERO ZERO 1,10 2,20',
          '1 BOLSA PLASTICO 0,15',
          '1 LEJIA PERFUMADA 1,20',
          '1 PAPEL HIGIENICO 3,50',
          '1 PECH. POLLO CORTE FINO 3,45',
          '1 SERVILLETAS 0,90',
          '1 AGUA FRIA 0,60',
          'TOTAL (€) 14,05',
        ].join('\n'),
      };

      const { products } = parseOcrBlocksToProducts(ticketOcr as any);

      // Solo deben incluirse los alimentos: Leche, CC Zero Zero, Pechuga de pollo y Agua fría (4 alimentos)
      expect(products.length).toBe(4);

      const productNames = products.map((p) => p.name);
      expect(productNames).toContain('Leche Entera');
      expect(productNames).toContain('Coca-Cola Zero Zero');
      expect(productNames).toContain('Pechuga De Pollo Corte Fino');
      expect(productNames.some((n) => n.includes('Agua'))).toBe(true);

      // Ningún no-alimento debe estar en la lista para la despensa
      expect(productNames.some((n) => n.toLowerCase().includes('bolsa'))).toBe(false);
      expect(productNames.some((n) => n.toLowerCase().includes('lejia'))).toBe(false);
      expect(productNames.some((n) => n.toLowerCase().includes('higienico'))).toBe(false);
      expect(productNames.some((n) => n.toLowerCase().includes('servilleta'))).toBe(false);
    });
  });

  describe('4. Resolución del Conflicto de Gestos en Carrusel "Urgente" vs Navegación de Pestañas', () => {
    test('hardwareSlice gestiona el estado isPagerScrollEnabled correctamente', () => {
      const store = configureStore({
        reducer: { hardware: hardwareReducer },
      });

      expect(store.getState().hardware.isPagerScrollEnabled).toBe(true);

      // Cuando se empieza a tocar o arrastrar el carrusel urgente, se deshabilita el pager
      store.dispatch(setPagerScrollEnabled(false));
      expect(store.getState().hardware.isPagerScrollEnabled).toBe(false);

      // Cuando se suelta el carrusel urgente, se re-habilita el pager
      store.dispatch(setPagerScrollEnabled(true));
      expect(store.getState().hardware.isPagerScrollEnabled).toBe(true);
    });

    test('DashboardScreen renderiza el carrusel Urgente con gestos de bloqueo de pager', () => {
      const urgentMockItems: InventoryItem[] = [
        {
          id: '1',
          name: 'Leche entera',
          quantity: 2,
          unit: '1L',
          category: 'Lácteos y Huevos',
          location: 'nevera',
          urgencyLevel: 'Red',
          expirationDate: '2026-11-13',
          houseId: 'house-1',
          price: 1.05,
          purchaseDate: '2026-11-10',
          addedByUserId: 'user-1',
          remainingDays: 1,
        },
        {
          id: '2',
          name: 'Queso fresco',
          quantity: 1,
          unit: '1 ud.',
          category: 'Lácteos y Huevos',
          location: 'nevera',
          urgencyLevel: 'Amber',
          expirationDate: '2026-11-14',
          houseId: 'house-1',
          price: 2.1,
          purchaseDate: '2026-11-10',
          addedByUserId: 'user-1',
          remainingDays: 2,
        },
      ];

      const store = configureStore({
        reducer: {
          auth: authReducer,
          inventory: inventoryReducer,
          hardware: hardwareReducer,
          shoppingList: shoppingListReducer,
          recipes: recipesReducer,
          houseSocial: houseSocialReducer,
        },
      });

      store.dispatch(setInventory(urgentMockItems));

      let tree: any;
      act(() => {
        tree = ReactTestRenderer.create(
          <Provider store={store}>
            <DashboardScreen />
          </Provider>
        );
      });

      // Buscar el ScrollView horizontal del carrusel urgente por su testID
      const urgentScroll = tree.root.findByProps({ testID: 'urgent-scroll-view' });

      expect(urgentScroll).toBeDefined();
      expect(urgentScroll.props.horizontal).toBe(true);
      expect(urgentScroll.props.nestedScrollEnabled).toBe(true);

      // Simular evento onTouchStart en el carrusel urgente
      act(() => {
        urgentScroll.props.onTouchStart();
      });
      expect(store.getState().hardware.isPagerScrollEnabled).toBe(false);

      // Simular evento onTouchEnd en el carrusel urgente
      act(() => {
        urgentScroll.props.onTouchEnd();
      });
      expect(store.getState().hardware.isPagerScrollEnabled).toBe(true);
    });
  });
});
