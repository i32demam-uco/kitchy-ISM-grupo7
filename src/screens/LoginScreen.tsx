import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Colors, Typography } from '../theme';
import { useAppDispatch, useAppSelector } from '../store';
import { setCredentials } from '../store/authSlice';
import { setCurrentTab, setPendingNfcRedirect } from '../store/hardwareSlice';
import { ApiService } from '../services/api';
import { KitchyAlert } from '../services/kitchyAlert';
import { NfcService } from '../services/nfcService';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onLoginSuccess: () => void;
}

const { width } = Dimensions.get('window');

// Fotografía fotorrealista de alta calidad de una cocina oscura, minimalista y elegante
const DARK_KITCHEN_BG =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200';

const LOGO_LOGIN_WIDTH = 224;
const LOGO_LOGIN_HEIGHT = LOGO_LOGIN_WIDTH * (341 / 988);

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToRegister,
  onLoginSuccess,
}) => {
  const dispatch = useAppDispatch();
  const pendingNfc = useAppSelector((state) => state.hardware.pendingNfcRedirect);
  const [email, setEmail] = useState('aleja@uco.es');
  const [password, setPassword] = useState('Kitchy2026!');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      KitchyAlert.show(
        'Campos incompletos',
        'Por favor introduce tu correo electrónico y contraseña.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await ApiService.login(email.trim(), password);
      dispatch(
        setCredentials({
          token: response.token,
          userId: response.userId,
          email: response.email,
          fullName: response.fullName,
          defaultHouseId: response.defaultHouseId,
        })
      );

      // Si el usuario escaneó una etiqueta NFC previamente estando deslogueado,
      // redirigir directamente a la Lista de la Compra y enfocar el input
      const pendingRedirect =
        pendingNfc || (await NfcService.getPendingRedirect());

      if (pendingRedirect) {
        NfcService.handleRedirection(pendingRedirect, dispatch);
        dispatch(setPendingNfcRedirect(null));
        await NfcService.clearPendingRedirect();
      } else {
        // Por defecto, forzar destino en Dashboard (Inicio)
        dispatch(setCurrentTab('home'));
      }
      onLoginSuccess();
    } catch {
      KitchyAlert.show(
        'Error de inicio de sesión',
        'No fue posible iniciar sesión. Por favor, comprueba tu correo y contraseña.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Kitchy2026!');
  };

  return (
    <View style={styles.container}>
      {/* Fotografía de Fondo: Cocina Oscura y Minimalista */}
      <Image
        source={{ uri: DARK_KITCHEN_BG }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {/* Overlay oscuro para garantizar legibilidad y profundidad visual */}
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

            {/* Tarjeta Glassmorphism de Autenticación */}
            <View style={styles.glassCard}>
              <Text style={styles.cardTitle}>Iniciar Sesión</Text>
              <Text style={styles.cardSubtitle}>
                Accede a la despensa y recetario de tu hogar
              </Text>

              {/* Input: Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CORREO ELECTRÓNICO</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.inputField}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="ej. aleja@uco.es"
                    placeholderTextColor="#6B7280"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Input: Contraseña */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONTRASEÑA</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.inputField}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Introduce tu contraseña"
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

              {/* Selector Rápido de Cuentas Demo UCO */}
              <View style={styles.demoPillsArea}>
                <Text style={styles.demoTitle}>Acceso Rápido Demo UCO:</Text>
                <View style={styles.demoRow}>
                  <TouchableOpacity
                    style={[
                      styles.demoPill,
                      email === 'aleja@uco.es' && styles.demoPillActive,
                    ]}
                    onPress={() => handleQuickDemoLogin('aleja@uco.es')}
                  >
                    <Text
                      style={[
                        styles.demoPillText,
                        email === 'aleja@uco.es' && styles.demoPillTextActive,
                      ]}
                    >
                      Alejandro
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.demoPill,
                      email === 'jp@uco.es' && styles.demoPillActive,
                    ]}
                    onPress={() => handleQuickDemoLogin('jp@uco.es')}
                  >
                    <Text
                      style={[
                        styles.demoPillText,
                        email === 'jp@uco.es' && styles.demoPillTextActive,
                      ]}
                    >
                      JP
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.demoPill,
                      email === 'david@uco.es' && styles.demoPillActive,
                    ]}
                    onPress={() => handleQuickDemoLogin('david@uco.es')}
                  >
                    <Text
                      style={[
                        styles.demoPillText,
                        email === 'david@uco.es' && styles.demoPillTextActive,
                      ]}
                    >
                      David
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Botón Principal: Entrar */}
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.88}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={styles.loginButtonText}>Entrar a Kitchy</Text>
                )}
              </TouchableOpacity>

              {/* Enlace para Registro */}
              <TouchableOpacity
                style={styles.switchAuthRow}
                onPress={onNavigateToRegister}
                activeOpacity={0.7}
              >
                <Text style={styles.switchAuthPrompt}>
                  ¿Aún no tienes cuenta?{' '}
                </Text>
                <Text style={styles.switchAuthAction}>Regístrate gratis</Text>
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
    marginBottom: 24,
  },
  logoImage: {
    width: LOGO_LOGIN_WIDTH,
    height: LOGO_LOGIN_HEIGHT,
    marginBottom: 10,
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
    fontSize: 13,
    fontFamily: Typography.body,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 10.5,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#24242A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
  },
  inputField: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.body,
    paddingVertical: 12,
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
  demoPillsArea: {
    marginTop: 4,
    marginBottom: 18,
  },
  demoTitle: {
    fontSize: 10.5,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 6,
  },
  demoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoPill: {
    backgroundColor: '#24242A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  demoPillActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: Colors.primaryGreen,
  },
  demoPillText: {
    fontSize: 11.5,
    color: '#D1D5DB',
    fontWeight: '600',
  },
  demoPillTextActive: {
    color: Colors.primaryGreen,
    fontWeight: '700',
  },
  loginButton: {
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
    marginTop: 4,
    marginBottom: 16,
  },
  loginButtonText: {
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
    paddingVertical: 6,
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