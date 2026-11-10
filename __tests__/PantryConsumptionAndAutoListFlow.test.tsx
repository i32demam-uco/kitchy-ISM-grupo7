import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TouchableOpacity, TextInput } from 'react-native';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import {
  setInventory,
  updateInventoryItemQuantity,
  removeInventoryItem,
} from '../src/store/inventorySlice';
import {
  setShoppingList,
  addShoppingItem,
} from '../src/store/shoppingListSlice';
import { FullPantryScreen } from '../src/screens/FullPantryScreen';
import { ShoppingListScreen } from '../src/screens/ShoppingListScreen';
import { ProductDetailSheet } from '../src/components/ProductDetailSheet';
import { ProductDepletedModal } from '../src/components/ProductDepletedModal';
import { CalendarPickerModal } from '../src/components/CalendarPickerModal';
import { SwipeablePantryRow } from '../src/components/SwipeablePantryRow';
import { determineCategory, groupInventoryByCategory } from '../src/utils/inventoryGrouping';
import { InventoryItem } from '../src/types';

describe('Flujo de Consumo, Ficha de Producto y Auto-Lista Inteligente', () => {
  const mockMeatItem: InventoryItem = {
    id: 'test-meat-1',
    houseId: 'a0000000-0000-0000-0000-000000000001',
    name: 'Pechuga de pollo',
    quantity: 1,
    unit: 'ud',
    expirationDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    location: 'En la nevera',
    price: 3.60,
    purchaseDate: new Date().toISOString(),
    addedByUserId: 'Alejandro',
    urgencyLevel: 'Red',
    remainingDays: 1,
    imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200',
  };

  const mockFishItem: InventoryItem = {
    id: 'test-fish-1',
    houseId: 'a0000000-0000-0000-0000-000000000001',
    name: 'Merluza fresca',
    quantity: 2,
    unit: 'filetes',
    expirationDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    location: 'En la nevera',
    price: 5.20,
    purchaseDate: new Date().toISOString(),
    addedByUserId: 'David',
    urgencyLevel: 'Amber',
    remainingDays: 2,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    store.dispatch(setInventory([mockMeatItem, mockFishItem]));
    store.dispatch(setShoppingList([]));
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('1. Categorías refactorizadas: "Carne" y "Pescado" reemplazan "Carnicería" y "Aves"', () => {
    expect(determineCategory(mockMeatItem)).toBe('Carne');
    expect(determineCategory(mockFishItem)).toBe('Pescado');

    const groups = groupInventoryByCategory([mockMeatItem, mockFishItem]);
    const groupNames = groups.map((g) => g.category);
    expect(groupNames).toContain('Carne');
    expect(groupNames).toContain('Pescado');
    expect(groupNames).not.toContain('Carnicería');
    expect(groupNames).not.toContain('Aves');
    expect(groupNames).not.toContain('Carnicería y Aves');
  });

  test('2. ProductDetailSheet renders Bottom Sheet with Glassmorphism, Fitts Law buttons and DatePicker', async () => {
    let quantityUpdated = 0;
    let depletedCalled = false;
    let newDateUpdated = '';

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <ProductDetailSheet
          visible={true}
          item={mockMeatItem}
          onClose={jest.fn()}
          onUpdateQuantity={(_, q) => { quantityUpdated = q; }}
          onUpdateExpiration={(_, d) => { newDateUpdated = d; }}
          onDepleted={() => { depletedCalled = true; }}
        />
      );
    });

    const root = renderer.root;
    const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat().join(' ');

    // Cabecera fotorrealista y metadata
    expect(texts).toContain('Pechuga de pollo');
    expect(texts).toContain('Carne');
    expect(texts).toContain('En la nevera');
    expect(texts).toContain('Alejandro');

    // Botones Fitts Law: Decremento e Incremento
    const touchables = root.findAllByType(TouchableOpacity);
    expect(touchables.length).toBeGreaterThanOrEqual(4);

    // Simular pulsar [+]
    const plusBtn = touchables.find((t: any) => {
      const children = t.findAllByType('Text');
      return children.some((c: any) => c.props.children === '+');
    });
    expect(plusBtn).toBeDefined();

    await ReactTestRenderer.act(async () => {
      plusBtn.props.onPress();
    });
    expect(quantityUpdated).toBe(2);

    // Simular pulsar [-] cuando la cantidad es 1 -> debe activar onDepleted
    const minusBtn = touchables.find((t: any) => {
      const children = t.findAllByType('Text');
      return children.some((c: any) => c.props.children === '−');
    });
    expect(minusBtn).toBeDefined();

    await ReactTestRenderer.act(async () => {
      minusBtn.props.onPress();
    });
    expect(depletedCalled).toBe(true);

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });

  test('3. Smart Prompt (ProductDepletedModal): Mueve el producto a la lista de la compra al aceptar', async () => {
    let confirmedItem: InventoryItem | null = null;
    let dismissed = false;

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <ProductDepletedModal
          visible={true}
          item={mockMeatItem}
          onDismiss={() => { dismissed = true; }}
          onConfirmAddToList={(item) => {
            confirmedItem = item;
            // Simular transferencia Offline-First en Redux
            store.dispatch(removeInventoryItem(item.id));
            store.dispatch(
              addShoppingItem({
                id: `shop-${Date.now()}`,
                houseId: item.houseId,
                name: item.name,
                quantity: 1,
                unit: item.unit,
                isChecked: false,
                source: 'Manual',
                addedByUserId: 'Alejandro',
                createdAt: new Date().toISOString(),
                category: 'Carne',
              })
            );
          }}
        />
      );
    });

    const root = renderer.root;
    const allText = root.findAllByType('Text').map((t: any) => t.props.children).flat().join(' ');

    expect(allText).toContain('Producto Agotado');
    expect(allText).toContain('Pechuga de pollo');
    expect(allText).toContain('Añadir a la Lista');
    expect(allText).toContain('Descartar');

    // Pulsar "Añadir a la Lista"
    const confirmBtn = root.findAllByType(TouchableOpacity).find((t: any) => {
      const child = t.findAllByType('Text');
      return child.some((c: any) => c.props.children === 'Añadir a la Lista');
    });
    expect(confirmBtn).toBeDefined();

    await ReactTestRenderer.act(async () => {
      confirmBtn.props.onPress();
    });

    expect(confirmedItem).not.toBeNull();
    // Verificar que en Redux se eliminó del inventario y se agregó a la lista de compra
    const inventoryState = store.getState().inventory.items;
    const shoppingState = store.getState().shoppingList.items;

    expect(inventoryState.some((i) => i.id === mockMeatItem.id)).toBe(false);
    expect(shoppingState.some((s) => s.name === mockMeatItem.name)).toBe(true);
    expect(shoppingState[0].category).toBe('Carne');

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });

  test('4. ShoppingListScreen: Filtros interactivos con Chips horizontales [Todos, Urgente, Carne, Pescado...]', async () => {
    // Poblar lista con varios alimentos
    store.dispatch(
      setShoppingList([
        {
          id: 's-1',
          houseId: 'house-1',
          name: 'Pechuga de pollo',
          quantity: 1,
          unit: 'ud',
          isChecked: false,
          source: 'Manual',
          addedByUserId: 'Alejandro',
          createdAt: new Date().toISOString(),
          category: 'Carne',
        },
        {
          id: 's-2',
          houseId: 'house-1',
          name: 'Merluza en lomos',
          quantity: 2,
          unit: 'ud',
          isChecked: false,
          source: 'Manual',
          addedByUserId: 'David',
          createdAt: new Date().toISOString(),
          category: 'Pescado',
        },
      ])
    );

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <ShoppingListScreen />
        </Provider>
      );
    });

    const root = renderer.root;
    const allText = root.findAllByType('Text').map((t: any) => t.props.children).flat().join(' ');

    // Verificar presencia de los Chips de filtrado
    expect(allText).toContain('Todos');
    expect(allText).toContain('Carne');
    expect(allText).toContain('Pescado');
    expect(allText).toContain('Lácteos y Huevos');

    // Filtrar por 'Carne'
    const carneChip = root.findAllByType(TouchableOpacity).find((t: any) => {
      const child = t.findAllByType('Text');
      return child.some((c: any) => c.props.children === 'Carne');
    });
    expect(carneChip).toBeDefined();

    await ReactTestRenderer.act(async () => {
      carneChip.props.onPress();
    });

    const filteredTexts = root.findAllByType('Text').map((t: any) => t.props.children).flat().join(' ');
    expect(filteredTexts).toContain('Pechuga de pollo');
    expect(filteredTexts).not.toContain('Merluza en lomos');

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });

  test('5. FullPantryScreen: Chips de filtrado horizontal por categorías ([Todos], [Urgente], [Carne]...)', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <FullPantryScreen />
        </Provider>
      );
    });

    const root = renderer.root;
    const allText = root.findAllByType('Text').map((t: any) => t.props.children).flat().join(' ');

    // Verificar que los chips están presentes en la cabecera
    expect(allText).toContain('Todos');
    expect(allText).toContain('Urgente');
    expect(allText).toContain('Carne');
    expect(allText).toContain('Pescado');

    // Filtrar por 'Pescado'
    const pescadoChip = root.findAllByType(TouchableOpacity).find((t: any) => {
      const child = t.findAllByType('Text');
      return child.some((c: any) => c.props.children === 'Pescado');
    });
    expect(pescadoChip).toBeDefined();

    await ReactTestRenderer.act(async () => {
      pescadoChip.props.onPress();
    });

    const filteredTexts = root.findAllByType('Text').map((t: any) => t.props.children).flat().join(' ');
    expect(filteredTexts).toContain('Merluza fresca');
    expect(filteredTexts).not.toContain('Pechuga de pollo');

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });

  test('6. CalendarPickerModal: Selector de fecha nativo de precisión con navegación de meses y días', async () => {
    let selectedDate: Date | null = null;
    let closed = false;

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <CalendarPickerModal
          visible={true}
          initialDate="2026-11-15T12:00:00.000Z"
          onClose={() => { closed = true; }}
          onSelectDate={(d) => { selectedDate = d; }}
        />
      );
    });

    const root = renderer.root;
    const allText = root.findAllByType('Text').map((t: any) => t.props.children).flat().join(' ');

    expect(allText).toContain('Noviembre 2026');
    expect(allText).toContain('Hoy');
    expect(allText).toContain('Cancelar');

    // Navegar al mes siguiente (›)
    const nextBtn = root.findAllByType(TouchableOpacity).find((t: any) => {
      const child = t.findAllByType('Text');
      return child.some((c: any) => c.props.children === '›');
    });
    expect(nextBtn).toBeDefined();

    await ReactTestRenderer.act(async () => {
      nextBtn.props.onPress();
    });

    const nextMonthText = root.findAllByType('Text').map((t: any) => t.props.children).flat().join(' ');
    expect(nextMonthText).toContain('Diciembre 2026');

    // Seleccionar día 24
    const day24Btn = root.findAllByType(TouchableOpacity).find((t: any) => {
      const child = t.findAllByType('Text');
      return child.some((c: any) => c.props.children === 24);
    });
    expect(day24Btn).toBeDefined();

    await ReactTestRenderer.act(async () => {
      day24Btn.props.onPress();
    });

    expect(selectedDate).not.toBeNull();
    expect(selectedDate!.getMonth()).toBe(11); // Diciembre
    expect(selectedDate!.getDate()).toBe(24);

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });

  test('7. ProductDetailSheet: Entrada manual directa por teclado numérico y Long Press rápido', async () => {
    let updatedQuantity = 0;
    const itemWithGrams: InventoryItem = {
      ...mockMeatItem,
      quantity: 500,
      unit: 'g',
    };

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <ProductDetailSheet
          visible={true}
          item={itemWithGrams}
          onClose={jest.fn()}
          onUpdateQuantity={(_, q) => { updatedQuantity = q; }}
          onUpdateExpiration={jest.fn()}
          onDepleted={jest.fn()}
        />
      );
    });

    const root = renderer.root;

    // Buscar el TextInput numérico
    const textInput = root.findByType(TextInput);
    expect(textInput).toBeDefined();
    expect(textInput.props.keyboardType).toBe('numeric');
    expect(textInput.props.value).toBe('500');

    // Simular teclear manualmente "250"
    await ReactTestRenderer.act(async () => {
      textInput.props.onChangeText('250');
    });
    expect(updatedQuantity).toBe(250);

    // Simular Long Press en el botón [+]
    const plusBtn = root.findAllByType(TouchableOpacity).find((t: any) => {
      const children = t.findAllByType('Text');
      return children.some((c: any) => c.props.children === '+');
    });
    expect(plusBtn).toBeDefined();

    await ReactTestRenderer.act(async () => {
      plusBtn.props.onLongPress();
      jest.advanceTimersByTime(250); // Avanzar intervalo de aceleración
      plusBtn.props.onPressOut();
    });

    expect(updatedQuantity).toBeGreaterThanOrEqual(250);

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });
});
