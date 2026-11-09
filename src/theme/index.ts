import { Platform } from 'react-native';

/**
 * Paleta cromática oficial de Kitchy.
 * Diseñada para Modo Oscuro nativo (#121212) con contraste optimizado,
 * estética glassmorphism y acentos en Verde UCO (#00E676 / #007A33).
 */
export const Colors = {
  background: '#121212',
  surface: '#1A1A1E',
  surfaceCard: '#1C1C1E', // Marengo premium para tarjetas de inventario y urgencia
  surfaceElevated: '#26262B',
  surfaceBorder: 'rgba(255, 255, 255, 0.08)',
  
  // Acentos de marca y neón (Botón central flotante de Figma)
  primaryGreen: '#00E676', // Verde esmeralda de alto contraste para el FAB
  primaryGreenGlow: 'rgba(0, 230, 118, 0.28)',
  ucoGreen: '#007A33', // Verde institucional Universidad de Córdoba
  ucoDarkGreen: '#004D26',
  
  // Semáforo de caducidad (RNF visual: Alerta de desperdicio alimentario)
  urgencyRed: '#EF4444',     // Caduca en < 24h
  urgencyAmber: '#D97706',   // Caduca en 24h - 48h
  urgencyAmberBg: 'rgba(217, 119, 6, 0.15)',
  urgencyAmberBorder: 'rgba(217, 119, 6, 0.4)',
  urgencyGreen: '#10B981',   // Caduca en > 48h
  
  // Jerarquía tipográfica de alto contraste
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  
  // Acentos funcionales y divisores glassmorphism
  accentBlue: '#3B82F6',
  accentPurple: '#8B5CF6',
  divider: 'rgba(255, 255, 255, 0.06)',
};

/**
 * Jerarquía tipográfica de Kitchy.
 * Regla UI/UX: Prohibido usar fuentes del sistema por defecto.
 * Poppins para títulos y branding; Inter para textos secundarios, métricas y lectura.
 */
export const Typography = {
  heading: Platform.select({
    ios: 'Poppins-Bold',
    android: 'Poppins-Bold',
    default: 'Poppins',
  }),
  headingSemiBold: Platform.select({
    ios: 'Poppins-SemiBold',
    android: 'Poppins-SemiBold',
    default: 'Poppins',
  }),
  headingMedium: Platform.select({
    ios: 'Poppins-Medium',
    android: 'Poppins-Medium',
    default: 'Poppins',
  }),
  body: Platform.select({
    ios: 'Inter-Regular',
    android: 'Inter-Regular',
    default: 'Inter',
  }),
  bodyMedium: Platform.select({
    ios: 'Inter-Medium',
    android: 'Inter-Medium',
    default: 'Inter',
  }),
  bodySemiBold: Platform.select({
    ios: 'Inter-SemiBold',
    android: 'Inter-SemiBold',
    default: 'Inter',
  }),
};


