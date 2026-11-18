import { Vibration, Platform } from 'react-native';

/**
 * Servicio de Haptic Feedback nativo ligero para Kitchy.
 * Proporciona respuesta táctil instantánea según las directrices de Apple Human Interface Guidelines.
 */
export const HapticFeedback = {
  selectionAsync: () => {
    try {
      if (Platform.OS === 'android') {
        // Vibración háptica táctil ultra-corta (15 ms)
        Vibration.vibrate(15);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Ignorar de forma segura en entornos de prueba o dispositivos sin motor háptico
    }
  },

  impactAsync: () => {
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate(35);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Ignorar de forma segura
    }
  },

  notificationSuccessAsync: () => {
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 20, 40, 25]);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Ignorar de forma segura
    }
  },

  notificationErrorAsync: () => {
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 40, 40, 40]);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Ignorar de forma segura
    }
  },
};

