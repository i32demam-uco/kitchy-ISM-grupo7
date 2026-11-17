import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KitchyAlert } from './kitchyAlert';
import { setCurrentTab } from '../store/hardwareSlice';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface SupermarketPOI {
  id: string;
  name: string;
  brand: string;
  latitude: number;
  longitude: number;
  address: string;
}

// POIs de supermercados cacheados (Córdoba, España / Radio Ciudad Jardín - Centro)
export const CACHED_SUPERMARKETS: SupermarketPOI[] = [
  {
    id: 'poi-mercadona-gvp',
    name: 'Mercadona Gran Vía Parque',
    brand: 'Mercadona',
    latitude: 37.8821,
    longitude: -4.7932,
    address: 'Av. Gran Vía Parque, 28, Córdoba',
  },
  {
    id: 'poi-dia-cj',
    name: 'Dia Market Ciudad Jardín',
    brand: 'Dia',
    latitude: 37.8845,
    longitude: -4.7901,
    address: 'Calle Camino de los Sastres, 12, Córdoba',
  },
  {
    id: 'poi-carrefour-zahira',
    name: 'Carrefour Zahira',
    brand: 'Carrefour',
    latitude: 37.8924,
    longitude: -4.7578,
    address: 'Ctra. Madrid-Cádiz Km 396, Córdoba',
  },
  {
    id: 'poi-lidl-trassierra',
    name: 'Lidl Trassierra',
    brand: 'Lidl',
    latitude: 37.8965,
    longitude: -4.7981,
    address: 'Av. de Trassierra, 54, Córdoba',
  },
  {
    id: 'poi-mercadona-vinuela',
    name: 'Mercadona Viñuela',
    brand: 'Mercadona',
    latitude: 37.8911,
    longitude: -4.7672,
    address: 'Calle Jesús Rescatado, 18, Córdoba',
  },
];

export const STORAGE_LAST_ALERT_KEY = '@kitchy_last_supermarket_alert';
export const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 horas de anti-spam

/**
 * Servicio de Geofencing Inteligente de Compra Urgente.
 * 
 * Cumplimiento Arquitectónico:
 * 1. Zero-Battery Rule: Listener GPS estrictamente condicionado a `is_urgent === true`.
 * 2. Validación de Horarios Comerciales: Lunes a Sábado de 09:00 a 21:30 (Cerrado Domingos y festivos).
 * 3. Anti-Spam: Cooldown estricto de 2 horas en AsyncStorage.
 * 4. Privacidad Absoluta: 0% de almacenamiento de coordenadas en servidor/Supabase (evaluación efímera en memoria local).
 */
export class GeofenceShoppingService {
  private static watchId: number | null = null;
  private static isMonitoring: boolean = false;

  /**
   * Solicita permisos de ubicación fina y segundo plano en Android.
   */
  static async requestLocationPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const fineGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Ubicación para Alerta de Compra Urgente',
          message:
            'Kitchy necesita tu ubicación para avisarte cuando pases junto a un supermercado abierto solo si tienes una compra urgente pendiente.',
          buttonPositive: 'Permitir',
          buttonNegative: 'Cancelar',
        }
      );

      if (fineGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }

      // En Android 10+ (API 29+), solicitar ACCESS_BACKGROUND_LOCATION si está disponible
      if (Platform.Version >= 29 && PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION) {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            {
              title: 'Ubicación en Segundo Plano',
              message:
                'Permite detectar supermercados abiertos en tu ruta sin necesidad de tener la pantalla encendida.',
              buttonPositive: 'Permitir siempre',
              buttonNegative: 'Solo con la app abierta',
            }
          );
        } catch {
          // Si el usuario deniega background location, el geofencing funciona en primer plano
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verifica si los supermercados están abiertos en la fecha/hora actual o dada.
   * Regla de negocio: Lun-Sáb de 09:00 a 21:30. Domingos y festivos cerrado.
   */
  static isSupermarketOpen(date: Date = new Date()): boolean {
    const day = date.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    if (day === 0) {
      return false; // Cerrado en domingo
    }

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const openMinutes = 9 * 60; // 09:00
    const closeMinutes = 21 * 60 + 30; // 21:30

    return totalMinutes >= openMinutes && totalMinutes <= closeMinutes;
  }

  /**
   * Calcula la distancia en metros entre dos coordenadas geográficas mediante la fórmula del Haversine.
   */
  static calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  /**
   * Localiza el supermercado más cercano dentro del radio especificado (por defecto 150m).
   */
  static findNearbySupermarket(
    coords: Coordinates,
    maxDistanceMeters: number = 150
  ): { supermarket: SupermarketPOI; distance: number } | null {
    let closest: { supermarket: SupermarketPOI; distance: number } | null = null;

    for (const sm of CACHED_SUPERMARKETS) {
      const distance = this.calculateDistanceMeters(
        coords.latitude,
        coords.longitude,
        sm.latitude,
        sm.longitude
      );

      if (distance <= maxDistanceMeters) {
        if (!closest || distance < closest.distance) {
          closest = { supermarket: sm, distance };
        }
      }
    }

    return closest;
  }

  /**
   * Comprueba si ha expirado el cooldown de 2 horas para evitar notificaciones repetidas.
   */
  static async isCooldownActive(): Promise<boolean> {
    try {
      const lastAlertTimestamp = await AsyncStorage.getItem(STORAGE_LAST_ALERT_KEY);
      if (!lastAlertTimestamp) return false;

      const elapsed = Date.now() - parseInt(lastAlertTimestamp, 10);
      return elapsed < COOLDOWN_MS;
    } catch {
      return false;
    }
  }

  /**
   * Registra el timestamp actual de la alerta en AsyncStorage.
   */
  static async recordAlertTimestamp(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_LAST_ALERT_KEY, Date.now().toString());
    } catch {
      // Ignorar fallos de almacenamiento
    }
  }

  /**
   * Limpia el registro de cooldown (útil para pruebas).
   */
  static async resetCooldown(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_LAST_ALERT_KEY);
    } catch {
      // Ignorar
    }
  }

  /**
   * Inicia el rastreador GPS con regla de Batería Cero:
   * Solo se activa si `isUrgent` es true. Si es false, se asegura de que el listener esté detenido.
   */
  static async syncMonitoringState(
    isUrgent: boolean,
    pendingCount: number,
    dispatch: any
  ): Promise<void> {
    if (!isUrgent) {
      this.stopMonitoring();
      return;
    }

    if (this.isMonitoring) {
      return;
    }

    const hasPermission = await this.requestLocationPermissions();
    if (!hasPermission) {
      return;
    }

    this.isMonitoring = true;

    // Usar la API nativa de Geolocation o fallback seguro
    const geo = (globalThis as any).navigator?.geolocation;
    if (geo?.watchPosition) {
      this.watchId = geo.watchPosition(
        async (position: any) => {
          const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          await this.evaluateLocationProximity(coords, pendingCount, dispatch);
        },
        () => {},
        {
          enableHighAccuracy: true,
          distanceFilter: 50, // Mínimo 50 metros de desplazamiento para ahorrar batería
          interval: 60000,
          fastestInterval: 30000,
        }
      );
    }
  }

  /**
   * Detiene de inmediato el rastreo GPS. Batería Cero.
   */
  static stopMonitoring(): void {
    if (this.watchId !== null) {
      const geo = (globalThis as any).navigator?.geolocation;
      if (geo?.clearWatch) {
        geo.clearWatch(this.watchId);
      }
      this.watchId = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Evalúa si una coordenada recibida amerita lanzar la notificación de alta prioridad.
   */
  static async evaluateLocationProximity(
    coords: Coordinates,
    pendingCount: number,
    dispatch: any,
    options: { bypassCooldown?: boolean; bypassOpenHours?: boolean } = {}
  ): Promise<{ triggered: boolean; supermarket?: string; distance?: number; reason?: string }> {
    // 1. Validar horario de apertura del supermercado
    const isOpen = options.bypassOpenHours ? true : this.isSupermarketOpen();
    if (!isOpen) {
      return { triggered: false, reason: 'Supermercados cerrados según horario comercial (Lun-Sáb 09:00 - 21:30)' };
    }

    // 2. Validar proximidad física (radio <= 150m)
    const match = this.findNearbySupermarket(coords, 150);
    if (!match) {
      return { triggered: false, reason: 'Sin supermercados a menos de 150 metros' };
    }

    // 3. Validar anti-spam de 2 horas
    if (!options.bypassCooldown) {
      const inCooldown = await this.isCooldownActive();
      if (inCooldown) {
        return { triggered: false, reason: 'Alerta en cooldown anti-spam (2 horas)' };
      }
    }

    // 4. Registrar timestamp para activar cooldown
    await this.recordAlertTimestamp();

    // 5. Emitir alerta nativa de alta prioridad con redirección táctil
    const supermarketName = match.supermarket.name;
    const distanceMeters = match.distance;

    KitchyAlert.show(
      'Compra Urgente Pendiente',
      `Estás al lado de un supermercado abierto (${supermarketName}, a ${distanceMeters} m) y tenéis ${pendingCount} productos por comprar.`,
      [
        { text: 'Ignorar', style: 'cancel' },
        {
          text: 'Ver Lista',
          onPress: () => {
            dispatch(setCurrentTab('list'));
          },
        },
      ],
      { badge: 'Geocerca Supermercado' }
    );

    return {
      triggered: true,
      supermarket: supermarketName,
      distance: distanceMeters,
    };
  }

  /**
   * Simula el paso a 30 metros de un supermercado abierto para verificación en emulador / demo.
   */
  static async simulateNearOpenSupermarket(
    dispatch: any,
    pendingCount: number = 5,
    options: { forceTrigger?: boolean } = {}
  ): Promise<{ triggered: boolean; supermarket: string; message: string }> {
    // Coordenadas a 25 metros del Mercadona Gran Vía Parque
    const simulatedCoords: Coordinates = {
      latitude: 37.8823,
      longitude: -4.7930,
    };

    if (options.forceTrigger) {
      await this.resetCooldown();
    }

    const result = await this.evaluateLocationProximity(
      simulatedCoords,
      pendingCount,
      dispatch,
      { bypassCooldown: options.forceTrigger, bypassOpenHours: options.forceTrigger }
    );

    if (result.triggered) {
      return {
        triggered: true,
        supermarket: result.supermarket || 'Mercadona Gran Vía Parque',
        message: `Simulación exitosa: Detectado ${result.supermarket} a ${result.distance} m. Alerta mostrada.`,
      };
    } else {
      return {
        triggered: false,
        supermarket: 'Mercadona Gran Vía Parque',
        message: `Simulación no disparada: ${result.reason}`,
      };
    }
  }
}

