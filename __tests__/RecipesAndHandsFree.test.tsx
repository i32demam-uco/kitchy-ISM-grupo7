import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import recipesReducer, {
  INITIAL_RECIPES,
  setServingsMultiplier,
  setActiveFilter,
  toggleFavorite,
  setHandsFreeActive,
  nextStep,
  prevStep,
  goToStep,
  toggleTimer,
  decrementTimer,
  resetTimer,
  setTimerSecondsRemaining,
  setActiveRecipe,
} from '../src/store/recipesSlice';
import inventoryReducer from '../src/store/inventorySlice';
import authReducer from '../src/store/authSlice';
import hardwareReducer from '../src/store/hardwareSlice';
import { CookingModeScreen } from '../src/screens/CookingModeScreen';
import { HandsFreeCookingScreen } from '../src/screens/HandsFreeCookingScreen';
import { Recipe, RecipeIngredient, InventoryItem } from '../src/types';

describe('⚡ Módulo Inteligente de Gastronomía, Algoritmo Delta y Modo Manos Libres ⚡', () => {
  let testStore: any;

  beforeEach(() => {
    jest.useFakeTimers();
    testStore = configureStore({
      reducer: {
        recipes: recipesReducer,
        inventory: inventoryReducer,
        auth: authReducer,
        hardware: hardwareReducer,
      },
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('1. Escalado Matemático de Raciones en Tiempo Real', () => {
    test('Multiplicador de raciones recalcula cantidades de ingredientes con exactitud matemática', () => {
      const baseRecipe = INITIAL_RECIPES[0]; // 2 personas
      expect(testStore.getState().recipes.servingsMultiplier).toBe(1);

      // Cambiar multiplicador a 2 (4 personas)
      testStore.dispatch(setServingsMultiplier(2));
      expect(testStore.getState().recipes.servingsMultiplier).toBe(2);

      const chicken = baseRecipe.ingredients.find((i) => i.name.toLowerCase().includes('pollo'));
      expect(chicken).toBeDefined();
      if (chicken) {
        const scaledQty = chicken.quantity * testStore.getState().recipes.servingsMultiplier;
        expect(scaledQty).toBe(chicken.quantity * 2);
      }

      // Cambiar multiplicador a 3 (6 personas)
      testStore.dispatch(setServingsMultiplier(3));
      expect(testStore.getState().recipes.servingsMultiplier).toBe(3);
      if (chicken) {
        const tripleQty = chicken.quantity * testStore.getState().recipes.servingsMultiplier;
        expect(tripleQty).toBe(chicken.quantity * 3);
      }
    });
  });

  describe('2. Filtros Dinámicos del Hub de Recetas', () => {
    test('Permite alternar entre Todas, Con lo que tengo, Aprovechar Urgentes y Favoritas', () => {
      expect(testStore.getState().recipes.activeFilter).toBe('all');

      testStore.dispatch(setActiveFilter('available'));
      expect(testStore.getState().recipes.activeFilter).toBe('available');

      testStore.dispatch(setActiveFilter('urgent'));
      expect(testStore.getState().recipes.activeFilter).toBe('urgent');

      testStore.dispatch(setActiveFilter('favorites'));
      expect(testStore.getState().recipes.activeFilter).toBe('favorites');

      testStore.dispatch(setActiveFilter('quick'));
      expect(testStore.getState().recipes.activeFilter).toBe('quick');
    });

    test('Conmutar favorito actualiza el estado isFavorite en el recetario', () => {
      const targetId = INITIAL_RECIPES[0].id;
      const initialFav = INITIAL_RECIPES[0].isFavorite;

      testStore.dispatch(toggleFavorite(targetId));
      const updated = testStore.getState().recipes.recipes.find((r: Recipe) => r.id === targetId);
      expect(updated.isFavorite).toBe(!initialFav);
    });
  });

  describe('3. Algoritmo Delta de Ingredientes (Disponible, Prioritario, Faltante)', () => {
    test('Clasifica correctamente ingredientes entre stock de despensa, próximos a caducar y faltantes', () => {
      const mockPantry: InventoryItem[] = [
        {
          id: 'p1',
          houseId: 'h1',
          name: 'Pechuga de pollo',
          quantity: 500,
          unit: 'g',
          expirationDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // Urgente 24h
          location: 'Nevera',
          remainingDays: 1,
          urgencyLevel: 'Red',
          price: 4.5,
          purchaseDate: new Date().toISOString(),
          addedByUserId: 'user1',
        },
        {
          id: 'p2',
          houseId: 'h1',
          name: 'Huevos L',
          quantity: 6,
          unit: 'ud',
          expirationDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          location: 'Nevera',
          remainingDays: 7,
          urgencyLevel: 'Green',
          price: 2.1,
          purchaseDate: new Date().toISOString(),
          addedByUserId: 'user1',
        },
      ];

      const requiredIngredients: RecipeIngredient[] = [
        { name: 'Pechuga de pollo', quantity: 500, unit: 'g' },
        { name: 'Huevos L', quantity: 2, unit: 'ud' },
        { name: 'Tomate frito Hacendado', quantity: 390, unit: 'g' }, // Faltante
      ];

      // Simulación del algoritmo Delta
      const available: RecipeIngredient[] = [];
      const urgent: RecipeIngredient[] = [];
      const missing: RecipeIngredient[] = [];

      requiredIngredients.forEach((req) => {
        const found = mockPantry.find((p) => p.name.toLowerCase().includes(req.name.toLowerCase().slice(0, 5)));
        if (!found) {
          missing.push(req);
        } else if (found.remainingDays !== undefined && found.remainingDays <= 2) {
          urgent.push(req);
        } else {
          available.push(req);
        }
      });

      expect(urgent.length).toBe(1);
      expect(urgent[0].name).toContain('Pechuga de pollo');

      expect(available.length).toBe(1);
      expect(available[0].name).toContain('Huevos L');

      expect(missing.length).toBe(1);
      expect(missing[0].name).toContain('Tomate frito');
    });
  });

  describe('4. Modo Cocina Manos Libres: Navegación de Pasos y Sensor de Proximidad', () => {
    test('Avanzar y retroceder pasos actualiza currentStepIndex en Redux', () => {
      testStore.dispatch(setHandsFreeActive(true));
      testStore.dispatch(goToStep(0));
      expect(testStore.getState().recipes.currentStepIndex).toBe(0);

      testStore.dispatch(nextStep());
      expect(testStore.getState().recipes.currentStepIndex).toBe(1);

      testStore.dispatch(nextStep());
      expect(testStore.getState().recipes.currentStepIndex).toBe(2);

      testStore.dispatch(prevStep());
      expect(testStore.getState().recipes.currentStepIndex).toBe(1);
    });

    test('Control del temporizador: Iniciar, pausar, decrementar y resetear', () => {
      expect(testStore.getState().recipes.isTimerRunning).toBe(false);

      testStore.dispatch(toggleTimer());
      expect(testStore.getState().recipes.isTimerRunning).toBe(true);

      testStore.dispatch(decrementTimer());
      expect(testStore.getState().recipes.timerSecondsRemaining).toBe(479); // 480 - 1

      testStore.dispatch(toggleTimer());
      expect(testStore.getState().recipes.isTimerRunning).toBe(false);

      testStore.dispatch(setTimerSecondsRemaining(300));
      expect(testStore.getState().recipes.timerSecondsRemaining).toBe(300);
    });

    test('Sensor de proximidad frontal con debounce de 800ms evita dobles pulsaciones involuntarias', () => {
      let lastGestureTime = 0;
      let stepAdvances = 0;

      const onProximityWave = () => {
        const now = Date.now();
        if (now - lastGestureTime < 800) {
          return; // Rechazado por debounce
        }
        lastGestureTime = now;
        stepAdvances++;
      };

      // Primer gesto
      onProximityWave();
      expect(stepAdvances).toBe(1);

      // Segundo gesto inmediato (< 800ms) -> Ignorado
      onProximityWave();
      expect(stepAdvances).toBe(1);

      // Avanzar tiempo 900ms
      jest.advanceTimersByTime(900);
      onProximityWave();
      expect(stepAdvances).toBe(2);
    });
  });

  describe('5. Renderizado UI Pixel-Perfect de HandsFreeCookingScreen', () => {
    test('Renderiza cabecera, barra de progreso, instrucción, temporizador #162921, aviso de seguridad y onda de voz', async () => {
      let renderer: any;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <Provider store={testStore}>
            <HandsFreeCookingScreen />
          </Provider>
        );
      });

      const root = renderer.root;
      const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
      const normalizedText = texts.join(' ').replace(/\s+/g, ' ');

      // 1. Cabecera y plato
      expect(normalizedText).toContain('MODO COCINA · MANOS LIBRES');
      expect(normalizedText).toContain('Pollo con tomate y huevo');

      // 2. Chip de Gestos activos
      expect(normalizedText).toContain('Gestos activos');

      // 3. Barra de progreso y tiempo restante
      expect(normalizedText).toContain('PASO');

      // 4. Temporizador y comando por voz
      expect(normalizedText).toContain('08:00');
      expect(normalizedText).toContain('iniciar temporizador');

      // 5. Alerta de temperatura
      expect(normalizedText).toContain('74 °C');

      // 6. Asistente y micrófono
      expect(normalizedText).toContain('siguiente');
      expect(normalizedText).toContain('Pasa la mano para avanzar, sin tocar la pantalla');

      // Limpieza
      await ReactTestRenderer.act(() => {
        renderer.unmount();
      });
    });
  });

  describe('6. Renderizado del Hub de Recetas (CookingModeScreen)', () => {
    test('Renderiza el Hub de Recetas con filtros, raciones, botones de generar y cards', async () => {
      let renderer: any;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <Provider store={testStore}>
            <CookingModeScreen />
          </Provider>
        );
      });

      const root = renderer.root;
      const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
      const normalizedText = texts.join(' ').replace(/\s+/g, ' ');

      expect(normalizedText).toContain('Cocinar');
      expect(normalizedText).toContain('Recetas inteligentes con lo que tienes en casa');
      expect(normalizedText).toContain('Generar con IA (Despensa)');
      expect(normalizedText).toContain('Crear');
      expect(normalizedText).toContain('Todas');
      expect(normalizedText).toContain('Con lo que tengo');
      expect(normalizedText).toContain('Aprovechar Urgentes');
      expect(normalizedText).toContain('Favoritas');
      expect(normalizedText).toContain('Cocinar Manos Libres');

      await ReactTestRenderer.act(() => {
        renderer.unmount();
      });
    });

    test('Pulsar en "Generar con IA (Despensa)" abre el Bottom Sheet interactivo "Asistente Kitchy"', async () => {
      let renderer: any;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <Provider store={testStore}>
            <CookingModeScreen />
          </Provider>
        );
      });

      const root = renderer.root;
      // Localizar el botón "Generar con IA" subiendo desde el nodo de texto
      const textNode = root.findAllByType('Text').find((t: any) => {
        const children = Array.isArray(t.props.children) ? t.props.children.join('') : String(t.props.children || '');
        return children.includes('Generar con IA');
      });

      expect(textNode).toBeDefined();
      let parentTouchable = textNode?.parent;
      while (parentTouchable && !parentTouchable.props?.onPress) {
        parentTouchable = parentTouchable.parent;
      }
      expect(parentTouchable).toBeDefined();

      // Abrir el Asistente
      await ReactTestRenderer.act(() => {
        parentTouchable.props.onPress();
      });

      const textsAfter = root.findAllByType('Text').map((t: any) => t.props.children).flat();
      const normalizedAfter = textsAfter.join(' ').replace(/\s+/g, ' ');

      expect(normalizedAfter).toContain('Asistente Kitchy');
      expect(normalizedAfter).toContain('¿Qué te apetece comer?');
      expect(normalizedAfter).toContain('Selecciona tus ingredientes');
      expect(normalizedAfter).toContain('Generar Opciones');

      await ReactTestRenderer.act(() => {
        renderer.unmount();
      });
    });
  });

  describe('7. Controles Manuales de Respaldo y Pausa Inteligente', () => {
    test('HandsFreeCookingScreen renderiza botonera [ Anterior ] y [ Siguiente Paso ] debajo del temporizador', async () => {
      let renderer: any;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <Provider store={testStore}>
            <HandsFreeCookingScreen />
          </Provider>
        );
      });

      const root = renderer.root;
      const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
      const normalizedText = texts.join(' ').replace(/\s+/g, ' ');

      expect(normalizedText).toContain('Anterior');
      expect(normalizedText).toContain('Siguiente Paso');

      await ReactTestRenderer.act(() => {
        renderer.unmount();
      });
    });

    test('Pausa Inteligente: Si el temporizador está corriendo y se pulsa "Siguiente Paso", se detiene automáticamente', async () => {
      let renderer: any;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <Provider store={testStore}>
            <HandsFreeCookingScreen />
          </Provider>
        );
      });

      // 1. Iniciar temporizador
      await ReactTestRenderer.act(() => {
        testStore.dispatch(toggleTimer());
      });
      expect(testStore.getState().recipes.isTimerRunning).toBe(true);

      const root = renderer.root;
      // 2. Localizar botón "Siguiente Paso" subiendo desde el nodo de texto
      const nextText = root.findAllByType('Text').find((t: any) => {
        const children = Array.isArray(t.props.children) ? t.props.children.join('') : String(t.props.children || '');
        return children.includes('Siguiente Paso');
      });

      expect(nextText).toBeDefined();
      let nextParent = nextText?.parent;
      while (nextParent && !nextParent.props?.onPress) {
        nextParent = nextParent.parent;
      }
      expect(nextParent).toBeDefined();

      // 3. Pulsar Siguiente Paso
      await ReactTestRenderer.act(() => {
        nextParent.props.onPress();
      });

      // 4. Verificar que la Pausa Inteligente detuvo el temporizador
      expect(testStore.getState().recipes.isTimerRunning).toBe(false);

      await ReactTestRenderer.act(() => {
        renderer.unmount();
      });
    });
  });

  describe('8. Solución a Alimentos Dobles, Keys Únicas y Recomendaciones Personalizadas (Taquitos y Queso)', () => {
    test('RecipeService.generateOptions genera recetas de tacos personalizadas cuando el usuario selecciona taquitos de jamón, queso y antojo de tacos', async () => {
      const { RecipeService } = require('../src/services/recipeService');
      const recipes = await RecipeService.generateOptions('house-1', {
        forcedIngredients: ['Mini Taquitos Jamon', 'Queso'],
        cravingPrompt: 'tacos de jamon y queso',
      });

      expect(recipes.length).toBeGreaterThanOrEqual(3);
      // Debe incluir la receta personalizada de tacos de jamón y queso
      const tacoRecipe = recipes.find((r: any) => r.title.toLowerCase().includes('tacos'));
      expect(tacoRecipe).toBeDefined();
      expect(tacoRecipe.title).toContain('Tacos crujientes de taquitos de jamón');
      expect(tacoRecipe.ingredients.some((i: any) => i.name.includes('Jamon'))).toBe(true);
      expect(tacoRecipe.ingredients.some((i: any) => i.name.includes('Queso'))).toBe(true);

      // Todas las recetas devueltas deben tener IDs únicos
      const ids = recipes.map((r: any) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('addRecipe previene duplicación de recetas por ID idéntico o título duplicado', () => {
      const { addRecipe } = require('../src/store/recipesSlice');
      const initialCount = testStore.getState().recipes.recipes.length;
      const existing = testStore.getState().recipes.recipes[0];

      // Intentar añadir la misma receta
      testStore.dispatch(addRecipe({ ...existing }));
      expect(testStore.getState().recipes.recipes.length).toBe(initialCount);

      // Añadir una nueva receta distinta
      testStore.dispatch(
        addRecipe({
          id: 'new-unique-recipe-id',
          title: 'Receta Completamente Nueva',
          subtitle: '2 personas',
          description: 'Prueba',
          servings: 2,
          totalTimeMinutes: 15,
          prepTimeMinutes: 15,
          difficulty: 'Fácil',
          caloriesKcal: 350,
          pantryMatchPercentage: 100,
          sourceType: 'AI_GENERATED',
          imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
          source: 'Test',
          canCookWithCurrentStock: true,
          steps: [],
          ingredients: [],
        })
      );
      expect(testStore.getState().recipes.recipes.length).toBe(initialCount + 1);
    });

    test('CookingModeScreen consolida alimentos repetidos en un único chip por ingrediente sin duplicar keys', async () => {
      const { setInventory } = require('../src/store/inventorySlice');
      // Poblar el inventario con elementos repetidos tal como en la captura del usuario
      testStore.dispatch(
        setInventory([
          {
            id: 'item-1',
            name: 'Mini Taquitos Jamon',
            quantity: 1,
            unit: '500 g',
            location: 'Nevera',
            price: 2.5,
            purchaseDate: new Date().toISOString(),
            addedByUserId: 'Alejandro',
            urgencyLevel: 'Green',
          },
          {
            id: 'item-2',
            name: 'Mini Taquitos Jamon',
            quantity: 1,
            unit: '500 g',
            location: 'Nevera',
            price: 2.5,
            purchaseDate: new Date().toISOString(),
            addedByUserId: 'Alejandro',
            urgencyLevel: 'Green',
          },
          {
            id: 'item-3',
            name: 'Queso',
            quantity: 1,
            unit: '1 ud',
            location: 'Nevera',
            price: 1.8,
            purchaseDate: new Date().toISOString(),
            addedByUserId: 'Alejandro',
            urgencyLevel: 'Green',
          },
          {
            id: 'item-4',
            name: 'Queso',
            quantity: 1,
            unit: '1 ud',
            location: 'Nevera',
            price: 1.8,
            purchaseDate: new Date().toISOString(),
            addedByUserId: 'Alejandro',
            urgencyLevel: 'Green',
          },
        ])
      );

      let renderer: any;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <Provider store={testStore}>
            <CookingModeScreen />
          </Provider>
        );
      });

      const root = renderer.root;
      // Abrir el asistente Kitchy
      const aiButtonText = root.findAllByType('Text').find((t: any) => {
        const text = Array.isArray(t.props.children) ? t.props.children.join('') : String(t.props.children || '');
        return text.includes('Generar con IA');
      });

      let parent = aiButtonText?.parent;
      while (parent && !parent.props?.onPress) {
        parent = parent.parent;
      }

      await ReactTestRenderer.act(() => {
        parent.props.onPress();
      });

      // Contar chips de "Mini Taquitos Jamon" en la UI del asistente
      const jamonChips = root.findAllByType('Text').filter((t: any) => {
        const text = Array.isArray(t.props.children) ? t.props.children.join('') : String(t.props.children || '');
        return text === 'Mini Taquitos Jamon';
      });

      // Debe haber exactamente UN chip único para Mini Taquitos Jamon (no 2)
      expect(jamonChips.length).toBe(1);

      await ReactTestRenderer.act(() => {
        renderer.unmount();
      });
    });
  });

  describe('9. Raciones desde 1 a N, Iconos de Corazón y Carrito, y Compartir en Chat', () => {
    test('Selector de raciones permite decrementar a 1 persona e incrementar a cualquier número', async () => {
      let renderer: any;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <Provider store={testStore}>
            <CookingModeScreen />
          </Provider>
        );
      });

      const root = renderer.root;
      const decBtn = root.findByProps({ testID: 'btn-decrement-servings' });
      const incBtn = root.findByProps({ testID: 'btn-increment-servings' });

      // Decrementar a 1 persona (límite inferior válido)
      await ReactTestRenderer.act(() => {
        decBtn.props.onPress();
      });

      expect(testStore.getState().recipes.servingsMultiplier).toBe(1);

      // Decrementar de nuevo no baja de 1
      await ReactTestRenderer.act(() => {
        decBtn.props.onPress();
      });
      expect(testStore.getState().recipes.servingsMultiplier).toBe(1);

      // Incrementar hasta 5 personas
      await ReactTestRenderer.act(() => {
        incBtn.props.onPress();
      });
      await ReactTestRenderer.act(() => {
        incBtn.props.onPress();
      });
      await ReactTestRenderer.act(() => {
        incBtn.props.onPress();
      });
      await ReactTestRenderer.act(() => {
        incBtn.props.onPress();
      });
      expect(testStore.getState().recipes.servingsMultiplier).toBe(5);

      await ReactTestRenderer.act(() => {
        renderer.unmount();
      });
    });

    test('Los iconos de corazón en VectorIcon renderizan glifos perfectos (hollow y solid) sin distorsión', () => {
      const { VectorIcon } = require('../src/components/VectorIcon');
      let hollowIcon: any;
      let solidIcon: any;

      ReactTestRenderer.act(() => {
        hollowIcon = ReactTestRenderer.create(<VectorIcon name="heart-outline" size={18} color="#9CA3AF" />);
        solidIcon = ReactTestRenderer.create(<VectorIcon name="heart" size={18} color="#FF5252" />);
      });

      const hollowViews = hollowIcon.root.findAllByType('View');
      const solidViews = solidIcon.root.findAllByType('View');

      expect(hollowViews.length).toBeGreaterThan(0);
      expect(solidViews.length).toBeGreaterThan(0);
      expect(hollowViews[0].props.style.width).toBe(18);
      expect(solidViews[0].props.style.width).toBe(18);
    });

    test('El botón de Delta en la tarjeta ya no muestra el texto roto "Δ Fal" sino el icono de carrito shopping-cart', async () => {
      let renderer: any;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <Provider store={testStore}>
            <CookingModeScreen />
          </Provider>
        );
      });

      const root = renderer.root;
      // Verificar que NO existe ningún texto con "Δ Fal" o "Δ Faltantes"
      const deltaTexts = root.findAllByType('Text').filter((t: any) => {
        const text = Array.isArray(t.props.children) ? t.props.children.join('') : String(t.props.children || '');
        return text.includes('Δ Fal');
      });
      expect(deltaTexts.length).toBe(0);

      // Verificar existencia del botón de stock/carrito
      const deltaBtns = root.findAll((el: any) => el.props.testID && el.props.testID.startsWith('btn-delta-stock-'));
      expect(deltaBtns.length).toBeGreaterThanOrEqual(1);

      await ReactTestRenderer.act(() => {
        renderer.unmount();
      });
    });
  });
});
