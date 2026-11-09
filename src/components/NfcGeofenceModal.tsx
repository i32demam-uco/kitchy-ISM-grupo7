import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../theme';
import { useAppDispatch, useAppSelector } from '../store';
import { setNfcModalVisible, setCurrentTab } from '../store/hardwareSlice';
import { VectorIcon } from './VectorIcon';
import { KitchyAlert } from '../services/kitchyAlert';

export const NfcGeofenceModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const isVisible = useAppSelector((state) => state.hardware.isNfcModalVisible);
  const supermarket = useAppSelector((state) => state.hardware.geofenceSupermarketName);
  const pendingShoppingCount = useAppSelector(
    (state) => state.shoppingList.items.filter((i) => !i.isChecked).length
  );
  const [nfcReading, setNfcReading] = useState(false);

  const handleSimulateNfcScan = () => {
    setNfcReading(true);
    setTimeout(() => {
      setNfcReading(false);
      dispatch(setNfcModalVisible(false));
      dispatch(setCurrentTab('list'));
      KitchyAlert.show(
        'Etiqueta NFC Detectada',
        'Etiqueta «Nevera Ciudad Jardín» leída con éxito. Abriendo tu Lista de la Compra colaborativa automáticamente (RF16).'
      );
    }, 1000);
  };

  const handleSimulateGeofence = () => {
    dispatch(setNfcModalVisible(false));
    KitchyAlert.show(
      'Geocerca 100m Activada',
      `Has entrado en el perímetro de ${supermarket}. Tienes ${pendingShoppingCount} productos pendientes en tu lista de compra. ¿Deseas abrirla ahora?`,
      [
        { text: 'Ignorar', style: 'cancel' },
        { text: 'Abrir Lista', onPress: () => dispatch(setCurrentTab('list')) },
      ]
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        dispatch(setNfcModalVisible(false));
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Sensores y Hardware Nativo</Text>
          <Text style={styles.subtitle}>
            Pruebas de NFC (RF16) y Geofencing de Supermercado (RF17)
          </Text>

          {/* NFC Reader Simulation */}
          <View style={styles.sensorBlock}>
            <View style={{ marginBottom: 8 }}>
              <VectorIcon name="nfc" size={28} color={Colors.primaryGreen} />
            </View>
            <Text style={styles.sensorName}>Lector NFC (Puente Nativo)</Text>
            <Text style={styles.sensorDesc}>
              {nfcReading
                ? 'Acercando teléfono a etiqueta NFC...'
                : 'Acerca el dispositivo a la etiqueta NFC del frigorífico para abrir la lista de la compra al instante.'}
            </Text>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleSimulateNfcScan}
              disabled={nfcReading}
            >
              <Text style={styles.actionBtnText}>
                {nfcReading ? 'Leyendo...' : 'Simular Lectura de Tag NFC'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Geofencing Simulation */}
          <View style={styles.sensorBlock}>
            <View style={{ marginBottom: 8 }}>
              <VectorIcon name="house" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.sensorName}>Geofencing de Supermercado (100 m)</Text>
            <Text style={styles.sensorDesc}>
              Dispara una notificación push cuando entres a menos de 100 metros de {supermarket} si tu lista tiene artículos.
            </Text>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnBlue]}
              onPress={handleSimulateGeofence}
            >
              <Text style={styles.actionBtnText}>Simular Entrada a Geocerca 100m</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => dispatch(setNfcModalVisible(false))}
          >
            <Text style={styles.closeBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1E1E26',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 3,
    marginBottom: 16,
  },
  sensorBlock: {
    backgroundColor: '#262632',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  sensorIcon: {
    fontSize: 30,
    marginBottom: 6,
  },
  sensorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sensorDesc: {
    fontSize: 11.5,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 16,
  },
  actionBtn: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '100%',
  },
  actionBtnBlue: {
    backgroundColor: '#3B82F6',
  },
  actionBtnText: {
    color: '#000000',
    fontSize: 12.5,
    fontWeight: '800',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeBtnText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
});
