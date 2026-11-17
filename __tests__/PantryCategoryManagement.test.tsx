import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TouchableOpacity, Text } from 'react-native';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { setInventory } from '../src/store/inventorySlice';
import { categorizeProduct } from '../src/utils/sanitizer';
import { getProductImageUrl } from '../src/screens/ScannerScreen';
import { ProductDetailSheet, AVAILABLE_CATEGORIES } from '../src/components/ProductDetailSheet';
import { FullPantryScreen } from '../src/screens/FullPantryScreen';
import { InventoryItem } from '../src/types';

describe('Gestión de Categorías: Clasificación de productos desconocidos en "Otros Alimentos" y edición manual', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('1. categorizeProduct asigna "Otros Alimentos" y foto realista por defecto si el producto no se reconoce', () => {
    // Producto desconocido sin keywords alimentarias estándar
    const unknownResult = categorizeProduct('Herramienta multiusos 500g');
    expect(unknownResult.category).toBe('Otros Alimentos');

    // Comprobar que getProductImageUrl asigna la imagen de cesta de comestibles realista
    const imageUrl = getProductImageUrl(unknownResult.name, unknownResult.category);
    expect(imageUrl).toBe('https://images.unsplash.com/photo-1542838132-92c53300491e?w=200');

    // Otro producto no comestible / genérico
    const genericItem = categorizeProduct('Pilas alcalinas AA');
    expect(genericItem.category).toBe('Otros Alimentos');
    const genericImg = getProductImageUrl(genericItem.name, genericItem.category);
    expect(genericImg).toBe('https://images.unsplash.com/photo-1542838132-92c53300491e?w=200');
  });

  test('2. ProductDetailSheet muestra chips de categorías y permite al usuario cambiar la categoría manualmente', async () => {
    const testItem: InventoryItem = {
      id: 'test-item-unknown',
      houseId: 'house-123',
      name: 'Especialidad exótica',
      quantity: 1,
      unit: 'ud',
      expirationDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      location: 'Despensa',
      price: 2.5,
      purchaseDate: new Date().toISOString(),
      addedByUserId: 'Alejandro',
      urgencyLevel: 'Green',
      remainingDays: 7,
      category: 'Otros Alimentos',
    };

    let updatedCategory = '';
    let renderer: any;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <ProductDetailSheet
          visible={true}
          item={testItem}
          onClose={jest.fn()}
          onUpdateQuantity={jest.fn()}
          onUpdateExpiration={jest.fn()}
          onDepleted={jest.fn()}
          onUpdateCategory={(_, newCat) => {
            updatedCategory = newCat;
          }}
        />
      );
    });

    const root = renderer.root;
    const texts = root.findAllByType(Text).map((t: any) => t.props.children).flat().join(' ');

    // Verificar presencia del encabezado y la categoría actual
    expect(texts).toContain('CATEGORÍA DEL ALIMENTO');
    expect(texts).toContain('Otros Alimentos');

    // Verificar que todas las categorías disponibles están presentes como opciones
    AVAILABLE_CATEGORIES.forEach((cat) => {
      expect(texts).toContain(cat);
    });

    // Encontrar y pulsar el chip de "Carne"
    const carneChip = root.findByProps({ accessibilityLabel: 'Categoría Carne' });
    expect(carneChip).toBeDefined();

    await ReactTestRenderer.act(async () => {
      carneChip.props.onPress();
    });

    // Verificar que se invocó el callback con la nueva categoría deseada por el usuario
    expect(updatedCategory).toBe('Carne');

    // Ahora pulsar "Lácteos y Huevos"
    const lacteosChip = root.findByProps({ accessibilityLabel: 'Categoría Lácteos y Huevos' });
    await ReactTestRenderer.act(async () => {
      lacteosChip.props.onPress();
    });

    expect(updatedCategory).toBe('Lácteos y Huevos');

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });

  test('3. En FullPantryScreen, al cambiar la categoría de un producto, se actualiza en Redux y se mueve de sección', async () => {
    const unknownItem: InventoryItem = {
      id: 'pantry-item-move',
      houseId: 'house-123',
      name: 'Producto sorpresa sin clasificar',
      quantity: 1,
      unit: 'ud',
      expirationDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
      location: 'Despensa',
      price: 3.0,
      purchaseDate: new Date().toISOString(),
      addedByUserId: 'Alejandro',
      urgencyLevel: 'Green',
      remainingDays: 5,
      category: 'Otros Alimentos',
    };

    store.dispatch(setInventory([unknownItem]));

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <FullPantryScreen />
        </Provider>
      );
    });

    // Inicialmente aparece en la sección "Otros Alimentos"
    let allText = renderer.root.findAllByType(Text).map((t: any) => t.props.children).flat().join(' ');
    expect(allText).toContain('Otros Alimentos');
    expect(allText).toContain('Producto sorpresa sin clasificar');

    // Abrir la ficha de producto pulsando en la fila
    const rowTouchable = renderer.root.findAllByType(TouchableOpacity).find((t: any) => {
      const texts = t.findAllByType(Text).map((n: any) => n.props.children).flat();
      return texts.includes('Producto sorpresa sin clasificar');
    });

    expect(rowTouchable).toBeDefined();
    await ReactTestRenderer.act(async () => {
      rowTouchable.props.onPress();
    });

    // Cambiar la categoría a "Frutas y Verduras" dentro de la ficha de detalle
    const frutasChip = renderer.root.findByProps({ accessibilityLabel: 'Categoría Frutas y Verduras' });
    expect(frutasChip).toBeDefined();

    await ReactTestRenderer.act(async () => {
      frutasChip.props.onPress();
    });

    // Comprobar que en Redux el item ahora tiene categoría "Frutas y Verduras"
    const itemsInStore = store.getState().inventory.items;
    const modifiedItem = itemsInStore.find((i) => i.id === 'pantry-item-move');
    expect(modifiedItem?.category).toBe('Frutas y Verduras');

    // Comprobar que la pantalla ahora renderiza la sección "Frutas y Verduras" con el producto
    allText = renderer.root.findAllByType(Text).map((t: any) => t.props.children).flat().join(' ');
    expect(allText).toContain('Frutas y Verduras');

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });
});

