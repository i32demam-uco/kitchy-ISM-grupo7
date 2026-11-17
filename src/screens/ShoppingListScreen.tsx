import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import {
  addShoppingItem,
  toggleCheckItem,
  removeShoppingItem,
  clearCheckedItems,
  toggleUrgencyManual,
} from '../store/shoppingListSlice';
import { ShoppingItem } from '../types';
import { KitchyAlert } from '../services/kitchyAlert';
import { determineCategory } from '../utils/inventoryGrouping';
import { HapticFeedback } from '../services/haptics';
import { VectorIcon } from '../components/VectorIcon';
import { GeofenceShoppingService } from '../services/geofenceShoppingService';
import { ApiService } from '../services/api';

const FILTER_CHIPS = [
  'Todos',
  'Urgente',
  'Carne',
  'Pescado',
  'Lácteos y Huevos',
  'Frutas y Verduras',
  'Despensa y Conservas',
  'Limpieza y Hogar',
] as const;

export const ShoppingListScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const shoppingItems = useAppSelector((state) => state.shoppingList.items);
  const activeHouse = useAppSelector((state) => state.auth.activeHouse);
  const isUrgent = useAppSelector((state) => state.shoppingList.isUrgent);
  const urgentModeSource = useAppSelector((state) => state.shoppingList.urgentModeSource);
  const focusTrigger = useAppSelector((state) => state.hardware.focusShoppingInputTrigger);
  const inputRef = useRef<any>(null);
  const [newItemName, setNewItemName] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('Todos');
  const [isSimulating, setIsSimulating] = useState(false);

  // Monitorización GPS reactiva: Zero-Battery Rule (solo activa si isUrgent === true)
  useEffect(() => {
    const pendingCount = shoppingItems.filter((i) => !i.isChecked).length;
    GeofenceShoppingService.syncMonitoringState(isUrgent, pendingCount, dispatch);

    return () => {
      GeofenceShoppingService.stopMonitoring();
    };
  }, [isUrgent, shoppingItems, dispatch]);

  // Enfoque automático al llegar mediante redirección NFC o atajo
  useEffect(() => {
    if (focusTrigger > 0) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [focusTrigger]);


  // Filtrado instantáneo local con memoización
  const filteredShoppingItems = useMemo(() => {
    if (selectedFilter === 'Todos') return shoppingItems;

    if (selectedFilter === 'Urgente') {
      return shoppingItems.filter(
        (i) =>
          i.source === 'RecipeDelta' ||
          i.name.toLowerCase().includes('pollo') ||
          i.name.toLowerCase().includes('leche') ||
          i.name.toLowerCase().includes('huevo')
      );
    }

    return shoppingItems.filter((item) => {
      const cat = item.category || determineCategory({ name: item.name });
      if (selectedFilter === 'Carne') return cat === 'Carne';
      if (selectedFilter === 'Pescado') return cat === 'Pescado';
      if (selectedFilter === 'Lácteos y Huevos') return cat === 'Lácteos y Huevos';
      if (selectedFilter === 'Frutas y Verduras') return cat === 'Frutas y Verduras';
      if (selectedFilter === 'Despensa y Conservas') return cat === 'Despensa y Conservas';
      if (selectedFilter === 'Limpieza y Hogar') return cat === 'Limpieza y Hogar';
      return cat === selectedFilter;
    });
  }, [shoppingItems, selectedFilter]);

  const activeItems = filteredShoppingItems.filter((i) => !i.isChecked);
  const completedItems = filteredShoppingItems.filter((i) => i.isChecked);

  const handleFilterSelect = (filter: string) => {
    HapticFeedback.selectionAsync();
    setSelectedFilter(filter);
  };

  const handleAddItem = (customName?: string) => {
    const name = (typeof customName === 'string' && customName !== 'Manual' ? customName : newItemName).trim();
    if (!name) return;

    const newItem: ShoppingItem = {
      id: `shop-${Date.now()}`,
      houseId: activeHouse.id,
      name,
      quantity: 1,
      unit: 'ud',
      isChecked: false,
      source: 'Manual',
      addedByUserId: auth.fullName || 'Alejandro',
      createdAt: new Date().toISOString(),
      category: determineCategory({ name }),
    };

    dispatch(addShoppingItem(newItem));
    setNewItemName('');
    HapticFeedback.selectionAsync();
  };

  const handleToggleUrgency = () => {
    HapticFeedback.selectionAsync();
    const nextUrgent = !isUrgent;
    dispatch(toggleUrgencyManual());
    if (activeHouse?.id) {
      ApiService.updateShoppingListUrgency(activeHouse.id, nextUrgent).catch(() => { });
    }
  };

  const handleSimulateGeofence = async () => {
    HapticFeedback.selectionAsync();
    setIsSimulating(true);
    try {
      const res = await GeofenceShoppingService.simulateNearOpenSupermarket(
        dispatch,
        activeItems.length,
        { forceTrigger: true }
      );
      if (!res.triggered) {
        KitchyAlert.show('Simulación de Geocerca', res.message);
      }
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Lista de la Compra</Text>
          <View style={styles.subRow}>
            <Text style={styles.subtitle}>Colaborativa en {activeHouse.name}</Text>
            <View style={styles.signalrBadge}>
              <View style={styles.signalrDot} />
              <Text style={styles.signalrText}>SignalR Activo</Text>
            </View>
          </View>
        </View>

        {completedItems.length > 0 && (
          <TouchableOpacity
            onPress={() => dispatch(clearCheckedItems())}
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>Limpiar listos</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Banner Glassmorphism: Modo Compra Urgente y Geocercas */}
      <View style={[styles.urgencyCard, isUrgent && styles.urgencyCardActive]}>
        <View style={styles.urgencyTopRow}>
          <View style={styles.urgencyLeftCol}>
            <View style={[styles.urgencyIconBubble, isUrgent && styles.urgencyIconBubbleActive]}>
              <VectorIcon
                name="location"
                size={18}
                color={isUrgent ? '#00E676' : '#6B7280'}
              />
            </View>
            <View style={styles.urgencyTextCol}>
              <View style={styles.urgencyTitleRow}>
                <Text style={[styles.urgencyTitle, isUrgent && styles.urgencyTitleActive]}>
                  {isUrgent ? 'COMPRA URGENTE ACTIVA' : 'Modo Compra Urgente'}
                </Text>
                {isUrgent && (
                  <View style={styles.urgencySourceBadge}>
                    <Text style={styles.urgencySourceText}>
                      {urgentModeSource === 'AUTO_LOW_STOCK' ? 'Stock crítico' : 'Manual'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.urgencySubtitle}>
                {isUrgent
                  ? 'GPS activo • Alerta por geocerca si pasas a < 150 m de un súper abierto'
                  : 'GPS inactivo • Cero consumo de batería'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.urgencyToggleBtn, isUrgent && styles.urgencyToggleBtnActive]}
            onPress={handleToggleUrgency}
            activeOpacity={0.8}
          >
            <Text style={[styles.urgencyToggleText, isUrgent && styles.urgencyToggleTextActive]}>
              {isUrgent ? 'Desactivar' : 'Activar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Botón de Pruebas Demo: Simular paso por supermercado abierto */}
        <TouchableOpacity
          style={styles.demoSimulateBtn}
          onPress={handleSimulateGeofence}
          activeOpacity={0.7}
          disabled={isSimulating}
        >
          <VectorIcon name="zap" size={14} color="#00E676" />
          <Text style={styles.demoSimulateText}>
            {isSimulating
              ? 'Simulando paso por supermercado...'
              : 'Simular paso por supermercado abierto'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Input para añadir rápido */}
      <View style={styles.inputBar}>
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          placeholder="Añadir producto a la lista..."
          placeholderTextColor="#6B7280"
          value={newItemName}
          onChangeText={setNewItemName}
          onSubmitEditing={() => handleAddItem()}
        />

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => handleAddItem()}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* 4. ScrollView Horizontal con Chips de Filtrado Interactivo */}
      <View style={styles.filterChipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScroll}
        >
          {FILTER_CHIPS.map((chip) => {
            const isSelected = selectedFilter === chip;
            return (
              <TouchableOpacity
                key={chip}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipActive,
                ]}
                onPress={() => handleFilterSelect(chip)}
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

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Ítems pendientes */}
        <Text style={styles.groupHeader}>POR COMPRAR ({activeItems.length})</Text>
        {activeItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.itemRow}
            onPress={() => dispatch(toggleCheckItem(item.id))}
            activeOpacity={0.7}
          >
            <View style={styles.itemLeft}>
              <View style={styles.checkbox}>
                {item.isChecked && <Text style={styles.checkIcon}>✓</Text>}
              </View>
              <View>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} {item.unit} • Vía {item.source} • Por {item.addedByUserId}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => dispatch(removeShoppingItem(item.id))}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {/* Ítems comprados */}
        {completedItems.length > 0 && (
          <>
            <Text style={[styles.groupHeader, { marginTop: 24 }]}>
              COMPRADOS ({completedItems.length})
            </Text>
            {completedItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemRow, styles.itemRowCompleted]}
                onPress={() => dispatch(toggleCheckItem(item.id))}
                activeOpacity={0.7}
              >
                <View style={styles.itemLeft}>
                  <View style={[styles.checkbox, styles.checkboxChecked]}>
                    <Text style={styles.checkIcon}>✓</Text>
                  </View>
                  <Text style={[styles.itemName, styles.itemNameCompleted]}>
                    {item.name}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => dispatch(removeShoppingItem(item.id))}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  signalrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  signalrDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryGreen,
    marginRight: 5,
  },
  signalrText: {
    color: Colors.primaryGreen,
    fontSize: 10,
    fontWeight: '700',
  },
  clearBtn: {
    backgroundColor: '#26262E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  clearBtnText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#1E1E24',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 10,
  },
  addBtn: {
    backgroundColor: Colors.primaryGreen,
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  addBtnText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingBottom: 95,
  },
  groupHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A20',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemRowCompleted: {
    opacity: 0.5,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: Colors.primaryGreen,
    borderColor: Colors.primaryGreen,
  },
  checkIcon: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  itemNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  itemMeta: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
  deleteBtnText: {
    color: '#6B7280',
    fontSize: 14,
  },
  filterChipsWrapper: {
    marginBottom: 12,
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
  urgencyCard: {
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  urgencyCardActive: {
    backgroundColor: '#12241A',
    borderColor: 'rgba(0, 230, 118, 0.45)',
  },
  urgencyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  urgencyLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  urgencyIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#26262B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  urgencyIconBubbleActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
  },
  urgencyTextCol: {
    flex: 1,
  },
  urgencyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgencyTitle: {
    fontFamily: Typography.heading,
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  urgencyTitleActive: {
    color: Colors.primaryGreen,
  },
  urgencySourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 230, 118, 0.18)',
  },
  urgencySourceText: {
    fontFamily: Typography.body,
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primaryGreen,
  },
  urgencySubtitle: {
    fontFamily: Typography.body,
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  urgencyToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#2A2A30',
  },
  urgencyToggleBtnActive: {
    backgroundColor: Colors.primaryGreen,
  },
  urgencyToggleText: {
    fontFamily: Typography.body,
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  urgencyToggleTextActive: {
    color: '#000000',
  },
  demoSimulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
  },
  demoSimulateText: {
    fontFamily: Typography.body,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryGreen,
  },
});

