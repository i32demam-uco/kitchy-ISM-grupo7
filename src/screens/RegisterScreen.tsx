import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Image,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Colors, Typography } from '../theme';
import { useAppDispatch } from '../store';
import { setCredentials } from '../store/authSlice';
import { ApiService } from '../services/api';
import { KitchyAlert } from '../services/kitchyAlert';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  onRegisterSuccess: () => void;
}

const { width, height } = Dimensions.get('window');

const DARK_KITCHEN_BG =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200';

const LOGO_REG_WIDTH = 224;
const LOGO_REG_HEIGHT = LOGO_REG_WIDTH * (341 / 988);

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onNavigateToLogin,
  onRegisterSuccess,
}) => {
  const dispatch = useAppDispatch();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      KitchyAlert.show(
        'Campos incompletos',
        'Por favor completa todos los campos del formulario.'
      );
      return;
    }

    if (password.length < 6) {
      KitchyAlert.show(
        'Contraseña débil',
        'La contraseña debe contener al menos 6 caracteres por seguridad.'
      );
      return;
    }

    if (password !== confirmPassword) {
      KitchyAlert.show(
        'Las contraseñas no coinciden',
        'Asegúrate de que ambas contraseñas escritas sean exactamente iguales.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await ApiService.register(
        email.trim(),
        password,
        fullName.trim()
      );
      dispatch(
        setCredentials({
          token: response.token,
          userId: response.userId,
          email: response.email,
          fullName: response.fullName,
          defaultHouseId: response.defaultHouseId,
        })
      );
      KitchyAlert.show(
        '¡Registro completado!',
        `Bienvenido a Kitchy, ${response.fullName}. Tu cuenta está lista para usarse.`
      );
      onRegisterSuccess();
    } catch {
      KitchyAlert.show(
        'Error en el registro',
        'No fue posible completar el registro. Por favor, comprueba tus datos o inténtalo de nuevo.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: DARK_KITCHEN_BG }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={styles.darkBackdropOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.avoidingContainer}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Cabecera con Logotipo Kitchy Oficial Transparente */}
            <View style={styles.headerArea}>
              <Image
                source={require('../assets/images/logo_splash.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.appTagline}>• T U  C O C I N A  I N T E L I G E N T E •</Text>
            </View>

            {/* Tarjeta Glassmorphism de Registro */}
            <View style={styles.glassCard}>
              <Text style={styles.cardTitle}>Crear Cuenta</Text>
              <Text style={styles.cardSubtitle}>
                Regístrate para colaborar en tiempo real con tus compañeros
              </Text>

              {/* Input: Nombre Completo */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NOMBRE COMPLETO</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.inputField}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="ej. Alejandro Gallardo"
                    placeholderTextColor="#6B7280"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Input: Correo Electrónico */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CORREO ELECTRÓNICO</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.inputField}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="ej. usuario@uco.es"
                    placeholderTextColor="#6B7280"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Input: Contraseña */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONTRASEÑA (MÍN. 6 CARACTERES)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.inputField}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Crea una contraseña segura"
                    placeholderTextColor="#6B7280"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.showPasswordBtn}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.showPasswordText}>
                      {showPassword ? 'Ocultar' : 'Ver'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Input: Confirmar Contraseña */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONFIRMAR CONTRASEÑA</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.inputField}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Repite tu contraseña"
                    placeholderTextColor="#6B7280"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Botón Principal: Registrarme */}
              <TouchableOpacity
                style={styles.registerButton}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.88}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={styles.registerButtonText}>Crear Mi Cuenta</Text>
                )}
              </TouchableOpacity>

              {/* Enlace para volver a Iniciar Sesión */}
              <TouchableOpacity
                style={styles.switchAuthRow}
                onPress={onNavigateToLogin}
                activeOpacity={0.7}
              >
                <Text style={styles.switchAuthPrompt}>
                  ¿Ya tienes una cuenta?{' '}
                </Text>
                <Text style={styles.switchAuthAction}>Inicia sesión</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B0E',
  },
  darkBackdropOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 11, 14, 0.88)',
  },
  avoidingContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 36,
  },
  headerArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: LOGO_REG_WIDTH,
    height: LOGO_REG_HEIGHT,
    marginBottom: 8,
    shadowColor: Colors.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
  },
  appTagline: {
    fontSize: 10.5,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 3.5,
    textAlign: 'center',
  },
  glassCard: {
    backgroundColor: 'rgba(28, 28, 30, 0.94)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12.5,
    fontFamily: Typography.body,
    color: '#9CA3AF',
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26262E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
  },
  inputField: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: Typography.body,
    paddingVertical: 11,
  },
  showPasswordBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  showPasswordText: {
    color: Colors.primaryGreen,
    fontSize: 12,
    fontWeight: '700',
  },
  registerButton: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  registerButtonText: {
    color: '#000000',
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  switchAuthRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchAuthPrompt: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  switchAuthAction: {
    color: Colors.primaryGreen,
    fontSize: 13,
    fontWeight: '700',
  },
});
