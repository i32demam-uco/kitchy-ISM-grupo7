import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { useAppDispatch } from '../store';
import { setCredentials } from '../store/authSlice';
import { ApiService } from '../services/api';
import { Colors, Typography } from '../theme';

interface SplashScreenProps {
  onFinish: (isAuthenticated: boolean) => void;
}

const { width } = Dimensions.get('window');

// Fotografía fotorrealista de alta gama de cocina oscura y minimalista
const DARK_KITCHEN_BG =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200';

// Proporción exacta del logotipo transparente (988 x 341 px -> ratio: 0.3451)
const LOGO_WIDTH = width * 0.72;
const LOGO_HEIGHT = LOGO_WIDTH * (341 / 988);

/**
 * SplashScreen - Pantalla de Bienvenida de Alta Gama con Logotipo Oficial Kitchy.
 * 
 * Principios de Arquitectura:
 * 1. UI/UX Luxury: Atmósfera inmersiva oscura con fotografía minimalista,
 *    logotipo transparente sin bordes ni artefactos geométricos y tipografía editorial.
 * 2. Cero Fricción: Comprueba silenciosamente en caché (AsyncStorage) si existe un token JWT válido.
 *    - Si existe -> transición cinematográfica directa al Dashboard.
 *    - Si no existe o expiró -> transición al LoginScreen.
 * 3. Feedback visual: Barra de progreso minimalista que transmite precisión y velocidad de carga.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const dispatch = useAppDispatch();

  // Valores de animación
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Animación de entrada suave y elástica del logo
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      // Barra de progreso minimalista (1.1s)
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: false,
      }),
    ]).start();

    // 2. Verificación silenciosa de sesión en segundo plano (Fricción Cero)
    const checkAndTransition = async () => {
      let isAuth = false;
      try {
        const session = await ApiService.getStoredSession();
        if (session && session.token) {
          dispatch(
            setCredentials({
              token: session.token,
              userId: session.userId,
              email: session.email,
              fullName: session.fullName,
              defaultHouseId: session.defaultHouseId,
            })
          );
          isAuth = true;
        }
      } catch {
        isAuth = false;
      }

      // Tiempo de exposición óptimo para una experiencia fluida y elegante
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(screenOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onFinish(isAuth);
        });
      }, 1200);
    };

    checkAndTransition();
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Fondo Fotorrealista Oscuro de Cocina de Alta Gama */}
      <Image
        source={{ uri: DARK_KITCHEN_BG }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {/* Capa de Atmósfera Oscura con Profundidad */}
      <View style={styles.darkAtmosphereOverlay} />

      {/* Logotipo Kitchy Oficial Centrado */}
      <Animated.View
        style={[
          styles.centerLogoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('../assets/images/logo_splash.png')}
          style={styles.splashLogoImage}
          resizeMode="contain"
        />

        {/* Subtítulo Editorial de Marca */}
        <Text style={styles.brandSubtitle}>• T U  C O C I N A  I N T E L I G E N T E •</Text>
      </Animated.View>

      {/* Pie de Pantalla: Barra de Carga Minimalista y Firma */}
      <View style={styles.footerArea}>
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.versionTag}>K I T C H Y   2 . 0   •   U C O</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0A0B0E',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  darkAtmosphereOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 11, 14, 0.88)',
  },
  centerLogoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  splashLogoImage: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    shadowColor: Colors.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  brandSubtitle: {
    marginTop: 20,
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
    color: '#E5E7EB',
    letterSpacing: 4.5,
    textAlign: 'center',
  },
  footerArea: {
    position: 'absolute',
    bottom: 54,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  progressBarTrack: {
    width: 140,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primaryGreen,
    borderRadius: 2,
    shadowColor: Colors.primaryGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
  },
  versionTag: {
    fontSize: 9.5,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 2.5,
    textAlign: 'center',
  },
});