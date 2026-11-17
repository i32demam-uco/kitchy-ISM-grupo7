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
  isUrgent?: boolean;
  urgentModeSource?: 'NONE' | 'MANUAL' | 'AUTO_LOW_STOCK';
  urgentUpdatedAt?: string | null;
}

export const PRODUCT_CATEGORIES = [
  'Todos',
  'Urgente',
  'Carne',
  'Pescado',
  'Lácteos y Huevos',
  'Frutas y Verduras',
  'Bebidas',
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
  hasUserSetExpiration?: boolean;
  expirationConfirmed?: boolean;
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
  status?: 'Disponible' | 'Prioritario' | 'Faltante';
  availableQuantity?: number;
  deficitQuantity?: number;
  isExpiringSoon?: boolean;
}

export interface Recipe {
  id: string;
  houseId?: string;
  title: string;
  subtitle?: string;
  description?: string;
  steps: RecipeStep[];
  ingredients: RecipeIngredient[];
  servings: number;
  totalTimeMinutes?: number;
  prepTimeMinutes: number;
  difficulty?: 'Fácil' | 'Media' | 'Difícil';
  caloriesKcal?: number;
  pantryMatchPercentage?: number;
  sourceType?: 'AI_GENERATED' | 'USER_CREATED' | 'SYSTEM_PRESET';
  imageUrl?: string;
  source: string;
  canCookWithCurrentStock: boolean;
  isFavorite?: boolean;
  createdBy?: string;
}

export interface MissingIngredient {
  name: string;
  requiredQuantity: number;
  availableQuantity: number;
  deficitQuantity: number;
  unit: string;
  isMissing: boolean;
  status?: 'Disponible' | 'Prioritario' | 'Faltante';
  isExpiringSoon?: boolean;
}

export interface RecipeDeltaCalculation {
  recipeId: string;
  recipeTitle: string;
  canCookNow: boolean;
  totalIngredientsCount: number;
  missingIngredientsCount: number;
  ingredients: MissingIngredient[];
  pantryMatchPercentage?: number;
  urgentIngredientsCount?: number;
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

export type RootTab = 'home' | 'list' | 'scan' | 'cook' | 'houses' | 'profile' | 'pantry' | 'social';

export interface HouseMember {
  userId: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
  role: string;
  isOnline: boolean;
  joinedAt: string;
  birthDate?: string;
  bio?: string;
}

export interface ActionProductItem {
  productName: string;
  quantity: number;
  unit: string;
  imageUrl?: string;
}

export type SystemActionCategory = 'CONSUMED' | 'SCANNED_TICKET' | 'ADDED_MANUAL' | 'COOKED_RECIPE' | 'SHARED_RECIPE';

export interface HouseMessageActionMetadata {
  actionType: SystemActionCategory;
  performedBy: string;
  performedByName: string;
  affectedProducts: ActionProductItem[];
  stockRemaining?: number;
  totalAdded?: number;
  storeName?: string;
}

export type HouseMessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'SYSTEM_ACTION' | 'RECIPE_CARD';

export interface HouseMessage {
  id: string;
  houseId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  messageType: HouseMessageType;
  content: string;
  mediaUrl?: string;
  mediaThumbnailUrl?: string;
  actionMetadata?: HouseMessageActionMetadata;
  recipeData?: Recipe;
  replyToMessage?: {
    id: string;
    senderName: string;
    content: string;
  };
  createdAt: string;
  status?: 'sending' | 'sent' | 'error';
}

export interface InventoryDelta {
  action: 'CONSUMED' | 'ADDED' | 'DELETED' | 'UPDATED' | 'DISCARDED';
  itemId: string;
  itemName: string;
  newQuantity: number;
  quantityDelta: number;
  unit: string;
  performedByUserId: string;
  imageUrl?: string;
}


