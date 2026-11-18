import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { Colors, Typography } from '../theme';
import { useAppDispatch, useAppSelector } from '../store';
import { logout, updateUserProfile } from '../store/authSlice';
import { setCurrentTab, setRadarEnabled } from '../store/hardwareSlice';
import { ApiService } from '../services/api';
import { KitchyAlert } from '../services/kitchyAlert';
import { VectorIcon } from '../components/VectorIcon';
import { SupermarketRadarService } from '../services/supermarketRadarService';
import { RadarDeactivationModal } from '../components/RadarDeactivationModal';

export const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);

  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isRadarModalOpen, setIsRadarModalOpen] = useState(false);

  const isRadarEnabled = useAppSelector((state) => state.hardware.isRadarEnabled);

  const handleToggleRadar = (value: boolean) => {
    if (!value) {
      // Directiva UX: Interceptar desactivación y mostrar modal glassmorphism
      setIsRadarModalOpen(true);
    } else {
      dispatch(setRadarEnabled(true));
      SupermarketRadarService.setRadarEnabled(true);
      SupermarketRadarService.requestNativePermissions();
    }
  };

  const handleConfirmDeactivateRadar = async () => {
    setIsRadarModalOpen(false);
    dispatch(setRadarEnabled(false));
    await SupermarketRadarService.setRadarEnabled(false);
  };

  // Estados para "Mis Datos"
  const [editName, setEditName] = useState(auth.fullName);
  const [editEmail, setEditEmail] = useState(auth.email);

  // Estados para "Cambiar Contraseña"
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmNewPwd, setConfirmNewPwd] = useState('');

  const handleChangeAvatar = async () => {
    try {
      const { launchImageLibrary } = require('react-native-image-picker');
      launchImageLibrary(
        {
          mediaType: 'photo',
          quality: 0.8,
        },
        (response: any) => {
          if (response.didCancel || !response.assets || response.assets.length === 0) {
            return;
          }
          const pickedUri = response.assets[0].uri;
          if (pickedUri) {
            dispatch(updateUserProfile({ avatarUrl: pickedUri }));
            KitchyAlert.show('Avatar actualizado', 'Tu foto de perfil se ha guardado correctamente.');
          }
        }
      );
    } catch {
      KitchyAlert.show('Aviso', 'No fue posible abrir la galería de imágenes.');
    }
  };

  const handleSaveProfileData = () => {
    if (!editName.trim()) {
      KitchyAlert.show('Campo requerido', 'El nombre no puede estar vacío.');
      return;
    }

    dispatch(
      updateUserProfile({
        fullName: editName.trim(),
        email: editEmail.trim(),
      })
    );
    setIsDataModalOpen(false);
    KitchyAlert.show(
      'Datos actualizados',
      'Tu perfil ha sido actualizado correctamente.'
    );
  };

  const handleChangePassword = () => {
    if (!currentPwd.trim() || !newPwd.trim()) {
      KitchyAlert.show(
        'Campos incompletos',
        'Por favor ingresa la contraseña actual y la nueva contraseña.'
      );
      return;
    }

    if (newPwd.length < 6) {
      KitchyAlert.show(
        'Contraseña débil',
        'La nueva contraseña debe contener al menos 6 caracteres.'
      );
      return;
    }

    if (newPwd !== confirmNewPwd) {
      KitchyAlert.show(
        'Error de coincidencia',
        'La confirmación no coincide con la nueva contraseña.'
      );
      return;
    }

    setCurrentPwd('');
    setNewPwd('');
    setConfirmNewPwd('');
    setIsPasswordModalOpen(false);

    KitchyAlert.show(
      'Contraseña actualizada',
      'Tu contraseña se ha cambiado correctamente.'
    );
  };

  const handleLogout = async () => {
    KitchyAlert.show(
      '¿Cerrar sesión?',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            dispatch(setCurrentTab('home'));
            await SupermarketRadarService.handleLogoutCleanup();
            await ApiService.logout();
            dispatch(logout());
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Bar con Título y Botón Volver */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => dispatch(setCurrentTab('home'))}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Mi Perfil</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tarjeta de Identidad del Usuario */}
        <View style={styles.identityCard}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={handleChangeAvatar}
            activeOpacity={0.8}
            testID="btn-change-avatar"
          >
            {auth.avatarUrl ? (
              <Image
                source={{ uri: auth.avatarUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {auth.fullName.substring(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditIconBadge}>
              <VectorIcon name="camera" size={12} color="#000000" />
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>{auth.fullName}</Text>
          <Text style={styles.profileEmail}>{auth.email}</Text>

          <TouchableOpacity
            style={styles.changePhotoBtn}
            onPress={handleChangeAvatar}
            activeOpacity={0.7}
          >
            <Text style={styles.changePhotoBtnText}>Cambiar foto de perfil</Text>
          </TouchableOpacity>

          {/* Badge del Hogar Activo */}
          <View style={styles.houseBadge}>
            <VectorIcon name="house" size={13} color={Colors.primaryGreen} />
            <Text style={styles.houseBadgeText}>
              {auth.activeHouse.name} • Administrador
            </Text>
          </View>
        </View>

        {/* Sección de Seguridad y Ajustes de Cuenta */}
        <Text style={styles.sectionHeader}>GESTIÓN DE CUENTA</Text>

        {/* Botón: Mis Datos */}
        <TouchableOpacity
          style={styles.actionRowCard}
          onPress={() => {
            setEditName(auth.fullName);
            setEditEmail(auth.email);
            setIsDataModalOpen(true);
          }}
          activeOpacity={0.75}
        >
          <View style={styles.actionRowLeft}>
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIconSymbol}>i</Text>
            </View>
            <View>
              <Text style={styles.actionRowTitle}>Mis Datos</Text>
              <Text style={styles.actionRowDesc}>
                Nombre, correo electrónico y preferencias
              </Text>
            </View>
          </View>
          <Text style={styles.actionRowChevron}>›</Text>
        </TouchableOpacity>

        {/* Botón: Cambiar Contraseña */}
        <TouchableOpacity
          style={styles.actionRowCard}
          onPress={() => setIsPasswordModalOpen(true)}
          activeOpacity={0.75}
        >
          <View style={styles.actionRowLeft}>
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIconSymbol}>#</Text>
            </View>
            <View>
              <Text style={styles.actionRowTitle}>Cambiar Contraseña</Text>
              <Text style={styles.actionRowDesc}>
                Actualiza tu clave de acceso de forma segura
              </Text>
            </View>
          </View>
          <Text style={styles.actionRowChevron}>›</Text>
        </TouchableOpacity>

        {/* Sección de Sensores y Hardware */}
        <Text style={styles.sectionHeader}>SENSORES Y GEOFENCING</Text>

        {/* Tarjeta de Control: Radar de Supermercados con Switch */}
        <View style={styles.actionRowCard}>
          <View style={styles.actionRowLeft}>
            <View style={[styles.actionIconBox, isRadarEnabled && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' }]}>
              <VectorIcon name="radar" size={18} color={isRadarEnabled ? '#10B981' : '#6B7280'} />
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.actionRowTitle}>Radar de Supermercados</Text>
              <Text style={styles.actionRowDesc}>
                {isRadarEnabled
                  ? 'Avisos automáticos al pasar a < 150m de un súper con productos pendientes'
                  : 'Desactivado • Cero consumo de batería'}
              </Text>
            </View>
          </View>
          <Switch
            value={isRadarEnabled}
            onValueChange={handleToggleRadar}
            trackColor={{ false: '#3A3A3C', true: '#10B981' }}
            thumbColor="#FFFFFF"
            testID="switch-profile-radar"
          />
        </View>

        {/* Sección de Información y Ayuda */}
        <Text style={styles.sectionHeader}>INFORMACIÓN Y AYUDA</Text>

        {/* Botón: Preguntas Frecuentes (FAQ) */}
        <TouchableOpacity
          style={styles.actionRowCard}
          onPress={() => setIsFaqModalOpen(true)}
          activeOpacity={0.75}
          testID="btn-profile-faq"
        >
          <View style={styles.actionRowLeft}>
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIconSymbol}>?</Text>
            </View>
            <View>
              <Text style={styles.actionRowTitle}>Preguntas Frecuentes (FAQ)</Text>
              <Text style={styles.actionRowDesc}>
                Escáner OCR, semáforo de caducidad y multihogar
              </Text>
            </View>
          </View>
          <Text style={styles.actionRowChevron}>›</Text>
        </TouchableOpacity>

        {/* Botón: Política de Privacidad */}
        <TouchableOpacity
          style={styles.actionRowCard}
          onPress={() => setIsPrivacyModalOpen(true)}
          activeOpacity={0.75}
          testID="btn-profile-privacy"
        >
          <View style={styles.actionRowLeft}>
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIconSymbol}>§</Text>
            </View>
            <View>
              <Text style={styles.actionRowTitle}>Política de Privacidad</Text>
              <Text style={styles.actionRowDesc}>
                Protección de datos personales y privacidad por hogar
              </Text>
            </View>
          </View>
          <Text style={styles.actionRowChevron}>›</Text>
        </TouchableOpacity>

        {/* Información del Sistema Kitchy */}
        <View style={styles.systemInfoCard}>
          <Text style={styles.systemInfoTitle}>Seguridad y Privacidad</Text>
          <Text style={styles.systemInfoText}>
            • Cifrado seguro de credenciales y datos{'\n'}
            • Sincronización en tiempo real{'\n'}
            • Aislamiento y privacidad por hogar
          </Text>
        </View>

        {/* Botón Rojo Suave: Cerrar Sesión */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
          testID="btn-profile-logout"
        >
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal: Mis Datos */}
      <Modal
        visible={isDataModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDataModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar Mis Datos</Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>NOMBRE COMPLETO</Text>
              <TextInput
                style={styles.modalTextInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nombre completo"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>CORREO ELECTRÓNICO</Text>
              <TextInput
                style={styles.modalTextInput}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Correo electrónico"
                placeholderTextColor="#6B7280"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setIsDataModalOpen(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleSaveProfileData}
              >
                <Text style={styles.modalBtnSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Cambiar Contraseña */}
      <Modal
        visible={isPasswordModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPasswordModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
            <Text style={styles.modalSubtitle}>
              Ingresa tu contraseña actual y la nueva clave segura
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>CONTRASEÑA ACTUAL</Text>
              <TextInput
                style={styles.modalTextInput}
                value={currentPwd}
                onChangeText={setCurrentPwd}
                placeholder="Contraseña actual"
                placeholderTextColor="#6B7280"
                secureTextEntry
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>NUEVA CONTRASEÑA (MÍN. 6 CARACTERES)</Text>
              <TextInput
                style={styles.modalTextInput}
                value={newPwd}
                onChangeText={setNewPwd}
                placeholder="Nueva contraseña segura"
                placeholderTextColor="#6B7280"
                secureTextEntry
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>CONFIRMAR NUEVA CONTRASEÑA</Text>
              <TextInput
                style={styles.modalTextInput}
                value={confirmNewPwd}
                onChangeText={setConfirmNewPwd}
                placeholder="Repite la nueva contraseña"
                placeholderTextColor="#6B7280"
                secureTextEntry
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setIsPasswordModalOpen(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleChangePassword}
              >
                <Text style={styles.modalBtnSaveText}>Actualizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Preguntas Frecuentes (FAQ) */}
      <Modal
        visible={isFaqModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFaqModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.infoModalCard]}>
            <Text style={styles.modalTitle}>Preguntas Frecuentes (FAQ)</Text>
            <Text style={styles.modalSubtitle}>
              Guía de uso y funcionamiento del ecosistema Kitchy
            </Text>

            <ScrollView style={styles.infoScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>¿Cómo funciona el escaneo OCR de tickets?</Text>
                <Text style={styles.faqAnswer}>
                  Kitchy utiliza reconocimiento óptico de caracteres (OCR) sobre la imagen capturada para extraer artículos, cantidades y precios. Si el formato coincide con tickets habituales de supermercado, se clasifican automáticamente en tu despensa.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>¿Cómo se calcula el semáforo de caducidad?</Text>
                <Text style={styles.faqAnswer}>
                  Los alimentos en estado crítico (menos de 48 horas) se marcan en rojo o ámbar. El algoritmo asigna fechas estimadas según el tipo de producto (carne 1-2 días, lácteos 3-5 días, no perecederos 14+ días), siempre editables a mano.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>¿Cómo se sincroniza el inventario entre compañeros?</Text>
                <Text style={styles.faqAnswer}>
                  Cada hogar sincroniza su inventario en tiempo real. Cualquier alta, modificación o consumo de alimentos se actualiza inmediatamente en los dispositivos de todos los miembros del hogar.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>¿Cómo funciona la geovalla de compra urgente?</Text>
                <Text style={styles.faqAnswer}>
                  Cuando marcas la lista como urgente y te aproximas a menos de 150 metros de un supermercado abierto, Kitchy te envía un aviso para que puedas comprar lo que falta sin duplicar gastos.
                </Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>¿Cómo añado alimentos a la lista de la compra?</Text>
                <Text style={styles.faqAnswer}>
                  Puedes añadir artículos escribiendo su nombre en el campo de texto y pulsando Enter o el botón (+), o utilizar el micrófono del teclado de tu dispositivo para dictarlo rápidamente.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnSave, { marginTop: 14 }]}
              onPress={() => setIsFaqModalOpen(false)}
            >
              <Text style={styles.modalBtnSaveText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Política de Privacidad */}
      <Modal
        visible={isPrivacyModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPrivacyModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.infoModalCard]}>
            <Text style={styles.modalTitle}>Política de Privacidad y RGPD</Text>
            <Text style={styles.modalSubtitle}>
              Compromiso de protección de datos personales de Kitchy ISM
            </Text>

            <ScrollView style={styles.infoScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.privacySection}>
                <Text style={styles.privacyHeading}>1. Aislamiento Estricto por Hogar</Text>
                <Text style={styles.privacyBody}>
                  Tus datos de despensa, compras y mensajes están protegidos y aislados, garantizando que únicamente los miembros autorizados de tu hogar tengan acceso.
                </Text>
              </View>

              <View style={styles.privacySection}>
                <Text style={styles.privacyHeading}>2. Criptografía y Almacenamiento Seguro</Text>
                <Text style={styles.privacyBody}>
                  Las contraseñas se almacenan mediante algoritmos de cifrado irreversible y seguro. Todas las comunicaciones con el servidor emplean cifrado seguro TLS de extremo a extremo.
                </Text>
              </View>

              <View style={styles.privacySection}>
                <Text style={styles.privacyHeading}>3. Privacidad de Geolocalización (Zero-Tracking)</Text>
                <Text style={styles.privacyBody}>
                  La comprobación de cercanía a supermercados se realiza localmente en el dispositivo. Kitchy nunca almacena tu historial de ubicaciones ni envía tus coordenadas GPS al servidor.
                </Text>
              </View>

              <View style={styles.privacySection}>
                <Text style={styles.privacyHeading}>4. Datos de Audio y Reconocimiento de Voz</Text>
                <Text style={styles.privacyBody}>
                  El micrófono únicamente se activa cuando inicias la captura conscientemente. Las transcripciones no se guardan como archivos de audio ni se comparten con terceros.
                </Text>
              </View>

              <View style={styles.privacySection}>
                <Text style={styles.privacyHeading}>5. Derechos del Usuario (ARCO / RGPD)</Text>
                <Text style={styles.privacyBody}>
                  Tienes derecho a acceder, rectificar o solicitar la eliminación total de tu cuenta y datos en cualquier momento desde esta pantalla o contactando con el administrador.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnSave, { marginTop: 14 }]}
              onPress={() => setIsPrivacyModalOpen(false)}
            >
              <Text style={styles.modalBtnSaveText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Kitchy de Confirmación Glassmorphism para Desactivar Radar */}
      <RadarDeactivationModal
        visible={isRadarModalOpen}
        onCancel={() => setIsRadarModalOpen(false)}
        onConfirmDeactivate={handleConfirmDeactivateRadar}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1C1C22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  topBarTitle: {
    fontSize: 18,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  topBarSpacer: {
    width: 38,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 140,
  },
  identityCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2.5,
    borderColor: Colors.primaryGreen,
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#26262E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primaryGreen,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primaryGreen,
  },
  avatarEditIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  changePhotoBtn: {
    marginTop: 6,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
  },
  changePhotoBtnText: {
    fontSize: 12,
    color: Colors.primaryGreen,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '600',
  },
  onlineStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primaryGreen,
    borderWidth: 2.5,
    borderColor: '#1C1C1E',
  },
  profileName: {
    fontSize: 20,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: '#9CA3AF',
    marginBottom: 14,
  },
  houseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  houseBadgeText: {
    color: Colors.primaryGreen,
    fontSize: 11.5,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
    marginLeft: 6,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  actionRowCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 12,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#26262E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionIconSymbol: {
    color: Colors.primaryGreen,
    fontSize: 15,
    fontWeight: 'bold',
  },
  actionRowTitle: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
  },
  actionRowDesc: {
    color: '#9CA3AF',
    fontSize: 11.5,
    marginTop: 2,
  },
  actionRowChevron: {
    color: '#6B7280',
    fontSize: 22,
    fontWeight: '300',
    marginLeft: 8,
  },
  systemInfoCard: {
    backgroundColor: '#18181C',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  systemInfoTitle: {
    color: '#D1D5DB',
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
    marginBottom: 6,
  },
  systemInfoText: {
    color: '#6B7280',
    fontSize: 11,
    lineHeight: 18,
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 14.5,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 6,
  },
  modalTextInput: {
    backgroundColor: '#26262E',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#FFFFFF',
    fontSize: 13.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#26262E',
  },
  modalBtnCancelText: {
    color: '#D1D5DB',
    fontSize: 13.5,
    fontWeight: '600',
  },
  modalBtnSave: {
    backgroundColor: Colors.primaryGreen,
  },
  modalBtnSaveText: {
    color: '#000000',
    fontSize: 13.5,
    fontWeight: '800',
  },
  infoModalCard: {
    maxHeight: '80%',
  },
  infoScroll: {
    maxHeight: 380,
    marginTop: 8,
  },
  faqItem: {
    backgroundColor: '#26262E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  faqQuestion: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Typography.bodySemiBold,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
    fontFamily: Typography.body,
  },
  privacySection: {
    backgroundColor: '#26262E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  privacyHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryGreen,
    fontFamily: Typography.bodySemiBold,
    marginBottom: 6,
  },
  privacyBody: {
    fontSize: 12,
    color: '#E5E7EB',
    lineHeight: 18,
    fontFamily: Typography.body,
  },
});

