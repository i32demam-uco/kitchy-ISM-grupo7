import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { setCurrentTab } from '../src/store/hardwareSlice';
import { setUrgencyStatus, toggleUrgencyManual } from '../src/store/shoppingListSlice';
import { ShoppingListScreen } from '../src/screens/ShoppingListScreen';
import {
  GeofenceShoppingService,
  CACHED_SUPERMARKETS,
  STORAGE_LAST_ALERT_KEY,
} from '../src/services/geofenceShoppingService';
import { KitchyAlert } from '../src/services/kitchyAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('GeofenceNotification (Directiva de Geolocalización Inteligente)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await GeofenceShoppingService.resetCooldown();
    GeofenceShoppingService.stopMonitoring();
  });

  describe('Horarios Comerciales y Distancia Haversine', () => {
    test('isSupermarketOpen valida correctamente días y horas de apertura', () => {
      // Domingo 12:00 -> Cerrado
      const sunday = new Date('2026-11-15T12:00:00Z');
      expect(GeofenceShoppingService.isSupermarketOpen(sunday)).toBe(false);

      // Martes 11:30 (dentro de 09:00 - 21:30) -> Abierto
      const tuesdayOpen = new Date(2026, 10, 10, 11, 30);
      expect(GeofenceShoppingService.isSupermarketOpen(tuesdayOpen)).toBe(true);

      // Martes 08:00 (antes de apertura) -> Cerrado
      const tuesdayEarly = new Date(2026, 10, 10, 8, 0);
      expect(GeofenceShoppingService.isSupermarketOpen(tuesdayEarly)).toBe(false);

      // Sábado 21:15 (antes de cierre 21:30) -> Abierto
      const saturdayOpen = new Date(2026, 10, 14, 21, 15);
      expect(GeofenceShoppingService.isSupermarketOpen(saturdayOpen)).toBe(true);

      // Sábado 22:00 (después de cierre) -> Cerrado
      const saturdayLate = new Date(2026, 10, 14, 22, 0);
      expect(GeofenceShoppingService.isSupermarketOpen(saturdayLate)).toBe(false);
    });

    test('calculateDistanceMeters y findNearbySupermarket detectan cercanía en radio de 150m', () => {
      // Coordenadas a ~25 metros de Mercadona Gran Vía Parque (37.8821, -4.7932)
      const nearbyCoords = { latitude: 37.8823, longitude: -4.7930 };
      const match = GeofenceShoppingService.findNearbySupermarket(nearbyCoords, 150);

      expect(match).not.toBeNull();
      expect(match?.supermarket.name).toBe('Mercadona Gran Vía Parque');
      expect(match?.distance).toBeLessThanOrEqual(50);

      // Coordenadas lejanas (Madrid: Puerta del Sol)
      const farCoords = { latitude: 40.4168, longitude: -3.7038 };
      const farMatch = GeofenceShoppingService.findNearbySupermarket(farCoords, 150);
      expect(farMatch).toBeNull();
    });
  });

  describe('Anti-Spam Cooldown (2 Horas) en AsyncStorage', () => {
    test('isCooldownActive responde al timestamp guardado', async () => {
      expect(await GeofenceShoppingService.isCooldownActive()).toBe(false);

      await GeofenceShoppingService.recordAlertTimestamp();
      expect(await GeofenceShoppingService.isCooldownActive()).toBe(true);

      const stored = await AsyncStorage.getItem(STORAGE_LAST_ALERT_KEY);
      expect(stored).toBeDefined();

      await GeofenceShoppingService.resetCooldown();
      expect(await GeofenceShoppingService.isCooldownActive()).toBe(false);
    });
  });

  describe('Regla de Batería Cero y Redirección Nativa', () => {
    test('Zero-Battery: Si isUrgent es false, el monitoreo se detiene y no inicia watcher GPS', async () => {
      const stopSpy = jest.spyOn(GeofenceShoppingService, 'stopMonitoring');
      const mockDispatch = jest.fn();

      await GeofenceShoppingService.syncMonitoringState(false, 3, mockDispatch);

      expect(stopSpy).toHaveBeenCalled();
    });

    test('Lanzamiento de alerta con Deep Link directo a la pestaña de Lista de la Compra', async () => {
      const alertSpy = jest.spyOn(KitchyAlert, 'show');
      const mockDispatch = jest.fn();

      const nearbyCoords = { latitude: 37.8823, longitude: -4.7930 };

      const result = await GeofenceShoppingService.evaluateLocationProximity(
        nearbyCoords,
        7,
        mockDispatch,
        { bypassCooldown: true, bypassOpenHours: true }
      );

      expect(result.triggered).toBe(true);
      expect(result.supermarket).toBe('Mercadona Gran Vía Parque');
      expect(alertSpy).toHaveBeenCalled();

      // Verificar que el diálogo incluye botón para abrir lista y deep link
      const alertCall = alertSpy.mock.calls[0];
      expect(alertCall[0]).toContain('Compra Urgente Pendiente');
      expect(alertCall[1]).toContain('7 productos');

      const buttons = alertCall[2];
      expect(buttons).toBeDefined();
      const openBtn = buttons?.find((b: any) => b.text === 'Ver Lista');
      expect(openBtn).toBeDefined();

      // Ejecutar la acción del botón 'Ver Lista' y comprobar redirección
      openBtn?.onPress?.();
      expect(mockDispatch).toHaveBeenCalledWith(setCurrentTab('list'));
    });
  });

  describe('Integración UI en ShoppingListScreen', () => {
    test('Renderiza el banner glassmorphism con toggle y botón de simulación', async () => {
      store.dispatch(setUrgencyStatus({ isUrgent: true, urgentModeSource: 'MANUAL' }));

      let renderer: any;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <Provider store={store}>
            <ShoppingListScreen />
          </Provider>
        );
      });

      const root = renderer.root;
      const textNodes = root.findAllByType('Text' as any);
      const textContents = textNodes.map((n: any) => n.props.children);

      expect(textContents.some((t: any) => typeof t === 'string' && t.includes('COMPRA URGENTE ACTIVA'))).toBe(true);
      expect(textContents.some((t: any) => typeof t === 'string' && t.includes('Simular paso por supermercado'))).toBe(true);

      await ReactTestRenderer.act(() => {
        renderer.unmount();
      });
    });
  });
});
