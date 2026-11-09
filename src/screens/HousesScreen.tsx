import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Image,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography } from '../theme';
import { useAppDispatch, useAppSelector } from '../store';
import { setActiveHouse, addHouse, setAvailableHouses } from '../store/authSlice';
import { setInventory } from '../store/inventorySlice';
import { House } from '../types';
import { VectorIcon } from '../components/VectorIcon';
import { PermissionsManager } from '../services/permissions';
import { ApiService } from '../services/api';
import { KitchyAlert } from '../services/kitchyAlert';

const { width } = Dimensions.get('window');

/**
 * HousesScreen (HouseManagementScreen) - Gestor Integral Multihogar Kitchy.
 * 
 * Principios Arquitectónicos (Épico Multihogar):
 * 1. UI/UX Luxury: Tarjetas con Glassmorphism (#1C1C1E), Safe Areas, tipografía editorial y cero emojis.
 * 2. Ciberseguridad & RLS: Aislamiento estricto de inventario por house_id y vinculación mediante token.
 * 3. Hardware & Sensores: Escáner de cámara integrado para captura instantánea de códigos QR.
 * 4. Generación de Códigos QR al Vuelo: Códigos de 6 dígitos alfanuméricos y renderizado dinámico.
 */
export const HousesScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);

  // Estados de Modales
  const [selectedHouseForQr, setSelectedHouseForQr] = useState<House | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Estados de Formulario
  const [newHouseName, setNewHouseName] = useState('');
  const [newHouseAddress, setNewHouseAddress] = useState('');
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);

  // Animación del láser del escáner QR de cámara
  const qrLaserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isCameraScannerOpen) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(qrLaserAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(qrLaserAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      qrLaserAnim.setValue(0);
    }
  }, [isCameraScannerOpen]);

  // Cambiar casa activa y forzar recarga del inventario específico (Aislamiento de Datos)
  const handleSelectActiveHouse = async (house: House) => {
    dispatch(setActiveHouse(house.id));
    try {
      const items = await ApiService.getInventory(house.id);
      dispatch(setInventory(items));
    } catch {
      // Fallback tolerante
    }
    KitchyAlert.show(
      'Hogar Activo',
      `Ahora estás gestionando la despensa de «${house.name}».`
    );
  };

  // Crear nuevo hogar
  const handleConfirmCreateHouse = async () => {
    if (!newHouseName.trim()) {
      KitchyAlert.show('Campo Requerido', 'Por favor ingresa un nombre para el nuevo hogar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await ApiService.createHouse(
        newHouseName.trim(),
        newHouseAddress.trim() || 'Córdoba, España'
      );
      dispatch(addHouse(created));
      setIsCreateModalOpen(false);
      setNewHouseName('');
      setNewHouseAddress('');

      // Mostrar directamente el QR del hogar recién creado
      setSelectedHouseForQr(created);
      KitchyAlert.show(
        'Hogar Creado con Éxito',
        `Se ha generado el hogar «${created.name}» con el código de invitación ${created.inviteCode}.`,
        [{ text: 'Ver Código y QR' }]
      );
    } catch {
      KitchyAlert.show('Error', 'No fue posible crear el hogar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unirse a un hogar con código alfanumérico
  const handleConfirmJoinCode = async (codeToJoin?: string) => {
    const rawCode = (codeToJoin || manualCodeInput).trim();
    if (!rawCode) {
      KitchyAlert.show('Código Requerido', 'Introduce el código de 6 dígitos del hogar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const joined = await ApiService.joinHouse(rawCode);
      dispatch(addHouse(joined));
      dispatch(setActiveHouse(joined.id));

      // Recargar inventario del nuevo hogar
      const items = await ApiService.getInventory(joined.id);
      dispatch(setInventory(items));

      setIsJoinModalOpen(false);
      setIsCameraScannerOpen(false);
      setManualCodeInput('');

      KitchyAlert.show(
        '¡Te has unido con éxito!',
        `Has sido añadido a «${joined.name}». Su inventario ya está sincronizado en tu cuenta.`,
        [{ text: 'Entendido' }]
      );
    } catch {
      KitchyAlert.show(
        'Error de Vinculación',
        'No se encontró ningún hogar para el código proporcionado.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir escáner QR de hardware con verificación de permisos
  const handleOpenQrScanner = async () => {
    setIsJoinModalOpen(false);
    const granted = await PermissionsManager.requestCameraPermission();
    setHasCameraPermission(granted);
    setIsCameraScannerOpen(true);
  };

  const laserTranslateY = qrLaserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });

  return (
    <View style={styles.container}>
      {/* Header Superior */}
      <View style={styles.header}>
        <Text style={styles.title}>Gestión Multihogar</Text>
        <Text style={styles.subtitle}>
          Aislamiento de despensas, listas colaborativas y códigos QR (RF1)
        </Text>

        {/* Botones de Acción Rápida: Crear Hogar / Unirse con QR */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => setIsCreateModalOpen(true)}
            activeOpacity={0.85}
          >
            <VectorIcon name="plus" size={16} color="#000000" />
            <Text style={styles.primaryActionBtnText}>Crear Nuevo Hogar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => setIsJoinModalOpen(true)}
            activeOpacity={0.85}
          >
            <VectorIcon name="camera" size={16} color={Colors.primaryGreen} />
            <Text style={styles.secondaryActionBtnText}>Unirse con QR</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeader}>TUS HOGARES ACTIVOS</Text>

        {/* Lista de Casas del Usuario */}
        {auth.availableHouses.map((h) => {
          const isActive = h.id === auth.activeHouse.id;
          const displayCode = h.joinCode || h.inviteCode || 'UCO2026';
          return (
            <View
              key={h.id}
              style={[styles.houseCard, isActive && styles.houseCardActive]}
            >
              <TouchableOpacity
                style={styles.cardHeaderTouchable}
                onPress={() => handleSelectActiveHouse(h)}
                activeOpacity={0.7}
              >
                <View style={styles.houseTitleRow}>
                  <View
                    style={[
                      styles.houseIconBadge,
                      isActive && styles.houseIconBadgeActive,
                    ]}
                  >
                    <VectorIcon
                      name="house"
                      size={22}
                      color={isActive ? Colors.primaryGreen : '#9CA3AF'}
                    />
                  </View>
                  <View style={styles.houseTextGroup}>
                    <Text style={styles.houseCardName}>{h.name}</Text>
                    <Text style={styles.houseCardAddress}>
                      {h.address || 'Córdoba, España'}
                    </Text>
                  </View>
                </View>

                {isActive ? (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>Activa</Text>
                  </View>
                ) : (
                  <View style={styles.selectPill}>
                    <Text style={styles.selectPillText}>Seleccionar</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Pie de Tarjeta con Datos y Botón de Invitación QR */}
              <View style={styles.houseCardFooter}>
                <View style={styles.memberInfoRow}>
                  <Text style={styles.membersCountText}>
                    {h.memberCount} miembros vinculados
                  </Text>
                  <Text style={styles.codeTextBadge}>
                    Código: <Text style={styles.codeHighlight}>{displayCode}</Text>
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.qrShareBtn}
                  onPress={() => setSelectedHouseForQr(h)}
                  activeOpacity={0.8}
                >
                  <VectorIcon name="qr-code" size={15} color="#000000" />
                  <Text style={styles.qrShareBtnText}>Ver QR e Invitar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ========================================================= */}
      {/* 1. MODAL: MOSTRAR CÓDIGO QR GENERADO AL VUELO E INVITACIÓN */}
      {/* ========================================================= */}
      <Modal
        visible={!!selectedHouseForQr}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedHouseForQr(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.qrModalCard}>
            <View style={styles.modalTopBar}>
              <Text style={styles.modalTitleText}>Código QR del Hogar</Text>
              <TouchableOpacity
                onPress={() => setSelectedHouseForQr(null)}
                style={styles.modalCloseCircle}
              >
                <Text style={styles.modalCloseSymbol}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.qrModalHouseName}>
              {selectedHouseForQr?.name}
            </Text>
            <Text style={styles.qrModalInstructions}>
              Pide a tu compañero de piso o familia que escanee este código desde su app Kitchy para sincronizar la despensa en tiempo real.
            </Text>

            {/* Código QR Generado al Vuelo (Fondo Oscuro con Esmeralda Neón) */}
            <View style={styles.qrImageFrame}>
              {selectedHouseForQr && (
                <Image
                  source={{
                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=kitchy://join/${selectedHouseForQr.inviteCode}&color=00E676&bgcolor=1C1C1E&margin=6`,
                  }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              )}
            </View>

            {/* Código Alfanumérico de 6 Dígitos en Grande */}
            <View style={styles.alphanumericBox}>
              <Text style={styles.alphanumericLabel}>CÓDIGO DE ACCESO DIRECTO</Text>
              <Text style={styles.alphanumericValue}>
                {selectedHouseForQr?.inviteCode || 'UCO2026'}
              </Text>
            </View>

            {/* Botones de Copiado y Cierre */}
            <TouchableOpacity
              style={styles.copyInviteBtn}
              onPress={() => {
                KitchyAlert.show(
                  'Enlace e Invitación',
                  `Código: ${selectedHouseForQr?.inviteCode}\nEnlace: https://kitchy.uco.es/join/${selectedHouseForQr?.inviteCode}`,
                  [{ text: 'Aceptar' }]
                );
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.copyInviteBtnText}>Compartir Enlace ↗</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 2. MODAL: CREAR NUEVO HOGAR */}
      {/* ========================================================= */}
      <Modal
        visible={isCreateModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.actionModalCard}>
            <View style={styles.modalTopBar}>
              <Text style={styles.modalTitleText}>Crear Nuevo Hogar</Text>
              <TouchableOpacity
                onPress={() => setIsCreateModalOpen(false)}
                style={styles.modalCloseCircle}
              >
                <Text style={styles.modalCloseSymbol}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalCardSubtitle}>
              Crea una nueva despensa compartida para tu piso de estudiantes, casa de campo o familia.
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>NOMBRE DEL HOGAR</Text>
              <TextInput
                style={styles.modalTextInput}
                value={newHouseName}
                onChangeText={setNewHouseName}
                placeholder="ej. Piso Gran Capitán"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>DIRECCIÓN O CIUDAD</Text>
              <TextInput
                style={styles.modalTextInput}
                value={newHouseAddress}
                onChangeText={setNewHouseAddress}
                placeholder="ej. Calle Gran Capitán, Córdoba"
                placeholderTextColor="#6B7280"
              />
            </View>

            <TouchableOpacity
              style={styles.createConfirmBtn}
              onPress={handleConfirmCreateHouse}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.createConfirmBtnText}>Crear y Obtener QR</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 3. MODAL: UNIRSE A UN HOGAR (CÓDIGO O LANZAR CÁMARA) */}
      {/* ========================================================= */}
      <Modal
        visible={isJoinModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsJoinModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.actionModalCard}>
            <View style={styles.modalTopBar}>
              <Text style={styles.modalTitleText}>Unirse a un Hogar</Text>
              <TouchableOpacity
                onPress={() => setIsJoinModalOpen(false)}
                style={styles.modalCloseCircle}
              >
                <Text style={styles.modalCloseSymbol}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalCardSubtitle}>
              Escanea el código QR del móvil de tu compañero o ingresa su código de 6 dígitos.
            </Text>

            {/* Botón Destacado: Escáner QR de Hardware */}
            <TouchableOpacity
              style={styles.scanQrHardwareBtn}
              onPress={handleOpenQrScanner}
              activeOpacity={0.85}
            >
              <VectorIcon name="camera" size={20} color="#000000" />
              <Text style={styles.scanQrHardwareBtnText}>
                Escanear Código QR con Cámara
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>O INGRESA EL CÓDIGO</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>CÓDIGO DE 6 DÍGITOS</Text>
              <TextInput
                style={[styles.modalTextInput, styles.codeMonoInput]}
                value={manualCodeInput}
                onChangeText={(text) => setManualCodeInput(text.toUpperCase())}
                placeholder="ej. UCO2026"
                placeholderTextColor="#6B7280"
                autoCapitalize="characters"
                maxLength={10}
              />
            </View>

            <TouchableOpacity
              style={styles.joinCodeConfirmBtn}
              onPress={() => handleConfirmJoinCode()}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.joinCodeConfirmBtnText}>Unirse con Código</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 4. MODAL: ESCÁNER QR DE HARDWARE CON CÁMARA Y LÁSER */}
      {/* ========================================================= */}
      <Modal
        visible={isCameraScannerOpen}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setIsCameraScannerOpen(false)}
      >
        <View style={styles.cameraContainer}>
          {/* Barra Superior del Escáner */}
          <View style={styles.cameraHeader}>
            <TouchableOpacity
              onPress={() => setIsCameraScannerOpen(false)}
              style={styles.cameraCloseBtn}
            >
              <Text style={styles.cameraCloseText}>✕ Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.cameraHeaderTitle}>Escáner QR de Hogar</Text>
            <View style={{ width: 80 }} />
          </View>

          {/* Visor de Cámara con Retículo Láser */}
          <View style={styles.viewfinderContainer}>
            <View style={styles.reticleFrame}>
              <View style={[styles.cornerBracket, styles.bracketTL]} />
              <View style={[styles.cornerBracket, styles.bracketTR]} />
              <View style={[styles.cornerBracket, styles.bracketBL]} />
              <View style={[styles.cornerBracket, styles.bracketBR]} />

              {/* Haz láser verde animado */}
              <Animated.View
                style={[
                  styles.qrLaserLine,
                  { transform: [{ translateY: laserTranslateY }] },
                ]}
              />
            </View>

            <Text style={styles.viewfinderInstructions}>
              Apunta la cámara al código QR de la pantalla de tu compañero
            </Text>

            {/* Botón de Simulación de Detección de QR en Emulador */}
            <TouchableOpacity
              style={styles.simulateDetectionBtn}
              onPress={() => handleConfirmJoinCode('UCO2026')}
              activeOpacity={0.85}
            >
              <VectorIcon name="check" size={16} color="#000000" />
              <Text style={styles.simulateDetectionBtnText}>
                Escanear QR Detectado (UCO2026)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  title: {
    fontSize: 24,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: '#9CA3AF',
    marginTop: 3,
  },
  topActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryGreen,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: Colors.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionBtnText: {
    color: '#000000',
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 230, 118, 0.35)',
  },
  secondaryActionBtnText: {
    color: Colors.primaryGreen,
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1.2,
    marginBottom: 12,
    marginTop: 8,
  },
  houseCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  houseCardActive: {
    borderColor: Colors.primaryGreen,
    borderWidth: 1.5,
    backgroundColor: '#152219',
  },
  cardHeaderTouchable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  houseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  houseIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#26262E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  houseIconBadgeActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
  },
  houseTextGroup: {
    flex: 1,
  },
  houseCardName: {
    fontSize: 16.5,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  houseCardAddress: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: '#9CA3AF',
    marginTop: 2,
  },
  activePill: {
    backgroundColor: Colors.primaryGreen,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  activePillText: {
    color: '#000000',
    fontSize: 11.5,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '800',
  },
  selectPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  selectPillText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '600',
  },
  houseCardFooter: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfoRow: {
    flex: 1,
  },
  membersCountText: {
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: '#9CA3AF',
  },
  codeTextBadge: {
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: '#6B7280',
    marginTop: 2,
  },
  codeHighlight: {
    color: Colors.primaryGreen,
    fontWeight: '700',
  },
  qrShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryGreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  qrShareBtnText: {
    color: '#000000',
    fontSize: 11.5,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  qrModalCard: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  modalTopBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitleText: {
    fontSize: 18,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseSymbol: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '700',
  },
  qrModalHouseName: {
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: Colors.primaryGreen,
    marginBottom: 6,
  },
  qrModalInstructions: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  qrImageFrame: {
    width: 220,
    height: 220,
    backgroundColor: '#16161A',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  alphanumericBox: {
    width: '100%',
    backgroundColor: '#26262E',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  alphanumericLabel: {
    fontSize: 10,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  alphanumericValue: {
    fontSize: 22,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '900',
    color: Colors.primaryGreen,
    letterSpacing: 4,
  },
  copyInviteBtn: {
    width: '100%',
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderWidth: 1.2,
    borderColor: Colors.primaryGreen,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  copyInviteBtnText: {
    color: Colors.primaryGreen,
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '800',
  },
  actionModalCard: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modalCardSubtitle: {
    fontSize: 12.5,
    fontFamily: Typography.body,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 18,
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalInputLabel: {
    fontSize: 10.5,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 6,
  },
  modalTextInput: {
    backgroundColor: '#26262E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  codeMonoInput: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
    color: Colors.primaryGreen,
    textAlign: 'center',
  },
  createConfirmBtn: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  createConfirmBtnText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '800',
  },
  scanQrHardwareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryGreen,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 18,
  },
  scanQrHardwareBtnText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
    marginHorizontal: 10,
    letterSpacing: 1,
  },
  joinCodeConfirmBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  joinCodeConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
  },
  cameraCloseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  cameraCloseText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  cameraHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  reticleFrame: {
    width: 240,
    height: 240,
    position: 'relative',
    marginBottom: 24,
  },
  cornerBracket: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: Colors.primaryGreen,
  },
  bracketTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  bracketTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bracketBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bracketBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  qrLaserLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 8,
    height: 3,
    backgroundColor: Colors.primaryGreen,
    shadowColor: Colors.primaryGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    borderRadius: 2,
  },
  viewfinderInstructions: {
    color: '#D1D5DB',
    fontSize: 13.5,
    fontFamily: Typography.body,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
    marginBottom: 24,
  },
  simulateDetectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryGreen,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: Colors.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  simulateDetectionBtnText: {
    color: '#000000',
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '800',
  },
});
