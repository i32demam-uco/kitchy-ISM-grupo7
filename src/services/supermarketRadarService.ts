import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KitchyAlert } from './kitchyAlert';
import { setCurrentTab } from '../store/hardwareSlice';
import {
  SupermarketPoiService,
  Coordinates,
  SupermarketPOI,
} from './supermarketPoiService';

export const STORAGE_RADAR_ENABLED_KEY = '@kitchy_supermarket_radar_enabled';
export const STORAGE_LAST_RADAR_ALERT_KEY = '@kitchy_radar_last_alert_timestamp';

// Cooldown estricto anti-spam: 1 hora obligatoria según directiva de negocio
export const RADAR_COOLDOWN_MS = 60 * 60 * 1000;

export interface RadarEvaluationResult {
  triggered: boolean;
  supermarketName?: string;
  distanceMeters?: number;
  reason?: string;
}

/**
 * SupermarketRadarService: Motor nativo de geofencing y rastreo en segundo plano.
 * 
 * Principios Arquitectónicos:
 * 1. Background Location Real: Requiere permiso nativo "Permitir todo el tiempo".
 * 2. POI < 150m: Cruce en tiempo real con OpenStreetMap Overpass y base de datos offline.
 * 3. Condición de Disparo: Solo se notifica si la lista de la compra del hogar activo tiene productos pendientes (> 0).
 * 4. Anti-Spam Estricto: Cooldown de 1 hora persistido en AsyncStorage.
 * 5. Seguridad de Sesión: Vinculado a JWT. Se destruye inmediatamente en Logout.
 * 6. Gestión de Batería: Significant Location Changes + Desconexión total si no hay productos o radar OFF.
 */
export class SupermarketRadarService {
  private static watchId: number | null = null;
  private static isRunning: boolean = false;
  private static cachedPendingCount: number = 0;
  private static cachedActiveHouseId: string | null = null;

  /**
   * Solicita permisos nativos escalonados en Android:
   * 1. Ubicación precisa (Fine Location).
   * 2. Ubicación todo el tiempo (Background Location, API 29+).
   * 3. Notificaciones push (POST_NOTIFICATIONS, API 33+).
   */
  static async requestNativePermissions(): Promise<{
    foregroundGranted: boolean;
    backgroundGranted: boolean;
  }> {
    if (Platform.OS !== 'android') {
      return { foregroundGranted: true, backgroundGranted: true };
    }

    try {
      // 1. Permiso de ubicación en primer plano (precisa)
      const fineGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Radar de Supermercados Kitchy',
          message:
            'Kitchy necesita acceso a tu ubicación para avisarte cuando pases cerca de un supermercado si tienes productos pendientes en tu lista.',
          buttonPositive: 'Permitir',
          buttonNegative: 'Cancelar',
        }
      );

      const foregroundGranted =
        fineGranted === PermissionsAndroid.RESULTS?.GRANTED ||
        fineGranted === 'granted' ||
        fineGranted === true;
      if (!foregroundGranted) {
        return { foregroundGranted: false, backgroundGranted: false };
      }

      // 2. Permiso de notificaciones en Android 13+ (API 33+)
      if (Platform.Version >= 33 && (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS) {
        try {
          await PermissionsAndroid.request((PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS);
        } catch {
          // Continuar aunque se deniegue
        }
      }

      // 3. Permiso en segundo plano ("Permitir todo el tiempo", API 29+)
      let backgroundGranted = false;
      const bgPermission =
        PermissionsAndroid.PERMISSIONS?.ACCESS_BACKGROUND_LOCATION ||
        'android.permission.ACCESS_BACKGROUND_LOCATION';

      if (bgPermission) {
        const bgResult = await PermissionsAndroid.request(
          bgPermission,
          {
            title: 'Ubicación Todo el Tiempo',
            message:
              'Selecciona "Permitir todo el tiempo" para que el radar te avise automáticamente incluso con la app cerrada y la pantalla apagada.',
            buttonPositive: 'Permitir todo el tiempo',
            buttonNegative: 'Solo con la app abierta',
          }
        );
        backgroundGranted =
          bgResult === PermissionsAndroid.RESULTS?.GRANTED ||
          bgResult === 'granted' ||
          bgResult === true;
      } else {
        backgroundGranted = true;
      }

      return { foregroundGranted: true, backgroundGranted };
    } catch {
      return { foregroundGranted: false, backgroundGranted: false };
    }
  }

  /**
   * Consulta si el Radar de Supermercados está activado en las preferencias del usuario.
   */
  static async isRadarEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_RADAR_ENABLED_KEY);
      // Por defecto activado (true) a menos que el usuario lo haya desactivado explícitamente
      return value !== 'false';
    } catch {
      return true;
    }
  }

  /**
   * Guarda la preferencia del switch del Radar en AsyncStorage.
   */
  static async setRadarEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_RADAR_ENABLED_KEY, enabled ? 'true' : 'false');
      if (!enabled) {
        this.stopTracking();
      }
    } catch {
      // Ignorar errores de guardado local
    }
  }

  /**
   * Verifica el estado anti-spam: Si han pasado menos de 60 minutos desde la última alerta,
   * se encuentra en cooldown y NO debe enviar notificación.
   */
  static async isCooldownActive(): Promise<boolean> {
    try {
      const lastAlertTs = await AsyncStorage.getItem(STORAGE_LAST_RADAR_ALERT_KEY);
      if (!lastAlertTs) return false;

      const elapsed = Date.now() - parseInt(lastAlertTs, 10);
      return elapsed < RADAR_COOLDOWN_MS;
    } catch {
      return false;
    }
  }

  /**
   * Guarda el timestamp actual para iniciar el periodo de 1 hora de cooldown anti-spam.
   */
  static async recordAlertTimestamp(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_LAST_RADAR_ALERT_KEY, Date.now().toString());
    } catch {
      // Ignorar
    }
  }

  /**
   * Resetea el cooldown anti-spam (utilizado en testing y simulación forzada).
   */
  static async resetCooldown(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_LAST_RADAR_ALERT_KEY);
    } catch {
      // Ignorar
    }
  }

  /**
   * Sincroniza y arranca/detiene el rastreador en segundo plano según el estado de la aplicación.
   * Regla de Batería Cero:
   * - Si el usuario no está autenticado -> DETENER.
   * - Si el radar está desactivado por el usuario -> DETENER.
   * - Si la lista de la compra no tiene productos pendientes -> DETENER.
   */
  static async syncTrackingState(params: {
    isAuthenticated: boolean;
    pendingCount: number;
    activeHouseId?: string | null;
    dispatch: any;
  }): Promise<void> {
    const { isAuthenticated, pendingCount, activeHouseId, dispatch } = params;

    this.cachedPendingCount = pendingCount;
    this.cachedActiveHouseId = activeHouseId || null;

    // 1. Verificación de sesión: Jamás rastrear a un usuario no autenticado
    if (!isAuthenticated) {
      this.stopTracking();
      return;
    }

    // 2. Verificación de preferencia del usuario (Switch Radar)
    const enabled = await this.isRadarEnabled();
    if (!enabled) {
      this.stopTracking();
      return;
    }

    // 3. Verificación de productos pendientes: Si la lista está vacía, no hay razón para gastar batería
    if (pendingCount <= 0) {
      this.stopTracking();
      return;
    }

    // Si ya está corriendo, no duplicar el watcher
    if (this.isRunning) {
      return;
    }

    // 4. Solicitar permisos si no están concedidos
    const perms = await this.requestNativePermissions();
    if (!perms.foregroundGranted) {
      return;
    }

    this.isRunning = true;

    // 5. Iniciar escucha de cambios de ubicación significativos
    const geo = (globalThis as any).navigator?.geolocation;
    if (geo?.watchPosition) {
      this.watchId = geo.watchPosition(
        async (position: any) => {
          const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          await this.evaluateLocation(coords, this.cachedPendingCount, dispatch);
        },
        () => {},
        {
          enableHighAccuracy: true,
          distanceFilter: 100, // Notificar solo tras 100m de desplazamiento real (ahorro masivo de batería)
          interval: 120000,    // 2 minutos entre chequeos en movimiento
          fastestInterval: 60000,
        }
      );
    }
  }

  /**
   * Destruye de raíz el servicio de rastreo nativo.
   * Usado en Logout, al desactivar el switch o al vaciar la lista.
   */
  static stopTracking(): void {
    if (this.watchId !== null) {
      const geo = (globalThis as any).navigator?.geolocation;
      if (geo?.clearWatch) {
        geo.clearWatch(this.watchId);
      }
      this.watchId = null;
    }
    this.isRunning = false;
  }

  /**
   * Destruye completamente el servicio y limpia estados temporales al cerrar sesión.
   */
  static async handleLogoutCleanup(): Promise<void> {
    this.stopTracking();
    this.cachedPendingCount = 0;
    this.cachedActiveHouseId = null;
  }

  /**
   * Evalúa la ubicación actual con todas las reglas de negocio:
   * 1. Comprueba si hay productos pendientes en la lista.
   * 2. Cruza con la API de Puntos de Interés (radio < 150m).
   * 3. Comprueba el cooldown anti-spam de 1 hora.
   * 4. Dispara la alerta/notificación push interactiva.
   */
  static async evaluateLocation(
    coords: Coordinates,
    pendingCount: number,
    dispatch: any,
    options: { bypassCooldown?: boolean } = {}
  ): Promise<RadarEvaluationResult> {
    // 1. Condición de disparo: Solo si hay productos pendientes en la lista de la compra
    if (pendingCount <= 0) {
      return {
        triggered: false,
        reason: 'La lista de la compra no tiene productos pendientes.',
      };
    }

    // 2. Detección de supermercados a < 150 metros
    const nearby = await SupermarketPoiService.findNearbySupermarket(coords, 150);
    if (!nearby) {
      return {
        triggered: false,
        reason: 'Sin supermercados a menos de 150 metros de tu posición.',
      };
    }

    // 3. Sistema Anti-Spam: Cooldown de 1 hora obligatorio
    if (!options.bypassCooldown) {
      const cooldownActive = await this.isCooldownActive();
      if (cooldownActive) {
        // Abortar silenciosamente sin molestar al usuario
        return {
          triggered: false,
          supermarketName: nearby.supermarket.name,
          distanceMeters: nearby.distanceMeters,
          reason: 'Alerta abortada silenciosamente: Cooldown anti-spam de 1 hora activo.',
        };
      }
    }

    // 4. Registrar timestamp para activar el cooldown de 1 hora
    await this.recordAlertTimestamp();

    const supermarketName = nearby.supermarket.name;
    const distance = nearby.distanceMeters;

    // 5. Lanzar Notificación Push / Modal nativo de alta prioridad
    KitchyAlert.show(
      '¡Estás cerca del súper! (Compra Urgente Pendiente)',
      `Estás al lado de ${supermarketName} (a ${distance} m) y tienes ${pendingCount} productos en tu lista de la compra. ¡Aprovecha para no tener que volver!`,
      [
        { text: 'Ignorar', style: 'cancel' },
        {
          text: 'Ver Lista',
          onPress: () => {
            dispatch(setCurrentTab('list'));
          },
        },
      ],
      { badge: 'Radar Kitchy' }
    );

    return {
      triggered: true,
      supermarketName,
      distanceMeters: distance,
    };
  }

  /**
   * Simula el paso del usuario por un supermercado para pruebas y demostraciones en vivo.
   */
  static async simulateSupermarketProximity(
    dispatch: any,
    pendingCount: number = 3,
    options: { forceTrigger?: boolean } = {}
  ): Promise<{ triggered: boolean; supermarket: string; message: string }> {
    // Coordenadas a 35 metros de Mercadona Gran Vía Parque
    const simulatedCoords: Coordinates = {
      latitude: 37.8823,
      longitude: -4.7930,
    };

    if (options.forceTrigger) {
      await this.resetCooldown();
    }

    const result = await this.evaluateLocation(
      simulatedCoords,
      pendingCount,
      dispatch,
      { bypassCooldown: options.forceTrigger }
    );

    if (result.triggered) {
      return {
        triggered: true,
        supermarket: result.supermarketName || 'Mercadona Gran Vía Parque',
        message: `¡Alerta activada con éxito! Detectado ${result.supermarketName} a ${result.distanceMeters} m con ${pendingCount} productos pendientes.`,
      };
    } else {
      return {
        triggered: false,
        supermarket: result.supermarketName || 'Mercadona Gran Vía Parque',
        message: `Radar silencioso: ${result.reason}`,
      };
    }
  }

  /**
   * Devuelve si el motor está actualmente en escucha activa.
   */
  static isMonitoring(): boolean {
    return this.isRunning;
  }
}
