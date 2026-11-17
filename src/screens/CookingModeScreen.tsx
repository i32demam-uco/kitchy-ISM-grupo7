import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Colors, Typography } from '../theme';
import { useAppDispatch, useAppSelector } from '../store';
import { setCurrentTab } from '../store/hardwareSlice';
import { setDraftMessage, addMessageOptimistic } from '../store/houseSocialSlice';
import {
  setActiveRecipe,
  setHandsFreeActive,
  setServingsMultiplier,
  setActiveFilter,
  toggleFavorite,
  addRecipe,
  updateRecipe,
  setDeltaModalVisible,
  setDeltaCalculation,
  clearRecipeDetail,
  RecipeFilterType,
} from '../store/recipesSlice';
import { Recipe, RecipeIngredient, RecipeStep } from '../types';
import { HandsFreeCookingScreen } from './HandsFreeCookingScreen';
import { RecipeDeltaModal } from '../components/RecipeDeltaModal';
import { VectorIcon } from '../components/VectorIcon';
import { KitchyAlert } from '../services/kitchyAlert';
import { RecipeService } from '../services/recipeService';
import { SocialCollaborationService } from '../services/socialCollaborationService';
import { HapticFeedback } from '../services/haptics';
import { formatPantryQuantity } from '../utils/quantityFormatter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FILTER_PILLS: Array<{ id: RecipeFilterType; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'available', label: 'Con lo que tengo' },
  { id: 'urgent', label: 'Aprovechar Urgentes' },
  { id: 'favorites', label: 'Favoritas' },
  { id: 'quick', label: 'Rápidas (<20m)' },
];

/**
 * CookingModeScreen - Hub Gastronómico y Orquestador del Modo Cocina Manos Libres.
 * 
 * Funcionalidades Arquitectónicas (ui-ux-architect & realtime-offline-architect):
 * 1. Píldoras de Filtros reactivas (Todas, Con lo que tengo, Urgentes, Favoritas, Rápidas).
 * 2. Generador con IA Gemini resiliente que analiza los alimentos de la despensa y prioriza caducidades.
 * 3. Selector Dinámico de Raciones que recalcula matemáticamente los ingredientes en tiempo real.
 * 4. Botones vectoriales de acción (Favorito, Editar receta completa, Compartir al chat del hogar).
 * 5. Transición fluida a HandsFreeCookingScreen con visor de voz y sensor de proximidad.
 */
export const CookingModeScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const recipesState = useAppSelector((state) => state.recipes);
  const inventoryItems = useAppSelector((state) => state.inventory.items);
  const auth = useAppSelector((state) => state.auth);
  const houseId = auth.activeHouse?.id || 'a0000000-0000-0000-0000-000000000001';

  // Si el modo manos libres está activo, renderizar directamente la vista de cocina
  const isHandsFreeActive = recipesState.isHandsFreeActive;

  // Estados de modales
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedModalVisible, setGeneratedModalVisible] = useState(false);
  const [aiOptions, setAiOptions] = useState<Recipe[]>([]);

  // Estados del Asistente Kitchy
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [selectedPantryIngredients, setSelectedPantryIngredients] = useState<string[]>([]);
  const [cravingInput, setCravingInput] = useState('');

  // Estado del Modal de Detalle Completo de Receta
  const [selectedDetailRecipe, setSelectedDetailRecipe] = useState<Recipe | null>(null);

  // Sincronizar apertura de detalle cuando se solicita explícitamente (ej. desde el chat)
  useEffect(() => {
    if (recipesState.detailModalRecipe) {
      setSelectedDetailRecipe(recipesState.detailModalRecipe);
      dispatch(clearRecipeDetail());
    }
  }, [recipesState.detailModalRecipe, dispatch]);

  // Formulario del editor
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formServings, setFormServings] = useState('2');
  const [formTotalTime, setFormTotalTime] = useState('20');
  const [formDifficulty, setFormDifficulty] = useState<'Fácil' | 'Media' | 'Difícil'>('Media');
  const [formIngredients, setFormIngredients] = useState<RecipeIngredient[]>([]);
  const [formSteps, setFormSteps] = useState<RecipeStep[]>([]);

  // Sincronización inicial con backend
  useEffect(() => {
    const loadRecipes = async () => {
      try {
        const loaded = await RecipeService.getRecipes(houseId);
        if (loaded && loaded.length > 0) {
          // Mantener o fusionar recetas
        }
      } catch {
        // Fallback local
      }
    };
    loadRecipes();
  }, [houseId]);

  // Filtrado de recetas
  const filteredRecipes = useMemo(() => {
    return recipesState.recipes.filter((recipe) => {
      if (recipesState.activeFilter === 'available') {
        return (recipe.pantryMatchPercentage ?? 100) >= 80;
      }
      if (recipesState.activeFilter === 'urgent') {
        return recipe.ingredients.some((i) => i.isExpiringSoon || i.status === 'Prioritario');
      }
      if (recipesState.activeFilter === 'favorites') {
        return recipe.isFavorite === true;
      }
      if (recipesState.activeFilter === 'quick') {
        return (recipe.totalTimeMinutes ?? recipe.prepTimeMinutes ?? 20) <= 20;
      }
      return true;
    });
  }, [recipesState.recipes, recipesState.activeFilter]);

  // Agrupar alimentos de la despensa por nombre normalizado para evitar chips duplicados en el selector
  const uniquePantryIngredients = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        totalQuantity: number;
        unit: string;
        formattedQuantity: string;
        isUrgent: boolean;
      }
    >();

    for (const item of inventoryItems) {
      const normalizedName = (item.name || '').trim();
      if (!normalizedName) continue;
      const key = normalizedName.toLowerCase();
      const isUrgent =
        item.urgencyLevel === 'Red' ||
        item.urgencyLevel === 'Amber' ||
        (item.remainingDays !== undefined && item.remainingDays <= 2);

      const existing = map.get(key);
      if (existing) {
        existing.totalQuantity += Number(item.quantity) || 1;
        if (isUrgent) existing.isUrgent = true;
        existing.formattedQuantity = formatPantryQuantity(
          existing.totalQuantity,
          existing.unit,
          existing.name
        );
      } else {
        const qty = Number(item.quantity) || 1;
        map.set(key, {
          name: normalizedName,
          totalQuantity: qty,
          unit: item.unit || 'ud',
          formattedQuantity: formatPantryQuantity(qty, item.unit, normalizedName),
          isUrgent,
        });
      }
    }

    return Array.from(map.values());
  }, [inventoryItems]);

  // Abrir Bottom Sheet interactivo "Asistente Kitchy"
  const handleOpenAssistant = () => {
    HapticFeedback.impactAsync();
    // Preseleccionar automáticamente alimentos urgentes (<48h) de la despensa si no hay selección previa
    if (selectedPantryIngredients.length === 0) {
      const urgents = uniquePantryIngredients
        .filter((i) => i.isUrgent)
        .map((i) => i.name);
      if (urgents.length > 0) {
        setSelectedPantryIngredients(urgents);
      }
    }
    setIsAssistantOpen(true);
  };

  const handleTogglePantryIngredient = (name: string) => {
    HapticFeedback.selectionAsync();
    setSelectedPantryIngredients((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  // Generador IA con Gemini desde el Asistente Kitchy
  const handleGenerateFromAssistant = async () => {
    HapticFeedback.impactAsync();
    setIsGenerating(true);
    try {
      const options = await RecipeService.generateOptions(houseId, {
        forceUrgentPriority: true,
        forcedIngredients: selectedPantryIngredients.length > 0 ? selectedPantryIngredients : undefined,
        cravingPrompt: cravingInput.trim() || undefined,
        maxOptions: 4,
        pantryItems: inventoryItems,
      });
      setAiOptions(options);
      setIsAssistantOpen(false);
      setGeneratedModalVisible(true);
    } catch {
      KitchyAlert.show('Aviso', 'Se han preparado sugerencias gastronómicas con tu despensa.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Abrir editor para crear nueva receta
  const handleOpenCreateModal = () => {
    HapticFeedback.selectionAsync();
    setEditingRecipe(null);
    setFormTitle('');
    setFormSubtitle('2 personas · Receta casera');
    setFormDescription('');
    setFormServings('2');
    setFormTotalTime('20');
    setFormDifficulty('Media');
    setFormIngredients([
      { name: 'Pechuga de pollo', quantity: 300, unit: 'g' },
      { name: 'Aceite de oliva virgen extra', quantity: 15, unit: 'ml' },
    ]);
    setFormSteps([
      { step: 1, title: 'Preparar ingredientes', text: 'Corta y salpimienta los alimentos.', timeSeconds: 180, tip: 'Usa tabla limpia.' },
      { step: 2, title: 'Cocinar', text: 'Cocina en la sartén a fuego medio.', timeSeconds: 300, tip: 'Comprueba el punto de cocción.' },
    ]);
    setIsEditorModalOpen(true);
  };

  // Abrir editor para modificar receta existente
  const handleOpenEditModal = (recipe: Recipe) => {
    HapticFeedback.selectionAsync();
    setEditingRecipe(recipe);
    setFormTitle(recipe.title);
    setFormSubtitle(recipe.subtitle || `${recipe.servings} personas · Con lo que tienes`);
    setFormDescription(recipe.description || '');
    setFormServings(String(recipe.servings || 2));
    setFormTotalTime(String(recipe.totalTimeMinutes || recipe.prepTimeMinutes || 20));
    setFormDifficulty(recipe.difficulty || 'Media');
    setFormIngredients([...recipe.ingredients]);
    setFormSteps([...recipe.steps]);
    setIsEditorModalOpen(true);
  };

  // Guardar receta en Redux y Backend
  const handleSaveRecipe = async () => {
    if (!formTitle.trim()) {
      KitchyAlert.show('Campo obligatorio', 'Por favor, introduce un título para la receta.');
      return;
    }

    HapticFeedback.impactAsync();
    const servingsNum = parseInt(formServings, 10) || 2;
    const timeNum = parseInt(formTotalTime, 10) || 20;

    if (editingRecipe) {
      // Modificar existente
      const updated: Recipe = {
        ...editingRecipe,
        title: formTitle.trim(),
        subtitle: formSubtitle.trim(),
        description: formDescription.trim(),
        servings: servingsNum,
        totalTimeMinutes: timeNum,
        prepTimeMinutes: timeNum,
        difficulty: formDifficulty,
        ingredients: formIngredients,
        steps: formSteps,
      };

      dispatch(updateRecipe(updated));
      RecipeService.updateRecipe(updated.id, houseId, updated).catch(() => {});
      KitchyAlert.show('Receta actualizada', `"${updated.title}" ha sido modificada correctamente.`);
    } else {
      // Crear nueva
      const created: Recipe = {
        id: `recipe-custom-${Date.now()}`,
        houseId,
        title: formTitle.trim(),
        subtitle: formSubtitle.trim(),
        description: formDescription.trim(),
        servings: servingsNum,
        totalTimeMinutes: timeNum,
        prepTimeMinutes: timeNum,
        difficulty: formDifficulty,
        caloriesKcal: 450,
        pantryMatchPercentage: 100,
        sourceType: 'USER_CREATED',
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
        source: 'UserCustom',
        canCookWithCurrentStock: true,
        isFavorite: false,
        steps: formSteps,
        ingredients: formIngredients,
      };

      dispatch(addRecipe(created));
      RecipeService.createRecipe(houseId, created).catch(() => {});
      KitchyAlert.show('Receta creada', `"${created.title}" se ha añadido a tu recetario.`);
    }

    setIsEditorModalOpen(false);
  };

  // Compartir al chat del hogar: Envía tarjeta interactiva de receta y redirige a HouseSocialScreen
  const handleShareToChat = (recipe: Recipe) => {
    HapticFeedback.selectionAsync();
    const tempId = `temp-recipe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const content = `¡Mirad qué receta propongo cocinar hoy!: "${recipe.title}" (${targetPersons} ${targetPersons === 1 ? 'persona' : 'personas'} · ${recipe.totalTimeMinutes} min)`;
    
    // Inmediato: Despachar a Redux local (Optimistic UI 0 ms)
    dispatch(
      addMessageOptimistic({
        id: tempId,
        houseId,
        senderId: auth.userId || 'aleja',
        senderName: auth.email ? auth.email.split('@')[0] : 'Alejandro Gallardo',
        messageType: 'RECIPE_CARD',
        content,
        recipeData: recipe,
        createdAt: new Date().toISOString(),
        status: 'sending',
      })
    );

    SocialCollaborationService.sendRecipeShareMessage(
      houseId,
      recipe,
      auth.userId || 'aleja',
      auth.email ? auth.email.split('@')[0] : 'Alejandro Gallardo',
      targetPersons
    ).catch(() => {});

    dispatch(setCurrentTab('social'));
  };

  // Iniciar Modo Cocina Manos Libres
  const handleStartHandsFree = (recipe: Recipe) => {
    HapticFeedback.impactAsync();
    dispatch(setActiveRecipe(recipe));
    dispatch(setHandsFreeActive(true));
  };

  // Si está activo el modo manos libres, mostrar visor pixel-perfect
  if (isHandsFreeActive) {
    return <HandsFreeCookingScreen onBack={() => dispatch(setHandsFreeActive(false))} />;
  }

  const targetPersons = recipesState.servingsMultiplier || 2;

  return (
    <View style={styles.container}>
      {/* 1. Header Principal del Hub */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerMainTitle}>Cocinar</Text>
            <Text style={styles.headerSubtitle}>
              Recetas inteligentes con lo que tienes en casa
            </Text>
          </View>

          {/* Selector Dinámico Global de Raciones (de 1 a cualquier número de personas) */}
          <View style={styles.servingsSelector}>
            <TouchableOpacity
              style={styles.servingsButton}
              onPress={() => {
                HapticFeedback.selectionAsync();
                dispatch(setServingsMultiplier(Math.max(1, targetPersons - 1)));
              }}
              activeOpacity={0.7}
              testID="btn-decrement-servings"
            >
              <Text style={styles.servingsButtonText}>-</Text>
            </TouchableOpacity>

            <View style={styles.servingsBadge}>
              <VectorIcon name="people" size={12} color={Colors.primaryGreen} />
              <Text style={styles.servingsBadgeText}>
                {targetPersons} {targetPersons === 1 ? 'persona' : 'pers'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.servingsButton}
              onPress={() => {
                HapticFeedback.selectionAsync();
                dispatch(setServingsMultiplier(targetPersons + 1));
              }}
              activeOpacity={0.7}
              testID="btn-increment-servings"
            >
              <Text style={styles.servingsButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Botones de Acción Destacados: Generar IA y Crear Receta */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.generateAiButton}
            onPress={handleOpenAssistant}
            activeOpacity={0.8}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <>
                <VectorIcon name="sparkles" size={16} color="#000000" />
                <Text style={styles.generateAiButtonText}>Generar con IA (Despensa)</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createRecipeButton}
            onPress={handleOpenCreateModal}
            activeOpacity={0.8}
          >
            <VectorIcon name="add" size={18} color="#FFFFFF" />
            <Text style={styles.createRecipeButtonText}>Crear</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Píldoras de Filtros Culinarios */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsScroll}
        >
          {FILTER_PILLS.map((pill) => {
            const isSelected = recipesState.activeFilter === pill.id;
            return (
              <TouchableOpacity
                key={pill.id}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillSelected,
                ]}
                onPress={() => {
                  HapticFeedback.selectionAsync();
                  dispatch(setActiveFilter(pill.id));
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextSelected,
                  ]}
                >
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Lista de Tarjetas de Recetas */}
      <ScrollView
        style={styles.recipesList}
        contentContainerStyle={styles.recipesListContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredRecipes.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <VectorIcon name="restaurant" size={36} color="#6B7280" />
            <Text style={styles.emptyStateTitle}>No hay recetas con este filtro</Text>
            <Text style={styles.emptyStateSubText}>
              Pulsa "Generar con IA (Despensa)" para obtener recetas automáticas con tus alimentos.
            </Text>
          </View>
        ) : (
          filteredRecipes.map((recipe, rIdx) => {
            const hasUrgent = recipe.ingredients.some(
              (i) => i.isExpiringSoon || i.status === 'Prioritario'
            );
            const matchPercent = recipe.pantryMatchPercentage ?? 100;

            return (
              <View key={`recipe-card-${recipe.id}-${rIdx}`} style={styles.recipeCard}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => {
                    HapticFeedback.selectionAsync();
                    setSelectedDetailRecipe(recipe);
                  }}
                  testID={`recipe-card-clickable-${recipe.id}`}
                  accessibilityLabel={`Ver información de ${recipe.title}`}
                >
                  {/* Imagen del Plato con Badges */}
                <View style={styles.cardImageWrapper}>
                  <Image
                    source={{
                      uri:
                        recipe.imageUrl ||
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
                    }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                  <View style={styles.cardGradientOverlay} />

                  {/* Badges superiores */}
                  <View style={styles.cardTopBadges}>
                    <View
                      style={[
                        styles.matchBadge,
                        matchPercent >= 80 ? styles.matchBadgeGreen : styles.matchBadgeAmber,
                      ]}
                    >
                      <Text style={styles.matchBadgeText}>
                        {matchPercent >= 100 ? '100% disponible' : `${matchPercent}% disponible`}
                      </Text>
                    </View>

                    {hasUrgent && (
                      <View style={styles.urgentBadge}>
                        <VectorIcon name="flame" size={12} color="#FFA000" />
                        <Text style={styles.urgentBadgeText}>Aprovecha caducidad</Text>
                      </View>
                    )}
                  </View>

                  {/* Metadatos inferiores en la imagen */}
                  <View style={styles.cardBottomMeta}>
                    <Text style={styles.cardMetaText}>
                      ⏱ {recipe.totalTimeMinutes || recipe.prepTimeMinutes || 20} min • {recipe.difficulty || 'Media'} • {recipe.caloriesKcal || 450} kcal
                    </Text>
                  </View>
                </View>

                {/* Contenido de la Tarjeta */}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{recipe.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <View style={styles.cardServingsBadge}>
                      <VectorIcon name="users" size={11} color="#00E676" />
                      <Text style={styles.cardServingsBadgeText}>
                        Para {targetPersons} {targetPersons === 1 ? 'persona' : 'personas'}
                      </Text>
                    </View>
                    <Text style={styles.cardSubtitleInline}>
                      {recipe.subtitle?.includes('·') ? `· ${recipe.subtitle.split('·')[1].trim()}` : '· Con lo que tienes'}
                    </Text>
                  </View>

                  {/* Ingredientes Escalados Matemáticamente */}
                  <View style={styles.ingredientsPreviewRow}>
                    {recipe.ingredients.slice(0, 3).map((ing, iIdx) => {
                      const baseServings = recipe.servings || 2;
                      const scale = targetPersons / baseServings;
                      const scaledQty = Math.round((ing.quantity * scale) * 10) / 10;
                      return (
                        <View key={`${ing.name}-${iIdx}`} style={styles.ingredientChip}>
                          <Text style={styles.ingredientChipText}>
                            {ing.name} ({scaledQty} {ing.unit})
                          </Text>
                        </View>
                      );
                    })}
                    {recipe.ingredients.length > 3 && (
                      <View style={styles.ingredientChipMore}>
                        <Text style={styles.ingredientChipMoreText}>
                          +{recipe.ingredients.length - 3} más
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Barra de Acciones: Favorito, Editar, Compartir, Manos Libres */}
                  <View style={styles.cardActionsRow}>
                    <View style={styles.leftActions}>
                      <TouchableOpacity
                        style={styles.iconActionButton}
                        onPress={() => {
                          HapticFeedback.selectionAsync();
                          dispatch(toggleFavorite(recipe.id));
                        }}
                        activeOpacity={0.7}
                        accessibilityLabel="Marcar favorita"
                      >
                        <VectorIcon
                          name={recipe.isFavorite ? 'heart' : 'heart-outline'}
                          size={18}
                          color={recipe.isFavorite ? '#FF5252' : '#9CA3AF'}
                          bgColor="#27272A"
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.iconActionButton}
                        onPress={() => handleOpenEditModal(recipe)}
                        activeOpacity={0.7}
                        accessibilityLabel="Editar receta"
                      >
                        <VectorIcon name="pencil" size={17} color="#9CA3AF" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.iconActionButton}
                        onPress={() => handleShareToChat(recipe)}
                        activeOpacity={0.7}
                        accessibilityLabel="Compartir receta en chat del hogar"
                      >
                        <VectorIcon name="share-social" size={17} color="#9CA3AF" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.iconActionButton}
                        onPress={() => {
                          HapticFeedback.selectionAsync();
                          dispatch(setActiveRecipe(recipe));
                          dispatch(setDeltaModalVisible(true));
                        }}
                        activeOpacity={0.7}
                        accessibilityLabel="Comprobar stock y faltantes de despensa"
                        testID={`btn-delta-stock-${recipe.id}`}
                      >
                        <VectorIcon
                          name="shopping-cart"
                          size={16}
                          color={matchPercent < 100 ? '#FFA000' : '#9CA3AF'}
                        />
                        {matchPercent < 100 && (
                          <View style={styles.missingBadgeDot} />
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Botón Principal: Modo Cocina Manos Libres */}
                    <TouchableOpacity
                      style={styles.handsFreeCtaButton}
                      onPress={() => handleStartHandsFree(recipe)}
                      activeOpacity={0.85}
                    >
                      <VectorIcon name="play" size={14} color="#000000" />
                      <Text style={styles.handsFreeCtaButtonText}>Cocinar Manos Libres</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 4. Modal: Crear / Editar Receta (Glassmorphism #1C1C1E) */}
      <Modal
        visible={isEditorModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditorModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>
                {editingRecipe ? 'Editar Receta' : 'Crear Nueva Receta'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsEditorModalOpen(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Título de la Receta *</Text>
              <TextInput
                style={styles.modalTextInput}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="Ej. Pollo al curry con arroz"
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.inputLabel}>Subtítulo</Text>
              <TextInput
                style={styles.modalTextInput}
                value={formSubtitle}
                onChangeText={setFormSubtitle}
                placeholder="Ej. 2 personas · Fácil y sabroso"
                placeholderTextColor="#6B7280"
              />

              <View style={styles.formRowTwoCol}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Raciones</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    value={formServings}
                    onChangeText={setFormServings}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Tiempo total (min)</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    value={formTotalTime}
                    onChangeText={setFormTotalTime}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Dificultad</Text>
              <View style={styles.difficultyPickerRow}>
                {(['Fácil', 'Media', 'Difícil'] as const).map((diff) => (
                  <TouchableOpacity
                    key={diff}
                    style={[
                      styles.difficultyChip,
                      formDifficulty === diff && styles.difficultyChipSelected,
                    ]}
                    onPress={() => setFormDifficulty(diff)}
                  >
                    <Text
                      style={[
                        styles.difficultyChipText,
                        formDifficulty === diff && styles.difficultyChipTextSelected,
                      ]}
                    >
                      {diff}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Descripción breve</Text>
              <TextInput
                style={[styles.modalTextInput, { height: 70 }]}
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
                placeholder="Explicación apetecible del plato..."
                placeholderTextColor="#6B7280"
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                Ingredientes ({formIngredients.length})
              </Text>
              {formIngredients.map((ing, idx) => (
                <View key={`form-ing-${idx}`} style={styles.ingredientEditRow}>
                  <TextInput
                    style={[styles.modalTextInput, { flex: 2, marginRight: 6 }]}
                    value={ing.name}
                    onChangeText={(txt) => {
                      const updated = [...formIngredients];
                      updated[idx].name = txt;
                      setFormIngredients(updated);
                    }}
                    placeholder="Nombre ingrediente"
                    placeholderTextColor="#6B7280"
                  />
                  <TextInput
                    style={[styles.modalTextInput, { flex: 1, marginRight: 6 }]}
                    value={String(ing.quantity)}
                    onChangeText={(txt) => {
                      const updated = [...formIngredients];
                      updated[idx].quantity = parseFloat(txt) || 0;
                      setFormIngredients(updated);
                    }}
                    keyboardType="numeric"
                    placeholder="Cant."
                    placeholderTextColor="#6B7280"
                  />
                  <TextInput
                    style={[styles.modalTextInput, { flex: 1 }]}
                    value={ing.unit}
                    onChangeText={(txt) => {
                      const updated = [...formIngredients];
                      updated[idx].unit = txt;
                      setFormIngredients(updated);
                    }}
                    placeholder="Unid."
                    placeholderTextColor="#6B7280"
                  />
                </View>
              ))}

              <TouchableOpacity
                style={styles.addItemSmallButton}
                onPress={() => {
                  setFormIngredients([
                    ...formIngredients,
                    { name: 'Nuevo ingrediente', quantity: 100, unit: 'g' },
                  ]);
                }}
              >
                <Text style={styles.addItemSmallButtonText}>+ Añadir ingrediente</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveRecipe}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSaveButtonText}>
                  {editingRecipe ? 'Guardar Cambios' : 'Crear Receta'}
                </Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 4b. Bottom Sheet Interactivo: ASISTENTE KITCHY           */}
      {/* ======================================================== */}
      <Modal
        visible={isAssistantOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAssistantOpen(false)}
      >
        <View style={styles.assistantModalBackdrop}>
          <TouchableOpacity
            style={styles.assistantBackdropDismiss}
            activeOpacity={1}
            onPress={() => setIsAssistantOpen(false)}
          />
          <View style={styles.assistantBottomSheet}>
            {/* Tirador superior */}
            <View style={styles.assistantSheetHandle} />

            {/* Cabecera del Asistente */}
            <View style={styles.assistantHeaderRow}>
              <View style={styles.assistantTitleContainer}>
                <View style={styles.assistantIconCircle}>
                  <VectorIcon name="sparkles" size={18} color="#00E676" />
                </View>
                <View>
                  <Text style={styles.assistantHeaderTitle}>Asistente Kitchy</Text>
                  <Text style={styles.assistantHeaderSubtitle}>
                    Personaliza tu menú inteligente con IA
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setIsAssistantOpen(false)}
                style={styles.assistantCloseCircle}
                accessibilityLabel="Cerrar asistente"
              >
                <VectorIcon name="close" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.assistantSheetScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {/* Sección 1: Barra de Búsqueda / Input de Antojo */}
              <View style={styles.assistantSectionBlock}>
                <Text style={styles.assistantSectionLabel}>¿Qué te apetece comer?</Text>
                <Text style={styles.assistantSectionHelp}>
                  Escribe un antojo o estilo (ej. "Tengo antojo de pasta", "Cena ligera")
                </Text>
                <View style={styles.cravingInputWrapper}>
                  <VectorIcon name="sparkles" size={16} color="#00E676" />
                  <TextInput
                    style={styles.cravingTextInput}
                    placeholder="ej. Tengo antojo de pasta, algo ligero o cremoso..."
                    placeholderTextColor="#6B7280"
                    value={cravingInput}
                    onChangeText={setCravingInput}
                    returnKeyType="done"
                  />
                  {cravingInput.length > 0 && (
                    <TouchableOpacity onPress={() => setCravingInput('')}>
                      <VectorIcon name="close" size={14} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Sección 2: Selecciona tus ingredientes de la Despensa */}
              <View style={styles.assistantSectionBlock}>
                <View style={styles.assistantSectionHeaderRow}>
                  <Text style={styles.assistantSectionLabel}>Selecciona tus ingredientes</Text>
                  <Text style={styles.assistantSelectedCount}>
                    {selectedPantryIngredients.length} seleccionados
                  </Text>
                </View>
                <Text style={styles.assistantSectionHelp}>
                  Toca para seleccionar los alimentos de tu despensa que quieres usar:
                </Text>

                <View style={styles.pantryChipsGrid}>
                  {uniquePantryIngredients.map((ing) => {
                    const isSelected = selectedPantryIngredients.includes(ing.name);

                    return (
                      <TouchableOpacity
                        key={`pantry-chip-${ing.name}`}
                        style={[
                          styles.pantryIngredientChip,
                          ing.isUrgent && styles.pantryIngredientChipUrgent,
                          isSelected && styles.pantryIngredientChipSelected,
                        ]}
                        onPress={() => handleTogglePantryIngredient(ing.name)}
                        activeOpacity={0.75}
                      >
                        {isSelected && (
                          <VectorIcon name="check" size={12} color="#00E676" />
                        )}
                        {ing.isUrgent && !isSelected && (
                          <View style={styles.urgentDotBadge} />
                        )}
                        <Text
                          style={[
                            styles.pantryIngredientChipText,
                            isSelected && styles.pantryIngredientChipTextSelected,
                            ing.isUrgent && !isSelected && styles.pantryIngredientChipTextUrgent,
                          ]}
                          numberOfLines={1}
                        >
                          {ing.name}
                        </Text>
                        <Text style={styles.pantryIngredientChipQty}>
                          ({ing.formattedQuantity})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {uniquePantryIngredients.length === 0 && (
                    <Text style={styles.emptyPantryNotice}>
                      No hay alimentos en la despensa. La IA usará ingredientes básicos.
                    </Text>
                  )}
                </View>
              </View>

              {/* Botón Final: Generar Opciones */}
              <TouchableOpacity
                style={styles.assistantSubmitButton}
                onPress={handleGenerateFromAssistant}
                activeOpacity={0.85}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <ActivityIndicator size="small" color="#000000" />
                    <Text style={styles.assistantSubmitButtonText}>
                      Creando recetas personalizadas...
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <VectorIcon name="sparkles" size={18} color="#000000" />
                    <Text style={styles.assistantSubmitButtonText}>Generar Opciones</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. Modal: Opciones Generadas con IA Gemini */}
      <Modal
        visible={generatedModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGeneratedModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <VectorIcon name="sparkles" size={18} color={Colors.primaryGreen} />
                <Text style={styles.modalHeaderTitle}>Recetas Generadas con IA</Text>
              </View>
              <TouchableOpacity
                onPress={() => setGeneratedModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.aiModalIntroText}>
                Basado en tu despensa real y priorizando alimentos próximos a caducar:
              </Text>

              {aiOptions.map((opt, oIdx) => (
                <View key={`ai-opt-${oIdx}`} style={styles.aiOptionCard}>
                  <Image
                    source={{ uri: opt.imageUrl }}
                    style={styles.aiOptionImage}
                    resizeMode="cover"
                  />
                  <View style={styles.aiOptionInfo}>
                    <Text style={styles.aiOptionTitle}>{opt.title}</Text>
                    <Text style={styles.aiOptionDesc} numberOfLines={2}>
                      {opt.description}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 }}>
                      <View style={styles.cardServingsBadge}>
                        <VectorIcon name="users" size={10} color="#00E676" />
                        <Text style={styles.cardServingsBadgeText}>
                          Para {opt.servings} personas
                        </Text>
                      </View>
                      <Text style={styles.aiOptionMeta}>
                        ⏱ {opt.totalTimeMinutes} min • {opt.ingredients.length} ing.
                      </Text>
                    </View>

                    <View style={styles.aiOptionActions}>
                      <TouchableOpacity
                        style={styles.aiOptionCookButton}
                        onPress={() => {
                          setGeneratedModalVisible(false);
                          handleStartHandsFree(opt);
                        }}
                      >
                        <VectorIcon name="play" size={12} color="#000000" />
                        <Text style={styles.aiOptionCookButtonText}>Cocinar ahora</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.aiOptionSaveButton}
                        onPress={() => {
                          dispatch(addRecipe(opt));
                          RecipeService.createRecipe(houseId, opt).catch(() => {});
                          KitchyAlert.show('Guardada', `"${opt.title}" se ha añadido a tu recetario.`);
                        }}
                      >
                        <Text style={styles.aiOptionSaveButtonText}>Guardar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 6. Modal: Detalle Completo e Información de la Receta */}
      <Modal
        visible={!!selectedDetailRecipe}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDetailRecipe(null)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalSheet}>
            {selectedDetailRecipe && (
              <>
                {/* Hero Header con Imagen */}
                <View style={styles.detailHeroImageWrapper}>
                  <Image
                    source={{
                      uri:
                        selectedDetailRecipe.imageUrl ||
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
                    }}
                    style={styles.detailHeroImage}
                    resizeMode="cover"
                  />
                  <View style={styles.detailHeroOverlay} />

                  <TouchableOpacity
                    style={styles.detailCloseButton}
                    onPress={() => setSelectedDetailRecipe(null)}
                    activeOpacity={0.8}
                    testID="btn-close-recipe-detail"
                    accessibilityLabel="Cerrar detalle de receta"
                  >
                    <VectorIcon name="close" size={18} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={styles.detailHeroBadges}>
                    <View
                      style={[
                        styles.matchBadge,
                        (selectedDetailRecipe.pantryMatchPercentage ?? 100) >= 80
                          ? styles.matchBadgeGreen
                          : styles.matchBadgeAmber,
                      ]}
                    >
                      <Text style={styles.matchBadgeText}>
                        {(selectedDetailRecipe.pantryMatchPercentage ?? 100) >= 100
                          ? '100% disponible'
                          : `${selectedDetailRecipe.pantryMatchPercentage}% disponible`}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Contenido Scrollable */}
                <ScrollView
                  style={styles.detailScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.detailTitle}>{selectedDetailRecipe.title}</Text>
                  {selectedDetailRecipe.subtitle ? (
                    <Text style={styles.detailSubtitle}>
                      {selectedDetailRecipe.subtitle}
                    </Text>
                  ) : null}

                  {/* Fila de Métricas */}
                  <View style={styles.detailStatsRow}>
                    <View style={styles.detailStatBox}>
                      <VectorIcon name="users" size={15} color="#00E676" />
                      <Text style={styles.detailStatVal}>
                        {targetPersons} {targetPersons === 1 ? 'persona' : 'personas'}
                      </Text>
                    </View>
                    <View style={styles.detailStatBox}>
                      <VectorIcon name="clock" size={15} color="#FFA000" />
                      <Text style={styles.detailStatVal}>
                        {selectedDetailRecipe.totalTimeMinutes || 20} min
                      </Text>
                    </View>
                    <View style={styles.detailStatBox}>
                      <VectorIcon name="flame" size={15} color="#FF5252" />
                      <Text style={styles.detailStatVal}>
                        {selectedDetailRecipe.caloriesKcal || 450} kcal
                      </Text>
                    </View>
                    <View style={styles.detailStatBox}>
                      <Text style={styles.detailStatVal}>
                        {selectedDetailRecipe.difficulty || 'Media'}
                      </Text>
                    </View>
                  </View>

                  {/* Sección Ingredientes */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>
                      Ingredientes necesarios ({targetPersons} {targetPersons === 1 ? 'persona' : 'personas'})
                    </Text>
                    <View style={styles.detailIngredientsList}>
                      {selectedDetailRecipe.ingredients.map((ing, idx) => {
                        const baseServings = selectedDetailRecipe.servings || 2;
                        const scale = targetPersons / baseServings;
                        const scaledQty = Math.round(ing.quantity * scale * 10) / 10;
                        const isAvailable = ing.status !== 'Faltante';
                        return (
                          <View
                            key={`detail-ing-${idx}`}
                            style={styles.detailIngredientItem}
                          >
                            <View style={styles.detailIngDot} />
                            <Text style={styles.detailIngName}>{ing.name}</Text>
                            <Text style={styles.detailIngQty}>
                              {scaledQty} {ing.unit}
                            </Text>
                            <View
                              style={[
                                styles.detailIngBadge,
                                isAvailable
                                  ? styles.detailIngBadgeAvailable
                                  : styles.detailIngBadgeMissing,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.detailIngBadgeText,
                                  isAvailable
                                    ? styles.detailIngBadgeTextAvail
                                    : styles.detailIngBadgeTextMiss,
                                ]}
                              >
                                {isAvailable ? 'Disponible' : 'Faltante'}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* Sección Pasos de Elaboración */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>
                      Pasos de preparación ({selectedDetailRecipe.steps.length} pasos)
                    </Text>
                    {selectedDetailRecipe.steps.map((st, sIdx) => (
                      <View key={`detail-step-${sIdx}`} style={styles.detailStepItem}>
                        <View style={styles.detailStepNumberBox}>
                          <Text style={styles.detailStepNumberText}>{st.step}</Text>
                        </View>
                        <View style={styles.detailStepTextBox}>
                          <Text style={styles.detailStepTitle}>{st.title}</Text>
                          <Text style={styles.detailStepText}>{st.text}</Text>
                          {st.timeSeconds && st.timeSeconds > 0 ? (
                            <View style={styles.detailStepTimerBadge}>
                              <VectorIcon name="timer" size={12} color="#FFA000" />
                              <Text style={styles.detailStepTimerText}>
                                {Math.floor(st.timeSeconds / 60)}:{(st.timeSeconds % 60).toString().padStart(2, '0')} min
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Botonera de Acciones dentro del Detalle */}
                  <View style={styles.detailActionsContainer}>
                    <TouchableOpacity
                      style={styles.detailPrimaryCookBtn}
                      onPress={() => {
                        setSelectedDetailRecipe(null);
                        handleStartHandsFree(selectedDetailRecipe);
                      }}
                      activeOpacity={0.85}
                      testID="btn-cook-from-detail"
                    >
                      <VectorIcon name="restaurant" size={18} color="#000000" />
                      <Text style={styles.detailPrimaryCookBtnText}>
                        Cocinar Manos Libres
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.detailSecondaryRow}>
                      <TouchableOpacity
                        style={styles.detailSecondaryBtn}
                        onPress={() => {
                          const r = selectedDetailRecipe;
                          setSelectedDetailRecipe(null);
                          handleShareToChat(r);
                        }}
                        activeOpacity={0.8}
                      >
                        <VectorIcon name="share-social" size={16} color="#FFFFFF" />
                        <Text style={styles.detailSecondaryBtnText}>Compartir en Chat</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.detailSecondaryBtn}
                        onPress={() => {
                          const r = selectedDetailRecipe;
                          setSelectedDetailRecipe(null);
                          handleOpenEditModal(r);
                        }}
                        activeOpacity={0.8}
                      >
                        <VectorIcon name="pencil" size={16} color="#FFFFFF" />
                        <Text style={styles.detailSecondaryBtnText}>Editar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ height: 40 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Conciliación Delta */}
      <RecipeDeltaModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0C',
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#0A0A0C',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerMainTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    fontFamily: Typography.family,
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '400',
    fontFamily: Typography.family,
    marginTop: 2,
  },
  servingsSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    gap: 4,
  },
  servingsButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  servingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  servingsBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Typography.family,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  generateAiButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E676',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  generateAiButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Typography.family,
  },
  createRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 6,
  },
  createRecipeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Typography.family,
  },
  filterPillsScroll: {
    gap: 8,
    paddingBottom: 6,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  filterPillSelected: {
    backgroundColor: '#162921',
    borderColor: '#00E676',
  },
  filterPillText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Typography.family,
  },
  filterPillTextSelected: {
    color: '#00E676',
  },
  recipesList: {
    flex: 1,
  },
  recipesListContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  emptyStateCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Typography.family,
    marginTop: 12,
  },
  emptyStateSubText: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    fontFamily: Typography.family,
    lineHeight: 18,
  },
  recipeCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  cardImageWrapper: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#27272A',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  cardTopBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  matchBadgeGreen: {
    backgroundColor: 'rgba(0, 230, 118, 0.9)',
  },
  matchBadgeAmber: {
    backgroundColor: 'rgba(255, 160, 0, 0.9)',
  },
  matchBadgeText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Typography.family,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 160, 0, 0.5)',
  },
  urgentBadgeText: {
    color: '#FFA000',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Typography.family,
  },
  cardBottomMeta: {
    position: 'absolute',
    bottom: 10,
    left: 12,
  },
  cardMetaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Typography.family,
  },
  cardBody: {
    padding: 16,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Typography.family,
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Typography.family,
    marginBottom: 12,
  },
  ingredientsPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  ingredientChip: {
    backgroundColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ingredientChipText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Typography.family,
  },
  ingredientChipMore: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ingredientChipMoreText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Typography.family,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  missingBadgeDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFA000',
  },
  deltaButtonText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  handsFreeCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00E676',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  handsFreeCtaButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Typography.family,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Typography.family,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBody: {
    flexGrow: 0,
  },
  inputLabel: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Typography.family,
    marginBottom: 6,
  },
  modalTextInput: {
    backgroundColor: '#27272A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.family,
    marginBottom: 12,
  },
  formRowTwoCol: {
    flexDirection: 'row',
  },
  difficultyPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  difficultyChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#27272A',
    alignItems: 'center',
  },
  difficultyChipSelected: {
    backgroundColor: '#162921',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  difficultyChipText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  difficultyChipTextSelected: {
    color: '#00E676',
  },
  ingredientEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addItemSmallButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#27272A',
    borderRadius: 8,
    marginBottom: 18,
  },
  addItemSmallButtonText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '600',
  },
  modalSaveButton: {
    backgroundColor: '#00E676',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  modalSaveButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Typography.family,
  },
  aiModalIntroText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  aiOptionCard: {
    flexDirection: 'row',
    backgroundColor: '#27272A',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
  },
  aiOptionImage: {
    width: 90,
    height: '100%',
  },
  aiOptionInfo: {
    flex: 1,
    padding: 12,
  },
  aiOptionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Typography.family,
    marginBottom: 4,
  },
  aiOptionDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  aiOptionMeta: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 10,
  },
  aiOptionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  aiOptionCookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00E676',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  aiOptionCookButtonText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
  },
  aiOptionSaveButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  aiOptionSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  cardServingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#162921',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cardServingsBadgeText: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Typography.family,
  },
  cardSubtitleInline: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Typography.family,
  },
  assistantModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  assistantBackdropDismiss: {
    flex: 1,
  },
  assistantBottomSheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '88%',
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  assistantSheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#3F3F46',
    alignSelf: 'center',
    marginBottom: 16,
  },
  assistantHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  assistantTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assistantIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#162921',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Typography.family,
  },
  assistantHeaderSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: Typography.family,
    marginTop: 2,
  },
  assistantCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantSheetScroll: {
    maxHeight: 520,
  },
  assistantSectionBlock: {
    marginBottom: 20,
  },
  assistantSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assistantSectionLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Typography.family,
    marginBottom: 4,
  },
  assistantSelectedCount: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Typography.family,
  },
  assistantSectionHelp: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
    fontFamily: Typography.family,
  },
  cravingInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26262B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    gap: 10,
  },
  cravingTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.family,
    paddingVertical: 12,
  },
  pantryChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pantryIngredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#26262B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pantryIngredientChipUrgent: {
    borderColor: 'rgba(255, 160, 0, 0.4)',
    backgroundColor: 'rgba(255, 160, 0, 0.08)',
  },
  pantryIngredientChipSelected: {
    backgroundColor: '#162921',
    borderColor: '#00E676',
  },
  urgentDotBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFA000',
  },
  pantryIngredientChipText: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Typography.family,
    maxWidth: 160,
  },
  pantryIngredientChipTextSelected: {
    color: '#00E676',
    fontWeight: '700',
  },
  pantryIngredientChipTextUrgent: {
    color: '#FFB74D',
  },
  pantryIngredientChipQty: {
    color: '#9CA3AF',
    fontSize: 11,
    fontFamily: Typography.family,
  },
  emptyPantryNotice: {
    color: '#6B7280',
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  assistantSubmitButton: {
    backgroundColor: '#00E676',
    borderRadius: 16,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 8,
  },
  assistantSubmitButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Typography.family,
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  detailModalSheet: {
    backgroundColor: '#161618',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: '#2A2A2E',
    overflow: 'hidden',
  },
  detailHeroImageWrapper: {
    width: '100%',
    height: 220,
    position: 'relative',
    backgroundColor: '#27272A',
  },
  detailHeroImage: {
    width: '100%',
    height: '100%',
  },
  detailHeroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  detailCloseButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeroBadges: {
    position: 'absolute',
    bottom: 12,
    left: 16,
  },
  detailScrollContent: {
    padding: 18,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Typography.family,
    lineHeight: 28,
  },
  detailSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily: Typography.family,
    marginTop: 4,
  },
  detailStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E22',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C30',
  },
  detailStatBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailStatVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E5E7EB',
    fontFamily: Typography.family,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Typography.family,
    marginBottom: 10,
  },
  detailIngredientsList: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  detailIngredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailIngDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
    marginRight: 8,
  },
  detailIngName: {
    flex: 1,
    fontSize: 13,
    color: '#F3F4F6',
    fontFamily: Typography.family,
    fontWeight: '500',
  },
  detailIngQty: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: Typography.family,
    marginRight: 10,
  },
  detailIngBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  detailIngBadgeAvailable: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
  },
  detailIngBadgeMissing: {
    backgroundColor: 'rgba(255, 160, 0, 0.15)',
  },
  detailIngBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Typography.family,
  },
  detailIngBadgeTextAvail: {
    color: '#00E676',
  },
  detailIngBadgeTextMiss: {
    color: '#FFA000',
  },
  detailStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  detailStepNumberBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  detailStepNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  detailStepTextBox: {
    flex: 1,
    gap: 4,
  },
  detailStepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Typography.family,
  },
  detailStepText: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
    fontFamily: Typography.family,
  },
  detailStepTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 160, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  detailStepTimerText: {
    fontSize: 11,
    color: '#FFA000',
    fontWeight: '600',
    fontFamily: Typography.family,
  },
  detailActionsContainer: {
    gap: 10,
    marginTop: 6,
  },
  detailPrimaryCookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E676',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  detailPrimaryCookBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Typography.family,
  },
  detailSecondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#27272A',
    paddingVertical: 12,
    borderRadius: 12,
  },
  detailSecondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Typography.family,
  },
});
