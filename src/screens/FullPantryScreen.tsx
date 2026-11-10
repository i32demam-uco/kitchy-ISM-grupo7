import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Colors, Typography } from '../theme';
import { useAppDispatch, useAppSelector } from '../store';
import { setCurrentTab } from '../store/hardwareSlice';
import {
  updateInventoryItemQuantity,
  updateInventoryItemDetails,
  removeInventoryItem,
} from '../store/inventorySlice';
import { addShoppingItem } from '../store/shoppingListSlice';
import { groupInventoryByCategory, determineCategory } from '../utils/inventoryGrouping';
import { VectorIcon } from '../components/VectorIcon';
import { SwipeablePantryRow } from '../components/SwipeablePantryRow';
import { ProductDetailSheet } from '../components/ProductDetailSheet';
import { ProductDepletedModal } from '../components/ProductDepletedModal';
import { KitchyApiClient } from '../services/kitchyApi';
import { HapticFeedback } from '../services/haptics';
import { InventoryItem, ShoppingItem } from '../types';

const PANTRY_FILTER_CHIPS = [
  'Todos',
  'Urgente',
  'Carne',
  'Pescado',
  'Lácteos y Huevos',
  'Frutas y Verduras',
  'Despensa y Conservas',
  'Limpieza y Hogar',
] as const;

/**
 * FullPantryScreen - Vista Completa de Despensa Agrupada por Categorías.
 * 
 * Principios Arquitectónicos:
 * 1. UI/UX Architect: Tipografía Poppins para cabeceras de categorías y tarjetas Glassmorphic (#1C1C1E).
 * 2. Cero Emojis: Fotorrealismo puro en miniaturas y señalética vectorial.
 * 3. Categorización Inteligente: Agrupación determinista por taxonomía de supermercado española (Carne, Pescado, Lácteos...).
 * 4. Ficha Bottom Sheet y Fitts Law: Botones grandes [ - ] [ + ] con Haptic Feedback y Long Press para pesos.
 * 5. Consumo Rápido y Auto-Lista: Deslizar a la izquierda (-1) y smart prompt al llegar a 0.
 * 6. Chips de Filtrado Interactivo: Barra horizontal para filtrar con un solo toque.
 */
export const FullPantryScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeHouse = useAppSelector((state) => state.auth.activeHouse);
  const inventoryItems = useAppSelector((state) => state.inventory.items);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [depletedItem, setDepletedItem] = useState<InventoryItem | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Filtrado reactivo en vivo por texto y categoría de chips
  const filteredItems = useMemo(() => {
    let items = inventoryItems;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query)
      );
    }

    if (selectedCategory === 'Todos') return items;

    if (selectedCategory === 'Urgente') {
      return items.filter((i) => i.urgencyLevel === 'Red' || i.urgencyLevel === 'Amber');
    }

    return items.filter((item) => {
      const cat = item.category || determineCategory(item);
      if (selectedCategory === 'Carne') return cat === 'Carne';
      if (selectedCategory === 'Pescado') return cat === 'Pescado';
      if (selectedCategory === 'Lácteos y Huevos') return cat === 'Lácteos y Huevos' || cat === 'Lácteos';
      if (selectedCategory === 'Frutas y Verduras') return cat === 'Frutas y Verduras';
      if (selectedCategory === 'Despensa y Conservas') return cat === 'Despensa y Conservas' || cat === 'Conservas';
      if (selectedCategory === 'Limpieza y Hogar') return cat === 'Limpieza y Hogar';
      return cat === selectedCategory;
    });
  }, [inventoryItems, searchQuery, selectedCategory]);

  // Agrupamiento por categorías utilizando la función pura testeada
  const categoryGroups = useMemo(() => {
    return groupInventoryByCategory(filteredItems);
  }, [filteredItems]);

  const urgentCount = useMemo(() => {
    return inventoryItems.filter((i) => i.urgencyLevel === 'Red' || i.urgencyLevel === 'Amber').length;
  }, [inventoryItems]);

  const showFeedback = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => {
      setStatusFeedback(null);
    }, 2800);
  };

  // Manejador: Pulsación para abrir Ficha de Producto (Bottom Sheet)
  const handlePressItem = (item: InventoryItem) => {
    HapticFeedback.selectionAsync();
    setSelectedItem(item);
  };

  // Manejador: Consumo Rápido desde gesto deslizante (-1 unidad)
  const handleQuickConsume = (item: InventoryItem) => {
    if (item.quantity <= 1) {
      // Si baja a 0 -> Flujo de Alimento Agotado
      setDepletedItem(item);
    } else {
      dispatch(updateInventoryItemQuantity({ id: item.id, delta: -1 }));
      showFeedback(`Consumida 1 ud de ${item.name}`);
      if (activeHouse?.id) {
        KitchyApiClient.updateInventoryItem(activeHouse.id, item.id, {
          quantity: item.quantity - 1,
        });
      }
    }
  };

  // Manejador: Actualizar cantidad desde la ficha modal
  const handleUpdateQuantity = (item: InventoryItem, newQuantity: number) => {
    dispatch(updateInventoryItemQuantity({ id: item.id, quantity: newQuantity }));
    if (selectedItem && selectedItem.id === item.id) {
      setSelectedItem({ ...selectedItem, quantity: newQuantity });
    }
    if (activeHouse?.id) {
      KitchyApiClient.updateInventoryItem(activeHouse.id, item.id, {
        quantity: newQuantity,
      });
    }
  };

  // Manejador: Actualizar fecha de caducidad desde el DatePicker
  const handleUpdateExpiration = (item: InventoryItem, newDate: string) => {
    dispatch(updateInventoryItemDetails({ id: item.id, changes: { expirationDate: newDate } }));
    if (selectedItem && selectedItem.id === item.id) {
      setSelectedItem({ ...selectedItem, expirationDate: newDate });
    }
    showFeedback(`Fecha actualizada para ${item.name}`);
    if (activeHouse?.id) {
      KitchyApiClient.updateInventoryItem(activeHouse.id, item.id, {
        expirationDate: newDate,
      });
    }
  };

  // Manejador: Producto Agotado (activado desde ficha o swipe)
  const handleDepleted = (item: InventoryItem) => {
    setDepletedItem(item);
  };

  // Manejador Smart Prompt: Aceptar añadir a la lista de la compra
  const handleConfirmAddToList = (item: InventoryItem) => {
    // 1. Eliminar de la despensa
    dispatch(removeInventoryItem(item.id));

    // 2. Insertar en la lista colaborativa de la compra
    const newShoppingItem: ShoppingItem = {
      id: `shop-${Date.now()}`,
      houseId: activeHouse?.id || item.houseId,
      name: item.name,
      quantity: 1,
      unit: item.unit || 'ud',
      isChecked: false,
      source: 'Manual',
      addedByUserId: 'Alejandro',
      createdAt: new Date().toISOString(),
      category: item.category || determineCategory(item),
      imageUrl: item.imageUrl,
    };
    dispatch(addShoppingItem(newShoppingItem));

    // 3. Sincronizar en segundo plano con el backend
    if (activeHouse?.id) {
      KitchyApiClient.deleteInventoryItem(activeHouse.id, item.id);
    }

    setDepletedItem(null);
    showFeedback(`«${item.name}» añadido a la Lista de la Compra`);
  };

  // Manejador Smart Prompt: Descartar (solo eliminar del inventario)
  const handleDismissDepleted = () => {
    if (depletedItem) {
      dispatch(removeInventoryItem(depletedItem.id));
      if (activeHouse?.id) {
        KitchyApiClient.deleteInventoryItem(activeHouse.id, depletedItem.id);
      }
      showFeedback(`«${depletedItem.name}» eliminado de la despensa`);
    }
    setDepletedItem(null);
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Superior de Navegación */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => dispatch(setCurrentTab('home'))}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.titleCenter}>
          <Text style={styles.screenTitle}>Despensa Completa</Text>
          <Text style={styles.screenSubtitle}>
            {activeHouse?.name || 'Piso Ciudad Jardín'} • {inventoryItems.length} alimentos
          </Text>
        </View>

        <TouchableOpacity
          style={styles.scanShortcutBtn}
          onPress={() => dispatch(setCurrentTab('scan'))}
          activeOpacity={0.7}
        >
          <VectorIcon name="camera" size={17} color="#00E676" />
        </TouchableOpacity>
      </View>

      {/* Banner de Feedback Efímero */}
      {statusFeedback && (
        <View style={styles.feedbackBanner}>
          <View style={styles.feedbackDot} />
          <Text style={styles.feedbackText}>{statusFeedback}</Text>
        </View>
      )}

      {/* 2. Buscador en Tiempo Real */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar alimentos en la despensa..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearSearchBtn}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Barra Horizontal con Chips de Filtrado Interactivo */}
      <View style={styles.filterChipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScroll}
        >
          {PANTRY_FILTER_CHIPS.map((chip) => {
            const isSelected = selectedCategory === chip;
            return (
              <TouchableOpacity
                key={chip}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipActive,
                ]}
                onPress={() => {
                  HapticFeedback.selectionAsync();
                  setSelectedCategory(chip);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {chip}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. Resumen Rápido (Chips de Estado) */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryChip}>
          <View style={[styles.statusDot, { backgroundColor: Colors.primaryGreen }]} />
          <Text style={styles.summaryChipText}>{inventoryItems.length} en total</Text>
        </View>
        <View style={styles.summaryChip}>
          <View style={[styles.statusDot, { backgroundColor: Colors.urgencyRed }]} />
          <Text style={styles.summaryChipText}>{urgentCount} urgentes</Text>
        </View>
        <View style={styles.summaryChip}>
          <Text style={styles.summaryChipText}>{categoryGroups.length} categorías</Text>
        </View>
      </View>

      {/* 4. Lista Agrupada por Categorías */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {categoryGroups.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <Text style={styles.emptyStateTitle}>No se encontraron alimentos</Text>
            <Text style={styles.emptyStateSubtitle}>
              Intenta con otro término de búsqueda o escanea un nuevo ticket.
            </Text>
          </View>
        ) : (
          categoryGroups.map((group) => (
            <View key={group.category} style={styles.categorySection}>
              {/* Cabecera de Categoría (Tipografía Poppins, cero emojis) */}
              <View style={styles.categoryHeaderRow}>
                <Text style={styles.categoryTitle}>{group.category}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {group.items.length} {group.items.length === 1 ? 'alimento' : 'alimentos'}
                  </Text>
                </View>
              </View>

              {/* Tarjeta Glassmorphic con los Alimentos de la Categoría */}
              <View style={styles.categoryCard}>
                {group.items.map((item, index) => {
                  const isLast = index === group.items.length - 1;

                  return (
                    <SwipeablePantryRow
                      key={`${item.id}-${index}`}
                      item={item}
                      isLast={isLast}
                      onPress={handlePressItem}
                      onQuickConsume={handleQuickConsume}
                    />
                  );
                })}
              </View>
            </View>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Ficha de Producto en Bottom Sheet Modal */}
      <ProductDetailSheet
        visible={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdateQuantity={handleUpdateQuantity}
        onUpdateExpiration={handleUpdateExpiration}
        onDepleted={handleDepleted}
      />

      {/* Smart Prompt: Modal Elegante al Agotar Producto */}
      <ProductDepletedModal
        visible={!!depletedItem}
        item={depletedItem}
        onDismiss={handleDismissDepleted}
        onConfirmAddToList={handleConfirmAddToList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B0E',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  titleCenter: {
    alignItems: 'center',
  },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontFamily: Typography.heading,
  },
  screenSubtitle: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
    fontFamily: Typography.bodyMedium,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1C1C22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scanShortcutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1C1C22',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 10,
    backgroundColor: '#16161A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    paddingVertical: 10,
  },
  clearSearchBtn: {
    padding: 6,
  },
  clearSearchText: {
    color: '#6B7280',
    fontSize: 12,
  },
  filterChipsWrapper: {
    marginBottom: 10,
  },
  filterChipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: Colors.primaryGreen,
    borderColor: Colors.primaryGreen,
  },
  filterChipText: {
    fontFamily: Typography.body,
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  filterChipTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 8,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C22',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  summaryChipText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '500',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    fontFamily: Typography.heading,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryBadgeText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  categoryCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
  },
  pantryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  pantryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  pantryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  trafficDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 10,
  },
  dotRed: {
    backgroundColor: Colors.urgencyRed,
  },
  dotAmber: {
    backgroundColor: Colors.urgencyAmber,
  },
  dotGreen: {
    backgroundColor: Colors.primaryGreen,
  },
  pantryFoodImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2A2A30',
    marginRight: 12,
  },
  pantryDetails: {
    flex: 1,
  },
  pantryItemName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pantrySubText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  expiryBadgeRow: {
    marginTop: 3,
  },
  expiryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  expiryRed: {
    color: Colors.urgencyRed,
  },
  expiryAmber: {
    color: Colors.urgencyAmber,
  },
  expiryGreen: {
    color: '#10B981',
  },
  pantryRightCol: {
    alignItems: 'flex-end',
  },
  quantityBadge: {
    backgroundColor: '#2A2A32',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quantityText: {
    color: '#E5E7EB',
    fontSize: 11,
    fontWeight: '600',
  },
  priceText: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 3,
  },
  emptyStateBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 20,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  feedbackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryGreen,
    marginRight: 8,
  },
  feedbackText: {
    fontFamily: Typography.body,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryGreen,
  },
});
