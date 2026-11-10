export type UrgencyLevel = 'Red' | 'Amber' | 'Green';

export interface House {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  inviteCode: string;
  joinCode?: string;
  memberCount: number;
}

export const PRODUCT_CATEGORIES = [
  'Todos',
  'Urgente',
  'Carne',
  'Pescado',
  'Lácteos y Huevos',
  'Frutas y Verduras',
  'Despensa y Conservas',
  'Limpieza y Hogar',
  'Otros',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface InventoryItem {
  id: string;
  houseId: string;
  masterProductId?: string;
  name: string;
  quantity: number;
  unit: string;
  expirationDate: string; // ISO string
  location: string; // 'Nevera' | 'Despensa' | 'Congelador'
  price: number;
  purchaseDate: string;
  addedByUserId: string;
  urgencyLevel: UrgencyLevel;
  remainingDays: number;
  category?: string;
  imageUrl?: string;
}

export interface ShoppingItem {
  id: string;
  houseId: string;
  masterProductId?: string;
  name: string;
  quantity: number;
  unit: string;
  isChecked: boolean;
  source: 'Manual' | 'Voice' | 'OCR' | 'RecipeDelta' | 'Barcode';
  addedByUserId: string;
  assignedToUserId?: string;
  createdAt: string;
  category?: string;
  imageUrl?: string;
}

export interface RecipeStep {
  step: number;
  title: string;
  text: string;
  timeSeconds: number;
  tip?: string;
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  houseId?: string;
  title: string;
  description?: string;
  steps: RecipeStep[];
  ingredients: RecipeIngredient[];
  servings: number;
  prepTimeMinutes: number;
  imageUrl?: string;
  source: string;
  canCookWithCurrentStock: boolean;
}

export interface MissingIngredient {
  name: string;
  requiredQuantity: number;
  availableQuantity: number;
  deficitQuantity: number;
  unit: string;
  isMissing: boolean;
}

export interface RecipeDeltaCalculation {
  recipeId: string;
  recipeTitle: string;
  canCookNow: boolean;
  totalIngredientsCount: number;
  missingIngredientsCount: number;
  ingredients: MissingIngredient[];
}

export interface DetectedProduct {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  estimatedExpiration?: string;
  category: string;
  imageUrl?: string;
  barcode?: string;
}

export interface OcrTicketResult {
  storeName: string;
  ticketDate: string;
  totalAmount: number;
  detectedProducts: DetectedProduct[];
}

export type RootTab = 'home' | 'list' | 'scan' | 'cook' | 'houses' | 'profile' | 'pantry';

