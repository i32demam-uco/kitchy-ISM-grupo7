import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Recipe, RecipeDeltaCalculation } from '../types';

const defaultRecipe: Recipe = {
  id: 'd0000000-0000-0000-0000-000000000001',
  houseId: 'a0000000-0000-0000-0000-000000000001',
  title: 'Pollo con tomate y huevo',
  description: '2 personas • Con lo que tienes en casa',
  servings: 2,
  prepTimeMinutes: 20,
  imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
  source: 'KitchySystem',
  canCookWithCurrentStock: true,
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
    { name: 'Pechuga de pollo', quantity: 500, unit: 'g' },
    { name: 'Tomate frito Hacendado', quantity: 390, unit: 'g' },
    { name: 'Huevos L', quantity: 2, unit: 'ud.' },
    { name: 'Aceite de oliva virgen extra', quantity: 15, unit: 'ml' },
  ],
};

interface RecipesState {
  recipes: Recipe[];
  activeRecipe: Recipe;
  currentStepIndex: number; // 0-indexed (step 3 is index 2)
  isTimerRunning: boolean;
  timerSecondsRemaining: number;
  deltaCalculation: RecipeDeltaCalculation | null;
  isDeltaModalVisible: boolean;
}

const initialState: RecipesState = {
  recipes: [defaultRecipe],
  activeRecipe: defaultRecipe,
  currentStepIndex: 2, // Step 3 in Figma
  isTimerRunning: false,
  timerSecondsRemaining: 480, // 08:00 in Figma
  deltaCalculation: null,
  isDeltaModalVisible: false,
};

export const recipesSlice = createSlice({
  name: 'recipes',
  initialState,
  reducers: {
    setActiveRecipe: (state, action: PayloadAction<Recipe>) => {
      state.activeRecipe = action.payload;
      state.currentStepIndex = 0;
      state.timerSecondsRemaining = action.payload.steps[0]?.timeSeconds || 300;
      state.isTimerRunning = false;
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
    setDeltaCalculation: (state, action: PayloadAction<RecipeDeltaCalculation | null>) => {
      state.deltaCalculation = action.payload;
    },
    setDeltaModalVisible: (state, action: PayloadAction<boolean>) => {
      state.isDeltaModalVisible = action.payload;
    },
  },
});

export const {
  setActiveRecipe,
  nextStep,
  prevStep,
  toggleTimer,
  decrementTimer,
  resetTimer,
  setDeltaCalculation,
  setDeltaModalVisible,
} = recipesSlice.actions;

export default recipesSlice.reducer;

