/**
 * Servicio de Puntos de Interés (POI) para Detección de Supermercados.
 * 
 * Estrategia Híbrida:
 * 1. Consulta en tiempo real a la API geoespacial Overpass (OpenStreetMap) con timeout estricto.
 * 2. Fallback instantáneo a base de datos local de alta precisión para modo sin conexión o baja cobertura.
 * 3. Filtrado geodésico mediante fórmula de Haversine con precisión métrica.
 */

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
  address?: string;
  distanceMeters?: number;
}

// Base de datos local offline de supermercados de alta frecuencia
export const OFFLINE_SUPERMARKETS: SupermarketPOI[] = [
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
  {
    id: 'poi-aldi-aeropuerto',
    name: 'Aldi Aeropuerto',
    brand: 'Aldi',
    latitude: 37.8689,
    longitude: -4.8095,
    address: 'Av. del Aeropuerto, 32, Córdoba',
  },
];

export class SupermarketPoiService {
  /**
   * Calcula la distancia geodésica exacta en metros entre dos coordenadas mediante la fórmula del Haversine.
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
   * Consulta la API geoespacial Overpass (OpenStreetMap) en tiempo real para encontrar supermercados en el entorno.
   */
  static async fetchFromOverpassApi(
    coords: Coordinates,
    radiusMeters: number = 500
  ): Promise<SupermarketPOI[]> {
    const query = `[out:json][timeout:3];(node["shop"~"supermarket|convenience|grocery"](around:${radiusMeters},${coords.latitude},${coords.longitude});way["shop"~"supermarket|convenience|grocery"](around:${radiusMeters},${coords.latitude},${coords.longitude}););out center 10;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 3000) : null;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Kitchy-SmartPantry/2.0',
        },
        signal: controller ? controller.signal : undefined,
      });

      if (!response.ok) {
        return [];
      }

      const json = await response.json();
      if (!json || !Array.isArray(json.elements)) {
        return [];
      }

      const results: SupermarketPOI[] = [];
      for (const el of json.elements) {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        if (typeof lat !== 'number' || typeof lon !== 'number') continue;

        const name = el.tags?.name || el.tags?.brand || 'Supermercado Cercano';
        const brand = el.tags?.brand || el.tags?.operator || name;
        const address = el.tags?.['addr:street']
          ? `${el.tags['addr:street']} ${el.tags['addr:housenumber'] || ''}`.trim()
          : undefined;

        results.push({
          id: `osm-${el.id}`,
          name,
          brand,
          latitude: lat,
          longitude: lon,
          address,
        });
      }

      return results;
    } catch {
      // Fallback silencioso en caso de timeout, modo avión o fallo de red
      return [];
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  /**
   * Busca supermercados locales en la base de datos offline.
   */
  static findInOfflineDatabase(
    coords: Coordinates,
    maxDistanceMeters: number = 150
  ): SupermarketPOI[] {
    const matches: SupermarketPOI[] = [];

    for (const sm of OFFLINE_SUPERMARKETS) {
      const dist = this.calculateDistanceMeters(
        coords.latitude,
        coords.longitude,
        sm.latitude,
        sm.longitude
      );

      if (dist <= maxDistanceMeters) {
        matches.push({
          ...sm,
          distanceMeters: dist,
        });
      }
    }

    return matches.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
  }

  /**
   * Localiza el supermercado más cercano dentro del radio máximo (150m por defecto).
   * Combina la API en vivo de OSM con la base de datos local offline como garantía de disponibilidad.
   */
  static async findNearbySupermarket(
    coords: Coordinates,
    maxDistanceMeters: number = 150
  ): Promise<{ supermarket: SupermarketPOI; distanceMeters: number } | null> {
    // 1. Primero comprobar base de datos local (latencia 0 ms)
    const localMatches = this.findInOfflineDatabase(coords, maxDistanceMeters);
    if (localMatches.length > 0) {
      return {
        supermarket: localMatches[0],
        distanceMeters: localMatches[0].distanceMeters || 0,
      };
    }

    // 2. Si no está en caché local, intentar consulta a la API de POI online
    try {
      const remoteMatches = await this.fetchFromOverpassApi(coords, maxDistanceMeters + 50);
      for (const sm of remoteMatches) {
        const dist = this.calculateDistanceMeters(
          coords.latitude,
          coords.longitude,
          sm.latitude,
          sm.longitude
        );

        if (dist <= maxDistanceMeters) {
          return {
            supermarket: {
              ...sm,
              distanceMeters: dist,
            },
            distanceMeters: dist,
          };
        }
      }
    } catch {
      // Ignorar error online
    }

    return null;
  }
}
