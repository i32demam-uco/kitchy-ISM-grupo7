import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Colors, Typography } from '../theme';
import { InventoryItem } from '../types';
import { VectorIcon } from './VectorIcon';
import { HapticFeedback } from '../services/haptics';

interface ProductDepletedModalProps {
  visible: boolean;
  item: InventoryItem | null;
  onDismiss: () => void;
  onConfirmAddToList: (item: InventoryItem) => void;
}

/**
 * Smart Prompt Modal: Alerta elegante al agotar un alimento (UX Inteligente)
 * Cero emojis: utiliza señalética vectorial fina y fondo Glassmorphism (#1C1C1E).
 */
export const ProductDepletedModal: React.FC<ProductDepletedModalProps> = ({
  visible,
  item,
  onDismiss,
  onConfirmAddToList,
}) => {
  if (!item) return null;

  const handleConfirm = () => {
    HapticFeedback.impactAsync();
    onConfirmAddToList(item);
  };

  const handleDismiss = () => {
    HapticFeedback.selectionAsync();
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Cabecera con Icono Vectorial */}
          <View style={styles.iconContainer}>
            <VectorIcon name="shopping-cart" size={24} color={Colors.primaryGreen} />
          </View>

          <Text style={styles.title}>Producto Agotado</Text>
          <Text style={styles.message}>
            Has agotado <Text style={styles.boldText}>{item.name}</Text>. ¿Deseas añadirlo automáticamente a la lista colaborativa de la compra?
          </Text>

          {/* Botones de Acción */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.discardButton}
              onPress={handleDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.discardButtonText}>Descartar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>Añadir a la Lista</Text>
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
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  boldText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  discardButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  discardButtonText: {
    fontFamily: Typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  confirmButton: {
    flex: 1.3,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontFamily: Typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
});
