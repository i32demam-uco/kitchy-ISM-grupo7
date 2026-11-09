import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Colors } from '../theme';
import { useAppDispatch, useAppSelector } from '../store';
import { setDeltaModalVisible } from '../store/recipesSlice';
import { addMultipleShoppingItems } from '../store/shoppingListSlice';
import { ShoppingItem } from '../types';
import { VectorIcon } from './VectorIcon';
import { KitchyAlert } from '../services/kitchyAlert';

export const RecipeDeltaModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const isVisible = useAppSelector((state) => state.recipes.isDeltaModalVisible);
  const activeRecipe = useAppSelector((state) => state.recipes.activeRecipe);
  const inventoryItems = useAppSelector((state) => state.inventory.items);
  const activeHouse = useAppSelector((state) => state.auth.activeHouse);

  // Compute Delta on the fly
  const deltaCalculation = activeRecipe.ingredients.map((required) => {
    const matching = inventoryItems.filter(
      (inv) =>
        inv.name.toLowerCase().includes(required.name.toLowerCase()) ||
        required.name.toLowerCase().includes(inv.name.toLowerCase())
    );

    const available = matching.reduce((sum, item) => sum + item.quantity, 0);
    const deficit = Math.max(0, required.quantity - available);
    const isMissing = deficit > 0;

    return {
      name: required.name,
      requiredQuantity: required.quantity,
      availableQuantity: available,
      deficitQuantity: deficit,
      unit: required.unit,
      isMissing,
    };
  });

  const missingItems = deltaCalculation.filter((d) => d.isMissing);

  const handleAddDeltaToShoppingList = () => {
    if (missingItems.length === 0) {
      KitchyAlert.show('¡Todo listo!', 'Tienes todos los ingredientes necesarios en tu despensa.');
      return;
    }

    const itemsToAdd: ShoppingItem[] = missingItems.map((m, idx) => ({
      id: `delta-${Date.now()}-${idx}`,
      houseId: activeHouse.id,
      name: m.name,
      quantity: m.deficitQuantity,
      unit: m.unit,
      isChecked: false,
      source: 'RecipeDelta',
      addedByUserId: 'Alejandro',
      createdAt: new Date().toISOString(),
    }));

    dispatch(addMultipleShoppingItems(itemsToAdd));
    dispatch(setDeltaModalVisible(false));

    KitchyAlert.show(
      'Faltantes añadidos a la Lista',
      `Se han añadido ${itemsToAdd.length} ingredientes faltantes a la lista colaborativa de ${activeHouse.name}.`,
      [{ text: 'Entendido' }]
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        dispatch(setDeltaModalVisible(false));
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Motor Delta de Receta</Text>
              <Text style={styles.sheetSubtitle}>
                Comparativa de stock: {activeRecipe.title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => dispatch(setDeltaModalVisible(false))}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Resumen Disponibilidad */}
          <View
            style={[
              styles.summaryBanner,
              missingItems.length === 0
                ? styles.summaryBannerSuccess
                : styles.summaryBannerWarning,
            ]}
          >
            <View style={{ marginRight: 12 }}>
              <VectorIcon
                name={missingItems.length === 0 ? 'check' : 'zap'}
                size={22}
                color={missingItems.length === 0 ? Colors.primaryGreen : '#F59E0B'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>
                {missingItems.length === 0
                  ? 'Disponibilidad Total'
                  : `Faltan ${missingItems.length} de ${deltaCalculation.length} ingredientes`}
              </Text>
              <Text style={styles.summaryText}>
                {missingItems.length === 0
                  ? 'Puedes empezar a cocinar inmediatamente.'
                  : 'Añádelos a la lista de compra con 1 solo clic.'}
              </Text>
            </View>
          </View>

          {/* Matriz de Ingredientes */}
          <ScrollView style={styles.ingredientsList} showsVerticalScrollIndicator={false}>
            {deltaCalculation.map((item, idx) => (
              <View key={idx} style={styles.ingredientRow}>
                <View style={styles.ingredientLeft}>
                  <View
                    style={[
                      styles.stockStatusDot,
                      item.isMissing ? styles.dotMissing : styles.dotAvailable,
                    ]}
                  />
                  <View>
                    <Text style={styles.ingredientName}>{item.name}</Text>
                    <Text style={styles.ingredientStockText}>
                      En casa: {item.availableQuantity} {item.unit} / Requiere: {item.requiredQuantity} {item.unit}
                    </Text>
                  </View>
                </View>

                {item.isMissing ? (
                  <View style={styles.deficitBadge}>
                    <Text style={styles.deficitBadgeText}>
                      -{item.deficitQuantity} {item.unit}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.okBadge}>
                    <Text style={styles.okBadgeText}>OK</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* 1-Click Action Button (RF13, CU-01) */}
          {missingItems.length > 0 && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleAddDeltaToShoppingList}
              activeOpacity={0.88}
            >
              <Text style={styles.actionBtnText}>
                + Añadir {missingItems.length} faltantes a la Lista de Compra
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#1A1A20',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#262630',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  summaryBannerWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  summaryBannerSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  summaryEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryText: {
    fontSize: 11,
    color: '#D1D5DB',
    marginTop: 2,
  },
  ingredientsList: {
    marginBottom: 14,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  ingredientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stockStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  dotAvailable: {
    backgroundColor: Colors.urgencyGreen,
  },
  dotMissing: {
    backgroundColor: Colors.urgencyRed,
  },
  ingredientName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ingredientStockText: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  deficitBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  deficitBadgeText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  okBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  okBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtn: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: Colors.primaryGreen,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
});
