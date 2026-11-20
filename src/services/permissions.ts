import { PermissionsAndroid, Platform } from 'react-native';

export interface HardwareCapabilities {
  camera: boolean;
  microphone: boolean;
  location: boolean;
  nfc: boolean;
  proximitySensor: boolean;
}

export class PermissionsManager {
  static async requestCameraPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Permiso de Cámara para Kitchy',
            message: 'Kitchy necesita acceso a tu cámara para escanear tickets y códigos de barras de alimentos.',
            buttonNeutral: 'Preguntar luego',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Aceptar',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch {
        return false;
      }
    }
    return true; // iOS handles automatically upon first usage
  }

  static async requestAudioPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (hasPermission) {
          return true;
        }

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Permiso de Micrófono para Kitchy',
            message: 'Kitchy necesita acceso a tu micrófono para dictar alimentos y comandos en Modo Cocina.',
            buttonNeutral: 'Preguntar luego',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Aceptar',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch {
        return false;
      }
    }
    return true;
  }

  static async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de Ubicación para Geocercas',
            message: 'Kitchy necesita tu ubicación para enviarte un recordatorio push al entrar en la geocerca de 100m de tu supermercado.',
            buttonNeutral: 'Preguntar luego',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Aceptar',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch {
        return false;
      }
    }
    return true;
  }

  static async checkAllHardwareCapabilities(): Promise<HardwareCapabilities> {
    const hasCam = await this.requestCameraPermission();
    const hasAudio = await this.requestAudioPermission();
    const hasLoc = await this.requestLocationPermission();

    return {
      camera: hasCam,
      microphone: hasAudio,
      location: hasLoc,
      nfc: true,
      proximitySensor: true,
    };
  }
}

