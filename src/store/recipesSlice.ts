import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Recipe, RecipeDeltaCalculation } from '../types';

export type RecipeFilterType = 'all' | 'available' | 'urgent' | 'favorites' | 'quick';

export const DEFAULT_RECIPE: Recipe = {
  id: 'd0000000-0000-0000-0000-000000000001',
  houseId: 'a0000000-0000-0000-0000-000000000001',
  title: 'Pollo con tomate y huevo',
  subtitle: '2 personas · Con lo que tienes en casa',
  description: 'Receta rápida y proteica perfecta para aprovechar la pechuga de pollo y huevos a punto de caducar.',
  servings: 2,
  totalTimeMinutes: 20,
  prepTimeMinutes: 20,
  difficulty: 'Fácil',
  caloriesKcal: 480,
  pantryMatchPercentage: 100,
  sourceType: 'AI_GENERATED',
  imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
  source: 'KitchySystem',
  canCookWithCurrentStock: true,
  isFavorite: false,
  steps: [
    {
      step: 1,
      title: 'Cortar el pollo',
      text: 'Corta los 500 g de pechuga de pollo en tiras o dados medianos y salpimienta al gusto.',
      timeSeconds: 180,
      tip: 'Usa una tabla limpia exclusiva para carnes.',
    },
    {
      step: 2,
      title: 'Dorar el pollo',
      text: 'Pon una sartén a fuego medio-alto con un chorrito de aceite y dora el pollo durante 5 minutos.',
      timeSeconds: 300,
      tip: 'No muevas el pollo los dos primeros minutos para que dore bien.',
    },
    {
      step: 3,
      title: 'Añade el tomate y baja el fuego',
      text: 'Vierte 390 g de tomate frito sobre el pollo dorado. Remueve y cocina a fuego suave durante 8 minutos.',
      timeSeconds: 480,
      tip: 'El pollo debe alcanzar 74 °C en el centro.',
    },
    {
      step: 4,
      title: 'Cascar los huevos',
      text: 'Haz dos huecos en la salsa de tomate y casca los dos huevos directamente. Tapa la sartén.',
      timeSeconds: 240,
      tip: 'Cocina a fuego lento hasta que la clara cuaje y la yema quede líquida.',
    },
    {
      step: 5,
      title: 'Emplatar y servir',
      text: 'Retira del fuego con cuidado, espolvorea un poco de orégano o perejil picado y sirve caliente.',
      timeSeconds: 60,
      tip: 'Acompaña con pan tostado o arroz blanco.',
    },
  ],
  ingredients: [
    { name: 'Pechuga de pollo', quantity: 500, unit: 'g', status: 'Prioritario', availableQuantity: 500, isExpiringSoon: true },
    { name: 'Tomate frito Hacendado', quantity: 390, unit: 'g', status: 'Disponible', availableQuantity: 400, isExpiringSoon: false },
    { name: 'Huevos L', quantity: 2, unit: 'ud', status: 'Prioritario', availableQuantity: 6, isExpiringSoon: true },
    { name: 'Aceite de oliva virgen extra', quantity: 15, unit: 'ml', status: 'Disponible', availableQuantity: 500, isExpiringSoon: false },
  ],
};

export const INITIAL_RECIPES: Recipe[] = [
  DEFAULT_RECIPE,
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    houseId: 'a0000000-0000-0000-0000-000000000001',
    title: 'Tortilla cremosa con queso',
    subtitle: '2 personas · Con lo que tienes en casa',
    description: 'Tortilla jugosa en 10 minutos con huevos frescos y queso fundido.',
    servings: 2,
    totalTimeMinutes: 10,
    prepTimeMinutes: 10,
    difficulty: 'Fácil',
    caloriesKcal: 380,
    pantryMatchPercentage: 100,
    sourceType: 'AI_GENERATED',
    imageUrl: 'https://images.unsplash.com/photo-1613564834361-9436948817d1?w=600',
    source: 'KitchySystem',
    canCookWithCurrentStock: true,
    isFavorite: true,
    steps: [
      { step: 1, title: 'Batir los huevos', text: 'Bate 4 huevos en un cuenco amplio con una pizca de sal.', timeSeconds: 120, tip: 'Batir con garbo para que quede esponjosa.' },
      { step: 2, title: 'Calentar la sartén', text: 'Pon la sartén a fuego medio con unas gotas de aceite.', timeSeconds: 120, tip: 'Que no humee el aceite.' },
      { step: 3, title: 'Cuajar y rellenar', text: 'Vierte los huevos batidos y añade el queso en el centro.', timeSeconds: 180, tip: 'Fuego suave para no quemar el fondo.' },
      { step: 4, title: 'Servir caliente', text: 'Desliza al plato con cuidado.', timeSeconds: 60, tip: 'Disfruta recién hecha.' },
    ],
    ingredients: [
      { name: 'Huevos L', quantity: 4, unit: 'ud', status: 'Prioritario', availableQuantity: 6, isExpiringSoon: true },
      { name: 'Queso curado', quantity: 60, unit: 'g', status: 'Disponible', availableQuantity: 200, isExpiringSoon: false },
      { name: 'Aceite de oliva virgen extra', quantity: 10, unit: 'ml', status: 'Disponible', availableQuantity: 500, isExpiringSoon: false },
    ],
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    houseId: 'a0000000-0000-0000-0000-000000000001',
    title: 'Arroz a la cubana tradicional',
    subtitle: '2 personas · Con lo que tienes en casa',
    description: 'Clásico plato reconfortante de arroz blanco, salsa de tomate y huevo a la plancha.',
    servings: 2,
    totalTimeMinutes: 18,
    prepTimeMinutes: 18,
    difficulty: 'Fácil',
    caloriesKcal: 520,
    pantryMatchPercentage: 100,
    sourceType: 'AI_GENERATED',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600',
    source: 'KitchySystem',
    canCookWithCurrentStock: true,
    isFavorite: false,
    steps: [
      { step: 1, title: 'Hervir el arroz', text: 'Cuece 160 g de arroz blanco en agua con sal durante 12 minutos.', timeSeconds: 720, tip: 'Escurre bien al terminar.' },
      { step: 2, title: 'Calentar el tomate', text: 'Calienta 200 g de salsa de tomate frito a fuego suave.', timeSeconds: 240, tip: 'Tapa para no manchar.' },
      { step: 3, title: 'Freír los huevos', text: 'Cocina los huevos con puntilla crujiente.', timeSeconds: 180, tip: 'Yema bien líquida para mojar.' },
      { step: 4, title: 'Montar el plato', text: 'Coloca el arroz, la salsa de tomate y el huevo encima.', timeSeconds: 60, tip: 'Listo para comer.' },
    ],
    ingredients: [
      { name: 'Arroz redondo', quantity: 160, unit: 'g', status: 'Disponible', availableQuantity: 1000, isExpiringSoon: false },
      { name: 'Tomate frito Hacendado', quantity: 200, unit: 'g', status: 'Disponible', availableQuantity: 400, isExpiringSoon: false },
      { name: 'Huevos L', quantity: 2, unit: 'ud', status: 'Prioritario', availableQuantity: 6, isExpiringSoon: true },
    ],
  },
];

interface RecipesState {
  recipes: Recipe[];
  activeRecipe: Recipe;
  currentStepIndex: number; // 0-indexed (step 3 is index 2)
  isTimerRunning: boolean;
  timerSecondsRemaining: number;
  deltaCalculation: RecipeDeltaCalculation | null;
  isDeltaModalVisible: boolean;
  isHandsFreeActive: boolean;
  servingsMultiplier: number;
  activeFilter: RecipeFilterType;
  generatedOptions: Recipe[];
  isGeneratingOptions: boolean;
  detailModalRecipe?: Recipe | null;
}

const initialState: RecipesState = {
  recipes: INITIAL_RECIPES,
  activeRecipe: DEFAULT_RECIPE,
  currentStepIndex: 2, // Step 3 in Figma/Screenshot
  isTimerRunning: false,
  timerSecondsRemaining: 480, // 08:00 in Figma/Screenshot
  deltaCalculation: null,
  isDeltaModalVisible: false,
  isHandsFreeActive: false,
  servingsMultiplier: 1,
  activeFilter: 'all',
  generatedOptions: [],
  isGeneratingOptions: false,
  detailModalRecipe: null,
};

export const recipesSlice = createSlice({
  name: 'recipes',
  initialState,
  reducers: {
    setRecipes: (state, action: PayloadAction<Recipe[]>) => {
      state.recipes = action.payload;
    },
    addRecipe: (state, action: PayloadAction<Recipe>) => {
      // Prevención de duplicados por ID o por título idéntico
      const existingIndex = state.recipes.findIndex(
        (r) => r.id === action.payload.id || r.title.trim().toLowerCase() === action.payload.title.trim().toLowerCase()
      );
      if (existingIndex !== -1) {
        // Actualizar receta existente conservando su ID
        state.recipes[existingIndex] = {
          ...action.payload,
          id: state.recipes[existingIndex].id,
        };
      } else {
        const uniqueRecipe = {
          ...action.payload,
          id: action.payload.id || `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        };
        state.recipes.unshift(uniqueRecipe);
      }
    },
    updateRecipe: (state, action: PayloadAction<Recipe>) => {
      const idx = state.recipes.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1) {
        state.recipes[idx] = action.payload;
      }
      if (state.activeRecipe.id === action.payload.id) {
        state.activeRecipe = action.payload;
      }
    },
    deleteRecipe: (state, action: PayloadAction<string>) => {
      state.recipes = state.recipes.filter((r) => r.id !== action.payload);
    },
    toggleFavorite: (state, action: PayloadAction<string>) => {
      const rec = state.recipes.find((r) => r.id === action.payload);
      if (rec) {
        rec.isFavorite = !rec.isFavorite;
      }
      if (state.activeRecipe.id === action.payload) {
        state.activeRecipe.isFavorite = !state.activeRecipe.isFavorite;
      }
    },
    setActiveRecipe: (state, action: PayloadAction<Recipe>) => {
      state.activeRecipe = action.payload;
      state.currentStepIndex = 0;
      state.timerSecondsRemaining = action.payload.steps[0]?.timeSeconds || 300;
      state.isTimerRunning = false;
      state.servingsMultiplier = 1;
    },
    setHandsFreeActive: (state, action: PayloadAction<boolean>) => {
      state.isHandsFreeActive = action.payload;
      if (action.payload) {
        // Al entrar al modo manos libres, inicializar el timer del paso actual
        const currentStep = state.activeRecipe.steps[state.currentStepIndex];
        if (currentStep) {
          state.timerSecondsRemaining = currentStep.timeSeconds || 300;
        }
      }
    },
    setServingsMultiplier: (state, action: PayloadAction<number>) => {
      state.servingsMultiplier = Math.max(1, action.payload);
    },
    setActiveFilter: (state, action: PayloadAction<RecipeFilterType>) => {
      state.activeFilter = action.payload;
    },
    setGeneratedOptions: (state, action: PayloadAction<Recipe[]>) => {
      state.generatedOptions = action.payload;
    },
    setIsGeneratingOptions: (state, action: PayloadAction<boolean>) => {
      state.isGeneratingOptions = action.payload;
    },
    nextStep: (state) => {
      if (state.currentStepIndex < state.activeRecipe.steps.length - 1) {
        state.currentStepIndex += 1;
        state.timerSecondsRemaining = state.activeRecipe.steps[state.currentStepIndex].timeSeconds;
        state.isTimerRunning = false;
      }
    },
    prevStep: (state) => {
      if (state.currentStepIndex > 0) {
        state.currentStepIndex -= 1;
        state.timerSecondsRemaining = state.activeRecipe.steps[state.currentStepIndex].timeSeconds;
        state.isTimerRunning = false;
      }
    },
    goToStep: (state, action: PayloadAction<number>) => {
      if (action.payload >= 0 && action.payload < state.activeRecipe.steps.length) {
        state.currentStepIndex = action.payload;
        state.timerSecondsRemaining = state.activeRecipe.steps[action.payload].timeSeconds;
        state.isTimerRunning = false;
      }
    },
    toggleTimer: (state) => {
      state.isTimerRunning = !state.isTimerRunning;
    },
    decrementTimer: (state) => {
      if (state.timerSecondsRemaining > 0) {
        state.timerSecondsRemaining -= 1;
      } else {
        state.isTimerRunning = false;
      }
    },
    resetTimer: (state) => {
      state.timerSecondsRemaining = state.activeRecipe.steps[state.currentStepIndex]?.timeSeconds || 300;
      state.isTimerRunning = false;
    },
    setTimerSecondsRemaining: (state, action: PayloadAction<number>) => {
      state.timerSecondsRemaining = action.payload;
    },
    setDeltaCalculation: (state, action: PayloadAction<RecipeDeltaCalculation | null>) => {
      state.deltaCalculation = action.payload;
    },
    setDeltaModalVisible: (state, action: PayloadAction<boolean>) => {
      state.isDeltaModalVisible = action.payload;
    },
    openRecipeDetail: (state, action: PayloadAction<Recipe>) => {
      state.detailModalRecipe = action.payload;
    },
    clearRecipeDetail: (state) => {
      state.detailModalRecipe = null;
    },
  },
});

export const {
  setRecipes,
  addRecipe,
  updateRecipe,
  deleteRecipe,
  toggleFavorite,
  setActiveRecipe,
  openRecipeDetail,
  clearRecipeDetail,
  setHandsFreeActive,
  setServingsMultiplier,
  setActiveFilter,
  setGeneratedOptions,
  setIsGeneratingOptions,
  nextStep,
  prevStep,
  goToStep,
  toggleTimer,
  decrementTimer,
  resetTimer,
  setTimerSecondsRemaining,
  setDeltaCalculation,
  setDeltaModalVisible,
} = recipesSlice.actions;

export default recipesSlice.reducer;
