import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  TextInput,
} from 'react-native';
import { Colors, Typography } from '../theme';
import { InventoryItem } from '../types';
import { VectorIcon } from './VectorIcon';
import { HapticFeedback } from '../services/haptics';
import { determineCategory } from '../utils/inventoryGrouping';
import { CalendarPickerModal } from './CalendarPickerModal';

interface ProductDetailSheetProps {
  visible: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onUpdateQuantity: (item: InventoryItem, newQuantity: number) => void;
  onUpdateExpiration: (item: InventoryItem, newDate: string) => void;
  onDepleted: (item: InventoryItem) => void;
}

export const ProductDetailSheet: React.FC<ProductDetailSheetProps> = ({
  visible,
  item,
  onClose,
  onUpdateQuantity,
  onUpdateExpiration,
  onDepleted,
}) => {
  if (!item) return null;

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);
  const [quantityInputText, setQuantityInputText] = useState(String(item.quantity));
  const longPressTimerRef = useRef<any>(null);

  const category = determineCategory(item);

  useEffect(() => {
    setQuantityInputText(String(item.quantity));
  }, [item.quantity]);

  const stopLongPress = () => {
    if (longPressTimerRef.current) {
      clearInterval(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopLongPress();
    };
  }, []);

  const getStep = (currentQty: number) => {
    const unit = (item.unit || '').toLowerCase();
    if (unit.includes('g') || unit.includes('ml') || currentQty >= 100) {
      return 25;
    }
    return 1;
  };

  const handleDecrement = () => {
    HapticFeedback.selectionAsync();
    if (item.quantity <= 1) {
      onClose();
      onDepleted(item);
    } else {
      const step = getStep(item.quantity);
      const nextQty = Math.max(1, item.quantity - step);
      onUpdateQuantity(item, nextQty);
    }
  };

  const handleIncrement = () => {
    HapticFeedback.selectionAsync();
    const step = getStep(item.quantity);
    onUpdateQuantity(item, item.quantity + step);
  };

  const startLongPress = (isIncrement: boolean) => {
    stopLongPress();
    HapticFeedback.selectionAsync();
    longPressTimerRef.current = setInterval(() => {
      HapticFeedback.selectionAsync();
      const current = item.quantity;
      const step = getStep(current);
      if (isIncrement) {
        onUpdateQuantity(item, current + step);
      } else {
        if (current <= step) {
          stopLongPress();
          onClose();
          onDepleted(item);
        } else {
          onUpdateQuantity(item, Math.max(1, current - step));
        }
      }
    }, 80);
  };

  const handleQuickDateChange = (daysToAdd: number) => {
    HapticFeedback.selectionAsync();
    const newDate = new Date(Date.now() + daysToAdd * 24 * 3600 * 1000).toISOString();
    onUpdateExpiration(item, newDate);
    setIsDatePickerOpen(false);
  };

  const handleSelectExactDate = (date: Date) => {
    HapticFeedback.impactAsync();
    onUpdateExpiration(item, date.toISOString());
    setIsCalendarModalVisible(false);
    setIsDatePickerOpen(false);
  };

  const formattedExpiration = () => {
    try {
      const d = new Date(item.expirationDate);
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return 'Fecha no disponible';
    }
  };

  const isRed = item.urgencyLevel === 'Red';
  const isAmber = item.urgencyLevel === 'Amber';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          {/* Manija de arrastre */}
          <View style={styles.dragHandle} />

          {/* Fotografía Real en Alta Resolución */}
          <View style={styles.imageHeaderWrapper}>
            <Image
              source={{
                uri:
                  item.imageUrl ||
                  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
              }}
              style={styles.headerImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlayGradient} />

            {/* Botón de Cierre */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            {/* Categoría Badge flotante */}
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{category}</Text>
            </View>
          </View>

          <ScrollView style={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* Título y Metadata */}
            <View style={styles.titleSection}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.addedByText}>
                {item.location} • Añadido por <Text style={styles.boldText}>{item.addedByUserId}</Text>
              </Text>
            </View>

            {/* Sección de Caducidad Editable */}
            <View style={styles.metaCard}>
              <TouchableOpacity
                style={styles.metaRow}
                onPress={() => setIsCalendarModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={styles.metaLeft}>
                  <View
                    style={[
                      styles.urgencyDot,
                      isRed ? styles.dotRed : isAmber ? styles.dotAmber : styles.dotGreen,
                    ]}
                  />
                  <View>
                    <Text style={styles.metaLabel}>Caducidad estimada</Text>
                    <Text style={styles.metaValue}>{formattedExpiration()}</Text>
                  </View>
                </View>

                <View style={styles.dateActionRow}>
                  <TouchableOpacity
                    style={styles.calendarIconBtn}
                    onPress={() => setIsCalendarModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <VectorIcon name="calendar" size={15} color={Colors.primaryGreen} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.editDateBtn}
                    onPress={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editDateBtnText}>Atajos</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {/* Selector Rápido de Fecha y Botón de Calendario */}
              {isDatePickerOpen && (
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerTitle}>Selecciona periodo o calendario:</Text>
                  <View style={styles.datePillsRow}>
                    <TouchableOpacity
                      style={styles.datePill}
                      onPress={() => handleQuickDateChange(1)}
                    >
                      <Text style={styles.datePillText}>24 horas</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.datePill}
                      onPress={() => handleQuickDateChange(3)}
                    >
                      <Text style={styles.datePillText}>3 días</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.datePill}
                      onPress={() => handleQuickDateChange(7)}
                    >
                      <Text style={styles.datePillText}>1 semana</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.datePill}
                      onPress={() => handleQuickDateChange(30)}
                    >
                      <Text style={styles.datePillText}>1 mes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.datePill, styles.datePillCalendar]}
                      onPress={() => setIsCalendarModalVisible(true)}
                    >
                      <VectorIcon name="calendar" size={12} color="#000000" />
                      <Text style={styles.datePillCalendarText}>Abrir Calendario</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Controles de Cantidad (Ley de Fitts: Botones Grandes con Long Press y Entrada Manual Directa) */}
            <View style={styles.quantitySection}>
              <View style={styles.quantityHeaderRow}>
                <Text style={styles.sectionHeading}>CANTIDAD EN DESPENSA</Text>
                <Text style={styles.hintTapText}>Toca el número para escribir</Text>
              </View>

              <View style={styles.fittsQuantityRow}>
                <TouchableOpacity
                  style={styles.fittsButtonMinus}
                  onPress={handleDecrement}
                  onLongPress={() => startLongPress(false)}
                  onPressOut={stopLongPress}
                  delayLongPress={250}
                  activeOpacity={0.7}
                >
                  <Text style={styles.fittsMinusSign}>−</Text>
                </TouchableOpacity>

                {/* Entrada Manual Directa con Teclado Numérico */}
                <View style={styles.quantityCenter}>
                  <TextInput
                    style={styles.quantityInput}
                    value={quantityInputText}
                    onChangeText={(text) => {
                      setQuantityInputText(text);
                      const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10);
                      if (!isNaN(parsed)) {
                        if (parsed <= 0) {
                          onClose();
                          onDepleted(item);
                        } else {
                          onUpdateQuantity(item, parsed);
                        }
                      }
                    }}
                    onBlur={() => {
                      if (!quantityInputText.trim() || isNaN(Number(quantityInputText))) {
                        setQuantityInputText(String(item.quantity));
                      }
                    }}
                    keyboardType="numeric"
                    returnKeyType="done"
                    selectTextOnFocus
                  />
                  <Text style={styles.quantityUnit}>{item.unit}</Text>
                </View>

                <TouchableOpacity
                  style={styles.fittsButtonPlus}
                  onPress={handleIncrement}
                  onLongPress={() => startLongPress(true)}
                  onPressOut={stopLongPress}
                  delayLongPress={250}
                  activeOpacity={0.7}
                >
                  <Text style={styles.fittsPlusSign}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Botón de Consumo Total */}
            <TouchableOpacity
              style={styles.depleteDirectBtn}
              onPress={() => {
                HapticFeedback.impactAsync();
                onClose();
                onDepleted(item);
              }}
              activeOpacity={0.8}
            >
              <VectorIcon name="trash" size={16} color="#EF4444" />
              <Text style={styles.depleteDirectText}>Agotar alimento ahora</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Calendario Nativo de Precisión */}
      <CalendarPickerModal
        visible={isCalendarModalVisible}
        initialDate={item.expirationDate}
        onClose={() => setIsCalendarModalVisible(false)}
        onSelectDate={handleSelectExactDate}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxHeight: '85%',
    paddingBottom: 24,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4B5563',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  imageHeaderWrapper: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#121212',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    backgroundColor: 'rgba(0, 230, 118, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontFamily: Typography.body,
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  titleSection: {
    marginBottom: 16,
  },
  productName: {
    fontFamily: Typography.heading,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  addedByText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: '#9CA3AF',
  },
  boldText: {
    color: '#D1D5DB',
    fontWeight: '600',
  },
  metaCard: {
    backgroundColor: '#262629',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  urgencyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  metaLabel: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: '#9CA3AF',
  },
  metaValue: {
    fontFamily: Typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dateActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
  },
  editDateBtnText: {
    fontFamily: Typography.body,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryGreen,
  },
  datePickerContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  datePickerTitle: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  datePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  datePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#1E1E20',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  datePillCalendar: {
    backgroundColor: Colors.primaryGreen,
    borderColor: Colors.primaryGreen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datePillCalendarText: {
    fontFamily: Typography.body,
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  datePillText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  quantitySection: {
    marginBottom: 20,
  },
  quantityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: {
    fontFamily: Typography.heading,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#9CA3AF',
  },
  hintTapText: {
    fontFamily: Typography.body,
    fontSize: 10,
    color: '#6B7280',
  },
  fittsQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#262629',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  fittsButtonMinus: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#323236',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  fittsMinusSign: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quantityCenter: {
    alignItems: 'center',
    minWidth: 90,
  },
  quantityInput: {
    fontFamily: Typography.heading,
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 0,
    paddingHorizontal: 8,
    minWidth: 80,
  },
  quantityNumber: {
    fontFamily: Typography.heading,
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quantityUnit: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: '#9CA3AF',
  },
  fittsButtonPlus: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: Colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fittsPlusSign: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  depleteDirectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: 24,
  },
  depleteDirectText: {
    fontFamily: Typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
});
