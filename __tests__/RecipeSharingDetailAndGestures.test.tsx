import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { recipesSlice, setActiveRecipe, setHandsFreeActive } from '../src/store/recipesSlice';
import { hardwareSlice, setCurrentTab } from '../src/store/hardwareSlice';
import { houseSocialSlice, addMessageOptimistic } from '../src/store/houseSocialSlice';
import { authSlice } from '../src/store/authSlice';
import { inventorySlice } from '../src/store/inventorySlice';
import { shoppingListSlice } from '../src/store/shoppingListSlice';
import { CookingModeScreen } from '../src/screens/CookingModeScreen';
import { HouseSocialScreen } from '../src/screens/HouseSocialScreen';
import { HandsFreeCookingScreen } from '../src/screens/HandsFreeCookingScreen';
import { VectorIcon } from '../src/components/VectorIcon';
import { Recipe } from '../src/types';

jest.mock('../src/services/recipeService', () => ({
  RecipeService: {
    getRecipes: jest.fn().mockResolvedValue([]),
    completeCooking: jest.fn().mockResolvedValue(true),
    createRecipe: jest.fn().mockResolvedValue({ id: 'rec-test-1', title: 'Test' }),
  },
}));

jest.mock('../src/services/speechSynthesisService', () => ({
  SpeechSynthesisService: {
    speak: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('../src/services/kitchyAlert', () => ({
  KitchyAlert: {
    show: jest.fn(),
  },
}));

const mockRecipe: Recipe = {
  id: 'recipe-test-card-1',
  title: 'Tortilla de patatas casera',
  subtitle: 'Tradición española · Para 4 personas',
  description: 'Clásica tortilla de patatas con cebolla caramelizada.',
  servings: 4,
  prepTimeMinutes: 10,
  totalTimeMinutes: 25,
  difficulty: 'Fácil',
  caloriesKcal: 380,
  pantryMatchPercentage: 100,
  imageUrl: 'https://images.unsplash.com/photo-1613564834361-9436948817d1?w=600',
  source: 'Test',
  sourceType: 'SYSTEM_PRESET',
  canCookWithCurrentStock: true,
  isFavorite: false,
  ingredients: [
    { name: 'Huevos', quantity: 6, unit: 'ud', status: 'Disponible' },
    { name: 'Patatas', quantity: 800, unit: 'g', status: 'Disponible' },
  ],
  steps: [
    { step: 1, title: 'Cortar patatas', text: 'Pela y corta las patatas en láminas finas.', timeSeconds: 300 },
    { step: 2, title: 'Freír', text: 'Fríe las patatas a fuego medio hasta que estén tiernas.', timeSeconds: 600 },
    { step: 3, title: 'Cuajar', text: 'Bate los huevos y cuaja la tortilla en la sartén.', timeSeconds: 300 },
  ],
};

function createTestStore() {
  const preloaded: any = {
    recipes: {
      recipes: [mockRecipe],
      activeRecipe: mockRecipe,
      isHandsFreeActive: false,
      currentStepIndex: 0,
      servingsMultiplier: 1,
      activeFilter: 'all',
      isTimerRunning: false,
      timerSecondsRemaining: 300,
      missingIngredientsForDelta: [],
      deltaModalVisible: false,
    },
    hardware: {
      isProximityActive: true,
      currentTab: 'cook',
      isCameraOpen: false,
      isNfcReading: false,
      lastScannedTicket: null,
    },
    houseSocial: {
      activeHouseId: 'house-1',
      messages: [],
      members: [
        {
          userId: 'aleja',
          fullName: 'Alejandro Gallardo',
          email: 'aleja@uco.es',
          role: 'Admin',
          isOnline: true,
          joinedAt: new Date().toISOString(),
        },
      ],
      onlinePresences: {},
      isSyncing: false,
      error: null,
      lastReadTimestamps: {},
      draftMessage: '',
    },
    auth: {
      token: 'mock-token',
      isAuthenticated: true,
      userId: 'aleja',
      fullName: 'Alejandro Gallardo',
      email: 'aleja@uco.es',
      activeHouse: {
        id: 'house-1',
        name: 'Piso Ciudad Jardín',
        address: 'Calle Damasco 4',
        role: 'ADMIN',
        memberCount: 3,
        isDefault: true,
        inviteCode: 'DAMASCO4',
      },
      availableHouses: [],
      membersInActiveHouse: [],
    },
  };

  return configureStore({
    reducer: {
      recipes: recipesSlice.reducer,
      hardware: hardwareSlice.reducer,
      houseSocial: houseSocialSlice.reducer,
      auth: authSlice.reducer,
      inventory: inventorySlice.reducer,
      shoppingList: shoppingListSlice.reducer,
    },
    preloadedState: preloaded,
  } as any);
}

describe('Pruebas de Detalle de Receta, Compartición en Chat y Gestos/Sensor', () => {
  it('1. VectorIcon: Icono de corazón se renderiza con overflow visible sin truncamiento ni recortes', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<VectorIcon name="heart" size={18} color="#FF5252" />);
    });

    const root = renderer!.root;
    const view = root.findByType('View' as any);
    expect(view.props.style.overflow).toBe('visible');

    let outlineRenderer: ReactTestRenderer.ReactTestRenderer | null = null;
    ReactTestRenderer.act(() => {
      outlineRenderer = ReactTestRenderer.create(<VectorIcon name="heart-outline" size={18} color="#9CA3AF" />);
    });
    const outlineRoot = outlineRenderer!.root;
    const outlineView = outlineRoot.findByType('View' as any);
    expect(outlineView.props.style.overflow).toBe('visible');
  });

  it('2. CookingModeScreen: Tocar una receta abre el modal con información detallada e ingredientes escalados', async () => {
    const store = createTestStore();
    let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <CookingModeScreen />
        </Provider>
      );
    });

    const root = renderer!.root;

    // Buscar el elemento clickeable de la tarjeta de receta
    const cardTouchable = root.findByProps({ testID: `recipe-card-clickable-${mockRecipe.id}` });
    expect(cardTouchable).toBeTruthy();

    // Simular pulsación en la tarjeta
    await ReactTestRenderer.act(async () => {
      cardTouchable.props.onPress();
    });

    // Debe mostrarse el modal con la información completa de la receta
    const closeBtn = root.findByProps({ testID: 'btn-close-recipe-detail' });
    expect(closeBtn).toBeTruthy();

    const cookFromDetailBtn = root.findByProps({ testID: 'btn-cook-from-detail' });
    expect(cookFromDetailBtn).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });
  });

  it('3. CookingModeScreen: Compartir receta envía una tarjeta interactiva RECIPE_CARD al chat del hogar', async () => {
    const store = createTestStore();
    let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <CookingModeScreen />
        </Provider>
      );
    });

    const root = renderer!.root;
    const shareBtn = root.findByProps({ accessibilityLabel: 'Compartir receta en chat del hogar' });
    expect(shareBtn).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      shareBtn.props.onPress();
    });

    // Se redirige a la pestaña de chat social
    expect(store.getState().hardware.currentTab).toBe('social');

    // Debe haber un mensaje con recipeData en el chat
    const messages = store.getState().houseSocial.messages;
    const sharedRecipeMsg = messages.find((m: any) => m.recipeData?.id === mockRecipe.id);
    expect(sharedRecipeMsg).toBeTruthy();
    expect(sharedRecipeMsg!.recipeData!.title).toBe(mockRecipe.title);

    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });
  });

  it('4. HouseSocialScreen: Muestra tarjeta interactiva de receta con botón "Ver Receta y Cocinar" que redirige a Cocinar', async () => {
    const store = createTestStore();

    // Añadir mensaje con recipeData al store
    store.dispatch(
      addMessageOptimistic({
        id: 'msg-shared-recipe-1',
        houseId: 'house-1',
        senderId: 'aleja',
        senderName: 'Alejandro Gallardo',
        messageType: 'RECIPE_CARD',
        content: '¡Mirad qué receta propongo cocinar hoy!',
        recipeData: mockRecipe,
        createdAt: new Date().toISOString(),
        status: 'sent',
      })
    );

    let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <HouseSocialScreen />
        </Provider>
      );
    });

    const root = renderer!.root;
    const recipeCardInChat = root.findByProps({ testID: `chat-recipe-card-${mockRecipe.id}` });
    expect(recipeCardInChat).toBeTruthy();

    const cookBtnInChat = root.findByProps({ testID: `btn-cook-shared-recipe-${mockRecipe.id}` });
    expect(cookBtnInChat).toBeTruthy();

    // Simular clic en "Ver Receta y Cocinar"
    await ReactTestRenderer.act(async () => {
      cookBtnInChat.props.onPress();
    });

    // Debe cambiar a la pestaña 'cook' y activar la receta
    expect(store.getState().hardware.currentTab).toBe('cook');
    expect(store.getState().recipes.activeRecipe?.id).toBe(mockRecipe.id);

    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });
  });

  it('5. HandsFreeCookingScreen: Barra de sensores y gestos de barrido (izq/dcha) operativos', async () => {
    const store = createTestStore();
    store.dispatch(setActiveRecipe(mockRecipe));
    store.dispatch(setHandsFreeActive(true));

    let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <HandsFreeCookingScreen />
        </Provider>
      );
    });

    const root = renderer!.root;

    // Verificar presencia de botones de sensor y barrido
    const advanceBtn = root.findByProps({ accessibilityLabel: 'Siguiente paso por sensor frontal o barrido' });
    expect(advanceBtn).toBeTruthy();

    const prevGestureBtn = root.findByProps({ accessibilityLabel: 'Paso anterior por gesto' });
    expect(prevGestureBtn).toBeTruthy();

    // Avanzar de paso mediante el sensor
    expect(store.getState().recipes.currentStepIndex).toBe(0);
    await ReactTestRenderer.act(async () => {
      advanceBtn.props.onPress();
    });
    expect(store.getState().recipes.currentStepIndex).toBe(1);

    // Esperar debounce del sensor de proximidad (600ms)
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 650));

    // Retroceder de paso mediante el gesto/sensor
    await ReactTestRenderer.act(async () => {
      prevGestureBtn.props.onPress();
    });
    expect(store.getState().recipes.currentStepIndex).toBe(0);

    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });
  });

  it('6. CookingModeScreen: Pulsar el corazón de favorito alterna el estado sin abrir el modal de especificación', async () => {
    const store = createTestStore();
    let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <CookingModeScreen />
        </Provider>
      );
    });

    const root = renderer!.root;
    const favoriteBtn = root.findByProps({ accessibilityLabel: 'Marcar favorita' });
    expect(favoriteBtn).toBeTruthy();

    expect(store.getState().recipes.recipes[0].isFavorite).toBe(false);

    // Pulsar el botón de favorito
    await ReactTestRenderer.act(async () => {
      favoriteBtn.props.onPress();
    });

    // El estado de favorito debe haberse alternado a true
    expect(store.getState().recipes.recipes[0].isFavorite).toBe(true);

    // El modal de especificación/detalle NO debe abrirse
    const closeDetailBtns = root.findAllByProps({ testID: 'btn-close-recipe-detail' });
    expect(closeDetailBtns.length).toBe(0);

    // Volver a pulsar para desmarcar favorito
    await ReactTestRenderer.act(async () => {
      favoriteBtn.props.onPress();
    });

    // El estado de favorito debe volver a false
    expect(store.getState().recipes.recipes[0].isFavorite).toBe(false);

    // El modal de especificación/detalle SIGUE cerrado
    const closeDetailBtns2 = root.findAllByProps({ testID: 'btn-close-recipe-detail' });
    expect(closeDetailBtns2.length).toBe(0);

    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });
  });
});
