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
import {
  addShoppingItem,
  toggleCheckItem,
  removeShoppingItem,
  clearCheckedItems,
} from '../store/shoppingListSlice';
import { ShoppingItem } from '../types';
import { KitchyAlert } from '../services/kitchyAlert';
import { determineCategory } from '../utils/inventoryGrouping';
import { HapticFeedback } from '../services/haptics';

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
  const shoppingItems = useAppSelector((state) => state.shoppingList.items);
  const activeHouse = useAppSelector((state) => state.auth.activeHouse);
  const [newItemName, setNewItemName] = useState('');
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('Todos');

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

  const handleAddItem = (source: 'Manual' | 'Voice' = 'Manual', customName?: string) => {
    const name = customName || newItemName.trim();
    if (!name) return;

    const newItem: ShoppingItem = {
      id: `shop-${Date.now()}`,
      houseId: activeHouse.id,
      name,
      quantity: 1,
      unit: 'ud',
      isChecked: false,
      source,
      addedByUserId: 'Alejandro',
      createdAt: new Date().toISOString(),
      category: determineCategory({ name }),
    };

    dispatch(addShoppingItem(newItem));
    setNewItemName('');
    HapticFeedback.selectionAsync();
  };

  const handleVoiceAddSimulation = () => {
    setIsVoiceRecording(true);
    setTimeout(() => {
      setIsVoiceRecording(false);
      handleAddItem('Voice', 'Café molido natural');
      KitchyAlert.show(
        'Reconocimiento de Voz',
        'Se ha dictado y añadido «Café molido natural» a la lista colaborativa.'
      );
    }, 1200);
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

      {/* Input para añadir rápido */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Añadir producto a la lista..."
          placeholderTextColor="#6B7280"
          value={newItemName}
          onChangeText={setNewItemName}
          onSubmitEditing={() => handleAddItem('Manual')}
        />

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => handleAddItem('Manual')}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>

        {/* Botón de voz flotante integrado */}
        <TouchableOpacity
          style={[styles.voiceBtn, isVoiceRecording && styles.voiceBtnActive]}
          onPress={handleVoiceAddSimulation}
        >
          <View style={[styles.voiceDot, isVoiceRecording && styles.voiceDotActive]} />
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
  voiceBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#2A2A34',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  voiceBtnActive: {
    backgroundColor: '#DC2626',
  },
  voiceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primaryGreen,
  },
  voiceDotActive: {
    backgroundColor: '#FFFFFF',
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
});

