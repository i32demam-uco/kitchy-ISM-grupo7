import {
  isFuzzyMatch,
  normalizeTextForComparison,
  extractSignificantTokens,
  shoppingListSlice,
  ShoppingListState,
  addShoppingItem,
  addMultipleShoppingItems,
  toggleCheckItem,
  removeShoppingItem,
  toggleUrgencyManual,
  setUrgencyStatus,
  reconcileScannedProducts,
} from '../src/store/shoppingListSlice';
import { ShoppingItem } from '../src/types';

describe('ShoppingListReconciliation & Urgency State Tests', () => {
  describe('Fuzzy Matching & Normalization', () => {
    test('Normaliza marcas blancas, unidades y acentos', () => {
      const normalized1 = normalizeTextForComparison('LECHE ENTERA 1 L');
      expect(normalized1).not.toContain('1 l');
      expect(normalized1).toContain('leche');

      const normalized2 = normalizeTextForComparison('Leche hacendado');
      expect(normalized2).not.toContain('hacendado');
      expect(normalized2).toContain('leche');
    });

    test('isFuzzyMatch hace coincidir tickets con la lista de la compra', () => {
      expect(isFuzzyMatch('LECHE ENTERA 1 L', 'Leche hacendado')).toBe(true);
      expect(isFuzzyMatch('PECHUGA POLLO 500G', 'Pechuga de pollo')).toBe(true);
      expect(isFuzzyMatch('Tomate Frito Carrefour 3x', 'tomate frito')).toBe(true);
      expect(isFuzzyMatch('HUEVOS CAMPEROS L', 'Huevos docena')).toBe(true);
      expect(isFuzzyMatch('PAPEL HIGIENICO', 'Detergente lavadora')).toBe(false);
      expect(isFuzzyMatch('MANZANA GOLDEN', 'Platanos de canarias')).toBe(false);
    });
  });

  describe('Redux Urgency State (Manual y Automático)', () => {
    const createInitialState = (): ShoppingListState => ({
      items: [] as ShoppingItem[],
      isLoading: false,
      isUrgent: false,
      urgentModeSource: 'NONE',
      urgentUpdatedAt: null,
    });

    test('Activa modo urgente automáticamente (AUTO_LOW_STOCK) al acumular 5 o más productos pendientes', () => {
      let state = createInitialState();

      for (let i = 1; i <= 4; i++) {
        state = shoppingListSlice.reducer(
          state,
          addShoppingItem({
            id: `item-${i}`,
            houseId: 'h1',
            name: `Producto ${i}`,
            quantity: 1,
            unit: 'ud',
            isChecked: false,
            source: 'Manual',
            addedByUserId: 'Alejandro',
            createdAt: new Date().toISOString(),
          })
        );
        expect(state.isUrgent).toBe(false);
      }

      // Añadimos el 5º ítem
      state = shoppingListSlice.reducer(
        state,
        addShoppingItem({
          id: 'item-5',
          houseId: 'h1',
          name: 'Producto 5',
          quantity: 1,
          unit: 'ud',
          isChecked: false,
          source: 'Manual',
          addedByUserId: 'Alejandro',
          createdAt: new Date().toISOString(),
        })
      );

      expect(state.isUrgent).toBe(true);
      expect(state.urgentModeSource).toBe('AUTO_LOW_STOCK');
      expect(state.urgentUpdatedAt).toBeDefined();
    });

    test('Desactiva modo urgente automáticamente al marcar o eliminar productos por debajo del umbral crítico', () => {
      let state = createInitialState();

      const items: ShoppingItem[] = Array.from({ length: 5 }, (_, i) => ({
        id: `it-${i}`,
        houseId: 'h1',
        name: `Item ${i}`,
        quantity: 1,
        unit: 'ud',
        isChecked: false,
        source: 'Manual',
        addedByUserId: 'Alejandro',
        createdAt: new Date().toISOString(),
      }));

      state = shoppingListSlice.reducer(state, addMultipleShoppingItems(items));
      expect(state.isUrgent).toBe(true);
      expect(state.urgentModeSource).toBe('AUTO_LOW_STOCK');

      // Marcamos un ítem como comprado
      state = shoppingListSlice.reducer(state, toggleCheckItem('it-0'));
      expect(state.isUrgent).toBe(false);
      expect(state.urgentModeSource).toBe('NONE');
    });

    test('Modo MANUAL prevalece sobre el conteo de productos y se conmuta explícitamente', () => {
      let state = createInitialState();

      // Conmutar a manual
      state = shoppingListSlice.reducer(state, toggleUrgencyManual());
      expect(state.isUrgent).toBe(true);
      expect(state.urgentModeSource).toBe('MANUAL');

      // Aunque no haya ítems pendientes, se mantiene urgente en manual
      expect(state.items.length).toBe(0);
      expect(state.isUrgent).toBe(true);

      // Conmutar de nuevo desactiva manual
      state = shoppingListSlice.reducer(state, toggleUrgencyManual());
      expect(state.isUrgent).toBe(false);
      expect(state.urgentModeSource).toBe('NONE');
    });
  });

  describe('Conciliación Automática por Escaneo de Ticket (OCR)', () => {
    test('Reconcilia productos del ticket con la lista y desactiva urgencia al vaciarse', () => {
      const initialItems: ShoppingItem[] = [
        {
          id: 'shop-1',
          houseId: 'h1',
          name: 'Leche hacendado',
          quantity: 2,
          unit: 'ud',
          isChecked: false,
          source: 'Manual',
          addedByUserId: 'Alejandro',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'shop-2',
          houseId: 'h1',
          name: 'Pechuga de pollo',
          quantity: 1,
          unit: 'ud',
          isChecked: false,
          source: 'Manual',
          addedByUserId: 'Alejandro',
          createdAt: new Date().toISOString(),
        },
      ];

      let state: ShoppingListState = {
        items: initialItems,
        isLoading: false,
        isUrgent: true,
        urgentModeSource: 'MANUAL',
        urgentUpdatedAt: new Date().toISOString(),
      };

      const scannedProducts = [
        { name: 'LECHE ENTERA 1 L' },
        { name: 'PECHUGA POLLO 500G' },
      ];

      state = shoppingListSlice.reducer(state, reconcileScannedProducts(scannedProducts));

      // Todos los ítems pendientes coincidieron y fueron retirados
      expect(state.items.length).toBe(0);
      expect(state.isUrgent).toBe(false);
      expect(state.urgentModeSource).toBe('NONE');
    });

    test('Conserva productos no presentes en el ticket y mantiene urgencia si corresponde', () => {
      const initialItems: ShoppingItem[] = [
        {
          id: 'shop-1',
          houseId: 'h1',
          name: 'Leche hacendado',
          quantity: 2,
          unit: 'ud',
          isChecked: false,
          source: 'Manual',
          addedByUserId: 'Alejandro',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'shop-2',
          houseId: 'h1',
          name: 'Papel higiénico',
          quantity: 1,
          unit: 'ud',
          isChecked: false,
          source: 'Manual',
          addedByUserId: 'Alejandro',
          createdAt: new Date().toISOString(),
        },
      ];

      let state: ShoppingListState = {
        items: initialItems,
        isLoading: false,
        isUrgent: true,
        urgentModeSource: 'MANUAL',
        urgentUpdatedAt: new Date().toISOString(),
      };

      const scannedProducts = [{ name: 'LECHE ENTERA 1 L' }];

      state = shoppingListSlice.reducer(state, reconcileScannedProducts(scannedProducts));

      expect(state.items.length).toBe(1);
      expect(state.items[0].name).toBe('Papel higiénico');
      // Modo manual sigue activo porque aún queda producto y el usuario no lo apagó
      expect(state.isUrgent).toBe(true);
    });
  });
});
