import {
  SupermarketRadarService,
  STORAGE_LAST_RADAR_ALERT_KEY,
  RADAR_COOLDOWN_MS,
  STORAGE_RADAR_ENABLED_KEY,
} from './supermarketRadarService';
import {
  SupermarketPoiService,
  Coordinates,
  SupermarketPOI,
  OFFLINE_SUPERMARKETS,
} from './supermarketPoiService';
import { KitchyAlert } from './kitchyAlert';
import { setCurrentTab } from '../store/hardwareSlice';

export { Coordinates, SupermarketPOI };
export const CACHED_SUPERMARKETS = OFFLINE_SUPERMARKETS;
export const STORAGE_LAST_ALERT_KEY = STORAGE_LAST_RADAR_ALERT_KEY;
export const COOLDOWN_MS = RADAR_COOLDOWN_MS;

/**
 * GeofenceShoppingService (Adaptador de compatibilidad retroactiva hacia SupermarketRadarService)
 */
export class GeofenceShoppingService {
  static async requestLocationPermissions(): Promise<boolean> {
    const res = await SupermarketRadarService.requestNativePermissions();
    return res.foregroundGranted;
  }

  static isSupermarketOpen(date: Date = new Date()): boolean {
    const day = date.getDay(); // 0 = Domingo
    if (day === 0) return false;

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const openMinutes = 9 * 60; // 09:00
    const closeMinutes = 21 * 60 + 30; // 21:30

    return totalMinutes >= openMinutes && totalMinutes <= closeMinutes;
  }

  static calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    return SupermarketPoiService.calculateDistanceMeters(lat1, lon1, lat2, lon2);
  }

  static findNearbySupermarket(
    coords: Coordinates,
    maxDistanceMeters: number = 150
  ): { supermarket: SupermarketPOI; distance: number } | null {
    const matches = SupermarketPoiService.findInOfflineDatabase(coords, maxDistanceMeters);
    if (matches.length > 0) {
      return {
        supermarket: matches[0],
        distance: matches[0].distanceMeters || 0,
      };
    }
    return null;
  }

  static async isCooldownActive(): Promise<boolean> {
    return SupermarketRadarService.isCooldownActive();
  }

  static async recordAlertTimestamp(): Promise<void> {
    return SupermarketRadarService.recordAlertTimestamp();
  }

  static async resetCooldown(): Promise<void> {
    return SupermarketRadarService.resetCooldown();
  }

  static async syncMonitoringState(
    isUrgentOrActive: boolean,
    pendingCount: number,
    dispatch: any
  ): Promise<void> {
    if (!isUrgentOrActive) {
      this.stopMonitoring();
      return;
    }
    await SupermarketRadarService.syncTrackingState({
      isAuthenticated: true,
      pendingCount,
      dispatch,
    });
  }

  static stopMonitoring(): void {
    SupermarketRadarService.stopTracking();
  }

  static async evaluateLocationProximity(
    coords: Coordinates,
    pendingCount: number,
    dispatch: any,
    options: { bypassCooldown?: boolean; bypassOpenHours?: boolean } = {}
  ): Promise<{ triggered: boolean; supermarket?: string; distance?: number; reason?: string }> {
    if (!options.bypassOpenHours && !this.isSupermarketOpen()) {
      return {
        triggered: false,
        reason: 'Supermercados cerrados según horario comercial (Lun-Sáb 09:00 - 21:30)',
      };
    }

    const res = await SupermarketRadarService.evaluateLocation(
      coords,
      pendingCount,
      dispatch,
      { bypassCooldown: options.bypassCooldown }
    );

    return {
      triggered: res.triggered,
      supermarket: res.supermarketName,
      distance: res.distanceMeters,
      reason: res.reason,
    };
  }

  static async simulateNearOpenSupermarket(
    dispatch: any,
    pendingCount: number = 5,
    options: { forceTrigger?: boolean } = {}
  ): Promise<{ triggered: boolean; supermarket: string; message: string }> {
    return SupermarketRadarService.simulateSupermarketProximity(dispatch, pendingCount, options);
  }
}
