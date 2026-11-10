import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Colors, Typography } from '../theme';
import { VectorIcon } from './VectorIcon';
import { HapticFeedback } from '../services/haptics';

interface CalendarPickerModalProps {
  visible: boolean;
  initialDate?: string;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * CalendarPickerModal - Selector de Fecha Nativo de Precisión con Estética Glassmorphism.
 * 
 * Permite navegar cómodamente entre meses y seleccionar cualquier día exacto,
 * sin dependencias C++ conflictivas y con 60 FPS fluidos.
 */
export const CalendarPickerModal: React.FC<CalendarPickerModalProps> = ({
  visible,
  initialDate,
  onClose,
  onSelectDate,
}) => {
  const parseInitialDate = () => {
    if (initialDate) {
      const d = new Date(initialDate);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  const selectedDate = parseInitialDate();
  const [viewDate, setViewDate] = useState<Date>(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = () => {
    HapticFeedback.selectionAsync();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    HapticFeedback.selectionAsync();
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    HapticFeedback.impactAsync();
    const chosen = new Date(year, month, day, 12, 0, 0);
    onSelectDate(chosen);
    onClose();
  };

  const handleSelectToday = () => {
    HapticFeedback.selectionAsync();
    const today = new Date();
    onSelectDate(today);
    onClose();
  };

  // Calcular días de la cuadrícula
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Lunes = 0
  const totalDays = new Date(year, month + 1, 0).getDate();

  const daysGrid: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    daysGrid.push(d);
  }

  const isSelected = (day: number) => {
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === day
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Cabecera del Mes y Navegación */}
          <View style={styles.monthHeader}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={handlePrevMonth}
              activeOpacity={0.7}
            >
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>

            <View style={styles.monthTitleWrapper}>
              <Text style={styles.monthTitle}>
                {`${MONTH_NAMES[month]} ${year}`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.navButton}
              onPress={handleNextMonth}
              activeOpacity={0.7}
            >
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Días de la Semana */}
          <View style={styles.weekdaysRow}>
            {WEEKDAYS.map((wd, i) => (
              <View key={i} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{wd}</Text>
              </View>
            ))}
          </View>

          {/* Cuadrícula del Calendario */}
          <View style={styles.calendarGrid}>
            {daysGrid.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} style={styles.dayCell} />;
              }

              const selected = isSelected(day);
              const today = isToday(day);

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  style={[
                    styles.dayCell,
                    styles.dayCellTouchable,
                    selected && styles.dayCellSelected,
                    today && !selected && styles.dayCellToday,
                  ]}
                  onPress={() => handleSelectDay(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      selected && styles.dayTextSelected,
                      today && !selected && styles.dayTextToday,
                    ]}
                  >
                    {day}
                  </Text>
                  {today && !selected && <View style={styles.todayIndicator} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Barra Inferior con Atajos y Cerrar */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.todayButton}
              onPress={handleSelectToday}
              activeOpacity={0.8}
            >
              <Text style={styles.todayButtonText}>Hoy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  monthTitleWrapper: {
    alignItems: 'center',
  },
  monthTitle: {
    fontFamily: Typography.heading,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  navArrow: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 26,
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekdayText: {
    fontFamily: Typography.body,
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayCell: {
    width: '14.28%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellTouchable: {
    borderRadius: 21,
  },
  dayCellSelected: {
    backgroundColor: Colors.primaryGreen,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.4)',
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
  },
  dayText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: '#E5E7EB',
    fontWeight: '500',
  },
  dayTextSelected: {
    color: '#000000',
    fontWeight: '800',
  },
  dayTextToday: {
    color: Colors.primaryGreen,
    fontWeight: '700',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primaryGreen,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  todayButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButtonText: {
    fontFamily: Typography.body,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryGreen,
  },
  closeButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontFamily: Typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});
