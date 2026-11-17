import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Image,
} from 'react-native';
import { Colors, Typography } from '../theme';
import { InventoryItem } from '../types';
import { VectorIcon } from './VectorIcon';
import { HapticFeedback } from '../services/haptics';
import { formatPantryQuantity } from '../utils/quantityFormatter';
import { getProductImageUrl } from '../screens/ScannerScreen';

interface SwipeablePantryRowProps {
  item: InventoryItem;
  isLast: boolean;
  onPress: (item: InventoryItem) => void;
  onQuickConsume: (item: InventoryItem) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (item: InventoryItem) => void;
}

const ACTION_WIDTH = 110;

/**
 * SwipeablePantryRow - Fila de despensa con gesto de deslizamiento horizontal a la izquierda (PanResponder).
 * Deslizar hacia la izquierda revela el botón "Consumo Rápido" (-1 unidad).
 * Si la cantidad llega a 0, activa el flujo inteligente de Auto-Lista.
 * Admite modo selección múltiple para agotar/eliminar en lote.
 */
export const SwipeablePantryRow: React.FC<SwipeablePantryRowProps> = ({
  item,
  isLast,
  onPress,
  onQuickConsume,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const isRed = item.urgencyLevel === 'Red';
  const isAmber = item.urgencyLevel === 'Amber';

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isSelectionMode) return false;
        // Solo capturar gestos predominantemente horizontales hacia la izquierda
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (isSelectionMode) return;
        // Limitar arrastre a la izquierda únicamente (valores negativos)
        if (gestureState.dx < 0) {
          const clamped = Math.max(-ACTION_WIDTH - 20, gestureState.dx);
          translateX.setValue(clamped);
        } else {
          translateX.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -60) {
          // Deslizado suficiente: animar para mostrar el botón de acción
          Animated.spring(translateX, {
            toValue: -ACTION_WIDTH,
            friction: 7,
            useNativeDriver: true,
          }).start();
        } else {
          // Deslizado insuficiente: volver a posición cerrada
          Animated.spring(translateX, {
            toValue: 0,
            friction: 7,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const closeRow = () => {
    Animated.spring(translateX, {
      toValue: 0,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const handleActionPress = () => {
    HapticFeedback.selectionAsync();
    closeRow();
    onQuickConsume(item);
  };

  return (
    <View style={[styles.container, !isLast && styles.borderBottom]}>
      {/* Fondo de Acción Revelado (Consumo Rápido) */}
      <View style={styles.actionBackground}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleActionPress}
          activeOpacity={0.8}
        >
          <VectorIcon name="flash" size={16} color="#000000" />
          <Text style={styles.actionText}>-1 ud</Text>
          <Text style={styles.actionSubText}>Consumir</Text>
        </TouchableOpacity>
      </View>

      {/* Fila Principal Deslizable */}
      <Animated.View
        style={[
          styles.rowContent,
          isSelected && styles.rowContentSelected,
          {
            transform: [{ translateX }],
          },
        ]}
        {...(!isSelectionMode ? panResponder.panHandlers : {})}
      >
        <TouchableOpacity
          style={styles.rowTouchable}
          activeOpacity={0.85}
          onPress={() => {
            if (isSelectionMode) {
              HapticFeedback.selectionAsync();
              onToggleSelect?.(item);
            } else {
              closeRow();
              onPress(item);
            }
          }}
        >
          <View style={styles.rowLeft}>
            {/* Modo Selección: Checkbox circular interactivo */}
            {isSelectionMode ? (
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <VectorIcon name="check" size={12} color="#000000" />}
              </View>
            ) : (
              /* Semáforo indicador de caducidad */
              <View
                style={[
                  styles.trafficDot,
                  isRed ? styles.dotRed : isAmber ? styles.dotAmber : styles.dotGreen,
                ]}
              />
            )}

            {/* Fotografía Real del Alimento */}
            <Image
              source={{
                uri:
                  item.imageUrl && !item.imageUrl.includes('photo-1546069901-ba9599a7e63c')
                    ? item.imageUrl
                    : getProductImageUrl(item.name, item.category),
              }}
              style={styles.foodImage}
              resizeMode="cover"
            />

            <View style={styles.detailsColumn}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemSubText} numberOfLines={1}>
                {item.location} • Por {item.addedByUserId}
              </Text>

              {/* Badge de Caducidad */}
              <View style={styles.expiryBadgeRow}>
                <Text
                  style={[
                    styles.expiryText,
                    isRed
                      ? styles.expiryRed
                      : isAmber
                      ? styles.expiryAmber
                      : styles.expiryGreen,
                  ]}
                >
                  {isRed
                    ? 'Caduca en 24 h'
                    : isAmber
                    ? 'Caduca en 48 h'
                    : `Caduca en ${item.remainingDays || 7} días`}
                </Text>
              </View>
            </View>
          </View>

          {/* Cantidad Flotante estilo Píldora */}
          <View style={styles.quantityPill}>
            <Text style={styles.quantityText}>
              {formatPantryQuantity(item.quantity, item.unit, item.name)}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: ACTION_WIDTH,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    width: ACTION_WIDTH - 12,
    height: '78%',
    borderRadius: 14,
    backgroundColor: Colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  actionText: {
    fontFamily: Typography.heading,
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  actionSubText: {
    fontFamily: Typography.body,
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
  },
  rowContent: {
    backgroundColor: '#1C1C1E',
  },
  rowContentSelected: {
    backgroundColor: '#16241B',
  },
  rowTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxSelected: {
    backgroundColor: Colors.primaryGreen,
    borderColor: Colors.primaryGreen,
  },
  trafficDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
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
  foodImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    marginRight: 14,
  },
  detailsColumn: {
    flex: 1,
  },
  itemName: {
    fontFamily: Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  itemSubText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  expiryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryText: {
    fontFamily: Typography.body,
    fontSize: 11,
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
  quantityPill: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  quantityText: {
    fontFamily: Typography.body,
    fontSize: 12,
    fontWeight: '700',
    color: '#E5E7EB',
  },
});
