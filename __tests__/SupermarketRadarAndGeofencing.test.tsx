import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../src/store';
import { logout } from '../src/store/authSlice';
import { setCurrentTab, setRadarEnabled } from '../src/store/hardwareSlice';
import { ShoppingListScreen } from '../src/screens/ShoppingListScreen';
import { ProfileScreen } from '../src/screens/ProfileScreen';
import { RadarDeactivationModal } from '../src/components/RadarDeactivationModal';
import {
  SupermarketRadarService,
  STORAGE_RADAR_ENABLED_KEY,
  STORAGE_LAST_RADAR_ALERT_KEY,
  RADAR_COOLDOWN_MS,
} from '../src/services/supermarketRadarService';
import {
  SupermarketPoiService,
  Coordinates,
} from '../src/services/supermarketPoiService';
import { KitchyAlert } from '../src/services/kitchyAlert';

describe('⚡ SupermarketRadarAndGeofencing: Reescritura del Motor de Rastreo ⚡', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await SupermarketRadarService.resetCooldown();
    await SupermarketRadarService.setRadarEnabled(true);
    SupermarketRadarService.stopTracking();
  });

  afterEach(() => {
    SupermarketRadarService.stopTracking();
  });

  describe('1. Hardware & Permisos Nativo ("Permitir todo el tiempo")', () => {
    test('Solicita permisos de Fine Location, Background Location y Notificaciones en Android', async () => {
      const originalOS = Platform.OS;
      const originalVersion = Platform.Version;
      Platform.OS = 'android';
      (Platform as any).Version = 33;

      (PermissionsAndroid as any).RESULTS = {
        GRANTED: 'granted',
        DENIED: 'denied',
        NEVER_ASK_AGAIN: 'never_ask_again',
      };
      if (!PermissionsAndroid.PERMISSIONS) {
        (PermissionsAndroid as any).PERMISSIONS = {};
      }
      (PermissionsAndroid.PERMISSIONS as any).ACCESS_FINE_LOCATION =
        'android.permission.ACCESS_FINE_LOCATION';
      (PermissionsAndroid.PERMISSIONS as any).ACCESS_BACKGROUND_LOCATION =
        'android.permission.ACCESS_BACKGROUND_LOCATION';
      (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS =
        'android.permission.POST_NOTIFICATIONS';

      const requestSpy = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('granted' as any);

      const perms = await SupermarketRadarService.requestNativePermissions();

      expect(perms.foregroundGranted).toBe(true);
      expect(perms.backgroundGranted).toBe(true);
      expect(requestSpy).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        expect.any(Object)
      );
      expect(requestSpy).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        expect.any(Object)
      );

      Platform.OS = originalOS;
      Platform.Version = originalVersion;
    });
  });

  describe('2. Detección de Supermercados POI & Radio < 150m (Haversine)', () => {
    test('Calcula la distancia geodésica con Haversine y detecta cercanía < 150m', async () => {
      // Coordenadas a ~25m de Mercadona Gran Vía Parque (37.8821, -4.7932)
      const nearCoords: Coordinates = { latitude: 37.8823, longitude: -4.7930 };
      const nearby = await SupermarketPoiService.findNearbySupermarket(nearCoords, 150);

      expect(nearby).not.toBeNull();
      expect(nearby?.supermarket.name).toBe('Mercadona Gran Vía Parque');
      expect(nearby?.distanceMeters).toBeLessThanOrEqual(50);
    });

    test('Descarta coordenadas lejanas (> 150m)', async () => {
      // Coordenadas en mitad del campo sin supermercados cercanos
      const remoteCoords: Coordinates = { latitude: 38.1000, longitude: -4.6000 };
      const nearby = await SupermarketPoiService.findNearbySupermarket(remoteCoords, 150);

      expect(nearby).toBeNull();
    });
  });

  describe('3. Condición de Disparo: Solo con productos pendientes en el Hogar Activo', () => {
    test('Si la lista tiene 0 productos pendientes, NO se lanza alerta (aborta silenciosamente)', async () => {
      const alertSpy = jest.spyOn(KitchyAlert, 'show');
      const mockDispatch = jest.fn();
      const nearCoords: Coordinates = { latitude: 37.8823, longitude: -4.7930 };

      const result = await SupermarketRadarService.evaluateLocation(
        nearCoords,
        0, // 0 productos pendientes
        mockDispatch
      );

      expect(result.triggered).toBe(false);
      expect(result.reason).toContain('no tiene productos pendientes');
      expect(alertSpy).not.toHaveBeenCalled();
    });

    test('Si la lista tiene productos pendientes (> 0), se dispara la alerta interactiva', async () => {
      const alertSpy = jest.spyOn(KitchyAlert, 'show');
      const mockDispatch = jest.fn();
      const nearCoords: Coordinates = { latitude: 37.8823, longitude: -4.7930 };

      const result = await SupermarketRadarService.evaluateLocation(
        nearCoords,
        4, // 4 productos pendientes
        mockDispatch,
        { bypassCooldown: true }
      );

      expect(result.triggered).toBe(true);
      expect(result.supermarketName).toBe('Mercadona Gran Vía Parque');
      expect(alertSpy).toHaveBeenCalledTimes(1);

      const alertCall = alertSpy.mock.calls[0];
      expect(alertCall[0]).toContain('¡Estás cerca del súper!');
      expect(alertCall[1]).toContain('4 productos');

      // Botón "Ver Lista" redirige al tab 'list'
      const buttons = alertCall[2];
      const openBtn = buttons?.find((b: any) => b.text === 'Ver Lista');
      expect(openBtn).toBeDefined();
      openBtn?.onPress?.();
      expect(mockDispatch).toHaveBeenCalledWith(setCurrentTab('list'));
    });
  });

  describe('4. Sistema Anti-Spam Estricto (Cooldown Obligatorio de 1 Hora)', () => {
    test('Regla de Negocio: Si el usuario pasa por 5 supermercados seguidos, SOLO recibe 1 alerta', async () => {
      const alertSpy = jest.spyOn(KitchyAlert, 'show');
      const mockDispatch = jest.fn();
      const nearCoords: Coordinates = { latitude: 37.8823, longitude: -4.7930 };

      // Supermercado 1 (Primera detección)
      const res1 = await SupermarketRadarService.evaluateLocation(nearCoords, 3, mockDispatch);
      expect(res1.triggered).toBe(true);
      expect(alertSpy).toHaveBeenCalledTimes(1);

      // Supermercado 2 (Inmediatamente después)
      const res2 = await SupermarketRadarService.evaluateLocation(nearCoords, 3, mockDispatch);
      expect(res2.triggered).toBe(false);
      expect(res2.reason).toContain('Cooldown anti-spam de 1 hora activo');

      // Supermercado 3
      const res3 = await SupermarketRadarService.evaluateLocation(nearCoords, 3, mockDispatch);
      expect(res3.triggered).toBe(false);

      // Supermercado 4
      const res4 = await SupermarketRadarService.evaluateLocation(nearCoords, 3, mockDispatch);
      expect(res4.triggered).toBe(false);

      // Supermercado 5
      const res5 = await SupermarketRadarService.evaluateLocation(nearCoords, 3, mockDispatch);
      expect(res5.triggered).toBe(false);

      // Total de alertas lanzadas: exactamente 1 de 5
      expect(alertSpy).toHaveBeenCalledTimes(1);
    });

    test('Transcurrida 1 hora (3600000 ms), el cooldown expira y vuelve a permitir alertas', async () => {
      const alertSpy = jest.spyOn(KitchyAlert, 'show');
      const mockDispatch = jest.fn();
      const nearCoords: Coordinates = { latitude: 37.8823, longitude: -4.7930 };

      // Alerta inicial
      await SupermarketRadarService.evaluateLocation(nearCoords, 2, mockDispatch);
      expect(await SupermarketRadarService.isCooldownActive()).toBe(true);

      // Simulamos que ha pasado 1 hora y 1 minuto (3660000 ms)
      const pastTime = Date.now() - (RADAR_COOLDOWN_MS + 60000);
      await AsyncStorage.setItem(STORAGE_LAST_RADAR_ALERT_KEY, pastTime.toString());

      expect(await SupermarketRadarService.isCooldownActive()).toBe(false);

      // Siguiente detección tras 1 hora: debe dispararse
      const nextRes = await SupermarketRadarService.evaluateLocation(nearCoords, 2, mockDispatch);
      expect(nextRes.triggered).toBe(true);
      expect(alertSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('5. Dependencia de Sesión & Logout Seguro', () => {
    test('Si el usuario no está autenticado, el tracking se detiene de inmediato', async () => {
      const stopSpy = jest.spyOn(SupermarketRadarService, 'stopTracking');
      const mockDispatch = jest.fn();

      await SupermarketRadarService.syncTrackingState({
        isAuthenticated: false, // Deslogueado
        pendingCount: 5,
        dispatch: mockDispatch,
      });

      expect(stopSpy).toHaveBeenCalled();
      expect(SupermarketRadarService.isMonitoring()).toBe(false);
    });

    test('Al hacer Logout, se destruye el servicio de rastreo por completo (Jamás rastrear usuarios deslogueados)', async () => {
      const stopSpy = jest.spyOn(SupermarketRadarService, 'stopTracking');

      await SupermarketRadarService.handleLogoutCleanup();

      expect(stopSpy).toHaveBeenCalled();
      expect(SupermarketRadarService.isMonitoring()).toBe(false);
    });
  });

  describe('6. UI/UX: Switch de Control y Modal Kitchy Glassmorphism', () => {
    test('RadarDeactivationModal renderiza el texto y botones exactos requeridos por la directiva', () => {
      const onCancel = jest.fn();
      const onConfirm = jest.fn();

      let renderer: any;
      ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <RadarDeactivationModal
            visible={true}
            onCancel={onCancel}
            onConfirmDeactivate={onConfirm}
          />
        );
      });

      const root = renderer.root;
      const textNodes = root.findAllByType('Text' as any);
      const allText = textNodes.map((t: any) => t.props.children).join(' ');

      // Texto mandatorio según directiva
      expect(allText).toContain('¿Seguro que quieres desactivar el Radar?');
      expect(allText).toContain('Dejarás de recibir recordatorios automáticos al pasar cerca de supermercados');
      expect(allText).toContain('Por privacidad, este radar también se desactiva automáticamente si cierras sesión');

      // Botones "Cancelar" y "Desactivar Radar"
      expect(allText).toContain('Cancelar');
      expect(allText).toContain('Desactivar Radar');
    });

    test('ShoppingListScreen integra el Switch del Radar y reacciona al intento de apagado', async () => {
      let renderer: any;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <Provider store={store}>
            <ShoppingListScreen />
          </Provider>
        );
      });

      const root = renderer.root;
      const switchEl = root.findByProps({ testID: 'switch-radar-shopping' });
      expect(switchEl).toBeDefined();

      // Al cambiar el switch a false (intentar desactivar), debe abrirse el modal de confirmación
      await ReactTestRenderer.act(async () => {
        switchEl.props.onValueChange(false);
      });

      const modal = root.findByProps({ testID: 'modal-radar-deactivation' });
      expect(modal.props.visible).toBe(true);

      await ReactTestRenderer.act(() => {
        renderer.unmount();
      });
    });

    test('ProfileScreen integra el Switch del Radar en SENSORES Y GEOFENCING', async () => {
      let renderer: any;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <Provider store={store}>
            <ProfileScreen />
          </Provider>
        );
      });

      const root = renderer.root;
      const switchProfile = root.findByProps({ testID: 'switch-profile-radar' });
      expect(switchProfile).toBeDefined();

      const textNodes = root.findAllByType('Text' as any);
      const allText = textNodes.map((t: any) => t.props.children).join(' ');
      expect(allText).toContain('Radar de Supermercados');
      expect(allText).toContain('SENSORES Y GEOFENCING');

      await ReactTestRenderer.act(() => {
        renderer.unmount();
      });
    });
  });
});
