import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Colors } from '../theme';
import { VectorIcon } from './VectorIcon';

interface RadarDeactivationModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirmDeactivate: () => void;
}

export const RadarDeactivationModal: React.FC<RadarDeactivationModalProps> = ({
  visible,
  onCancel,
  onConfirmDeactivate,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      testID="modal-radar-deactivation"
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Icono de Radar con destello verde esmeralda */}
              <View style={styles.iconContainer}>
                <VectorIcon name="radar" size={32} color={Colors.primaryGreen} />
              </View>

              <Text style={styles.title}>Radar de Supermercados</Text>

              {/* Mensaje de confirmación y privacidad según directiva */}
              <Text style={styles.description}>
                ¿Seguro que quieres desactivar el Radar? Dejarás de recibir recordatorios
                automáticos al pasar cerca de supermercados. Por privacidad, este radar también
                se desactiva automáticamente si cierras sesión.
              </Text>

              {/* Botones de Acción */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                  activeOpacity={0.7}
                  testID="btn-cancel-radar-deactivation"
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.deactivateButton]}
                  onPress={onConfirmDeactivate}
                  activeOpacity={0.8}
                  testID="btn-confirm-radar-deactivation"
                >
                  <Text style={styles.deactivateButtonText}>Desactivar Radar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#10B981', // Verde Esmeralda Kitchy
    padding: 24,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14.5,
    lineHeight: 22,
    color: '#D1D5DB',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  deactivateButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  deactivateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444', // Rojo suave
  },
});
