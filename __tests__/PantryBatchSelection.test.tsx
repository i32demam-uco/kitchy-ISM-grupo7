import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TouchableOpacity, Alert } from 'react-native';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { setInventory, removeMultipleInventoryItems } from '../src/store/inventorySlice';
import { FullPantryScreen } from '../src/screens/FullPantryScreen';
import { SwipeablePantryRow } from '../src/components/SwipeablePantryRow';
import { KitchyAlert } from '../src/services/kitchyAlert';
import { InventoryItem } from '../src/types';

describe('Despensa: Menú de opciones (3 puntos) y Modo Selección Múltiple / Borrado en lote', () => {
  const mockItems: InventoryItem[] = [
    {
      id: 'pantry-item-1',
      houseId: 'house-123',
      name: 'Pechuga de pollo',
      quantity: 500,
      unit: 'g',
      expirationDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      location: 'En la nevera',
      price: 3.6,
      purchaseDate: new Date().toISOString(),
      addedByUserId: 'Alejandro',
      urgencyLevel: 'Red',
      remainingDays: 1,
      category: 'Carne',
    },
    {
      id: 'pantry-item-2',
      houseId: 'house-123',
      name: 'Huevos camperos',
      quantity: 6,
      unit: 'ud',
      expirationDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      location: 'En la nevera',
      price: 1.8,
      purchaseDate: new Date().toISOString(),
      addedByUserId: 'David',
      urgencyLevel: 'Amber',
      remainingDays: 2,
      category: 'Lácteos y Huevos',
    },
    {
      id: 'pantry-item-3',
      houseId: 'house-123',
      name: 'Leche entera',
      quantity: 1,
      unit: 'l',
      expirationDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      location: 'En la nevera',
      price: 1.05,
      purchaseDate: new Date().toISOString(),
      addedByUserId: 'Alejandro',
      urgencyLevel: 'Green',
      remainingDays: 7,
      category: 'Lácteos y Huevos',
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    store.dispatch(setInventory(mockItems));
    jest.spyOn(KitchyAlert, 'show');
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('1. Redux inventorySlice: removeMultipleInventoryItems elimina varios productos correctamente', () => {
    expect(store.getState().inventory.items.length).toBe(3);

    store.dispatch(removeMultipleInventoryItems(['pantry-item-1', 'pantry-item-3']));
    const remaining = store.getState().inventory.items;
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe('pantry-item-2');
  });

  test('2. SwipeablePantryRow renderiza el checkbox interactivo cuando isSelectionMode=true', async () => {
    let toggled = false;
    let renderer: any;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <SwipeablePantryRow
          item={mockItems[0]}
          isLast={false}
          onPress={jest.fn()}
          onQuickConsume={jest.fn()}
          isSelectionMode={true}
          isSelected={true}
          onToggleSelect={() => {
            toggled = true;
          }}
        />
      );
    });

    const rowTouchable = renderer.root.findAllByType(TouchableOpacity)[1]; // row touchable

    await ReactTestRenderer.act(async () => {
      rowTouchable.props.onPress();
    });

    expect(toggled).toBe(true);

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });

  test('3. FullPantryScreen muestra el botón de 3 puntos, abre opciones y permite activar modo selección', async () => {
    let renderer: any;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <FullPantryScreen />
        </Provider>
      );
    });

    // 1. Buscar botón de opciones con accessibilityLabel="Opciones de despensa"
    const optionsButton = renderer.root.findByProps({ accessibilityLabel: 'Opciones de despensa' });
    expect(optionsButton).toBeDefined();

    // 2. Pulsar botón de 3 puntos
    await ReactTestRenderer.act(async () => {
      optionsButton.props.onPress();
    });

    // 3. Encontrar la opción "Seleccionar alimentos" en el menú desplegado
    const selectOption = renderer.root.findByProps({ accessibilityLabel: 'Opción seleccionar alimentos' });
    expect(selectOption).toBeDefined();

    // 4. Pulsar "Seleccionar alimentos"
    await ReactTestRenderer.act(async () => {
      selectOption.props.onPress();
    });

    // 5. Ahora la cabecera debe reflejar el modo selección
    const headerTexts = renderer.root.findAllByType('Text').map((node: any) => node.props.children).flat().join(' ');
    expect(headerTexts).toContain('Seleccionar');
    expect(headerTexts).toContain('seleccionados');

    // 6. Botón Todos / Desmarcar
    const touchablesInSelectMode = renderer.root.findAllByType(TouchableOpacity);
    const todosBtn = touchablesInSelectMode.find((t: any) => {
      const texts = t.findAllByType('Text').map((node: any) => node.props.children).flat();
      return texts.includes('Todos') || texts.includes('Desmarcar');
    });
    expect(todosBtn).toBeDefined();

    // 7. Pulsar "Todos" para seleccionar los alimentos visibles
    await ReactTestRenderer.act(async () => {
      todosBtn.props.onPress();
    });

    // 8. Encontrar botón "Eliminar alimentos"
    const allTouchablesAfterSelect = renderer.root.findAllByType(TouchableOpacity);
    const deleteBatchBtn = allTouchablesAfterSelect.find((t: any) => {
      const texts = t.findAllByType('Text').map((node: any) => node.props.children).flat();
      return texts.includes('Eliminar alimentos');
    });

    expect(deleteBatchBtn).toBeDefined();
    expect(deleteBatchBtn.props.disabled).toBe(false);

    // 9. Pulsar "Eliminar alimentos" -> Debe disparar KitchyAlert.show con el texto de confirmación exacto
    await ReactTestRenderer.act(async () => {
      deleteBatchBtn.props.onPress();
    });

    expect(KitchyAlert.show).toHaveBeenCalledWith(
      '¿Eliminar alimentos?',
      '¿Estás seguro de que quieres borrar esos alimentos de la despensa?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancelar' }),
        expect.objectContaining({ text: 'Eliminar', style: 'destructive' }),
      ])
    );

    // 10. Ejecutar callback de confirmación del Alert
    const alertCall = (KitchyAlert.show as jest.Mock).mock.calls[0];
    const confirmButton = alertCall[2].find((b: any) => b.text === 'Eliminar');
    expect(confirmButton).toBeDefined();

    await ReactTestRenderer.act(async () => {
      confirmButton.onPress();
    });

    // 11. Comprobar que los alimentos seleccionados fueron borrados de la despensa
    expect(store.getState().inventory.items.length).toBe(0);

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });
});
