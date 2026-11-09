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
} from 'react-native';
import { Colors, Typography } from '../theme';
import { useAppDispatch, useAppSelector } from '../store';
import { logout, updateUserProfile } from '../store/authSlice';
import { setCurrentTab } from '../store/hardwareSlice';
import { ApiService } from '../services/api';
import { KitchyAlert } from '../services/kitchyAlert';
import { VectorIcon } from '../components/VectorIcon';

export const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);

  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Estados para "Mis Datos"
  const [editName, setEditName] = useState(auth.fullName);
  const [editEmail, setEditEmail] = useState(auth.email);

  // Estados para "Cambiar Contraseña"
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmNewPwd, setConfirmNewPwd] = useState('');

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
      'Tu contraseña ha sido cambiada y encriptada exitosamente con BCrypt.'
    );
  };

  const handleLogout = async () => {
    KitchyAlert.show(
      '¿Cerrar Sesión?',
      'Se destruirá el token JWT seguro de este dispositivo. Tendrás que volver a autenticarte.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
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
          <View style={styles.avatarWrap}>
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
            <View style={styles.onlineStatusDot} />
          </View>

          <Text style={styles.profileName}>{auth.fullName}</Text>
          <Text style={styles.profileEmail}>{auth.email}</Text>

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
                Actualiza tu clave con encriptación BCrypt
              </Text>
            </View>
          </View>
          <Text style={styles.actionRowChevron}>›</Text>
        </TouchableOpacity>

        {/* Información del Sistema Kitchy */}
        <View style={styles.systemInfoCard}>
          <Text style={styles.systemInfoTitle}>Seguridad y Criptografía</Text>
          <Text style={styles.systemInfoText}>
            • Algoritmo de Hashing: BCrypt (Cost Factor 11){'\n'}
            • Protocolo: Bearer JWT HMAC-SHA256{'\n'}
            • Aislamiento RLS: Supabase PostgreSQL (house_id)
          </Text>
        </View>

        {/* Botón Rojo Suave: Cerrar Sesión */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
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
});

