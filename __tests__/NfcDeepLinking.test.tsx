import { Vibration } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { parseNfcTag, NfcService, ParsedNfcResult } from '../src/services/nfcService';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { setActiveHouse } from '../src/store/authSlice';
import hardwareReducer, { setCurrentTab, triggerFocusShoppingInput } from '../src/store/hardwareSlice';
import inventoryReducer from '../src/store/inventorySlice';
import shoppingListReducer from '../src/store/shoppingListSlice';
import houseSocialReducer from '../src/store/houseSocialSlice';
import recipesReducer from '../src/store/recipesSlice';
import { SocialCollaborationService } from '../src/services/socialCollaborationService';

// Mock SocialCollaborationService
jest.mock('../src/services/socialCollaborationService', () => ({
  SocialCollaborationService: {
    initConnection: jest.fn().mockResolvedValue(true),
  },
}));

describe('NfcDeepLinking (Directiva de Deep Linking y Lectura NDEF Nativa para Banda NFC)', () => {
  let store: any;

  beforeEach(() => {
    jest.clearAllMocks();
    store = configureStore({
      reducer: {
        auth: authReducer,
        hardware: hardwareReducer,
        inventory: inventoryReducer,
        shoppingList: shoppingListReducer,
        houseSocial: houseSocialReducer,
        recipes: recipesReducer,
      },
    });
  });

  describe('Test 1 (Parsing NDEF de Fricción Cero)', () => {
    test('Extrae correctamente registros URI kitchy://shopping-list y kitchy://house/{houseId}', () => {
      // 1. URL directa a la lista
      const tagShoppingList = {
        id: 'wristband-01',
        ndefMessage: [
          {
            payload: [0x00, ...Array.from('kitchy://shopping-list').map((c) => c.charCodeAt(0))],
          },
        ],
      };
      const parsed1 = parseNfcTag(tagShoppingList);
      expect(parsed1.action).toBe('shopping-list');
      expect(parsed1.targetTab).toBe('list');
      expect(parsed1.tagId).toBe('wristband-01');
      expect(parsed1.isVirgin).toBe(false);

      // 2. URL con conmutación de hogar
      const targetHouseId = 'a0000000-0000-0000-0000-000000000002';
      const tagHouseUri = {
        id: 'wristband-02',
        ndefMessage: [
          {
            payload: [0x00, ...Array.from(`kitchy://house/${targetHouseId}`).map((c) => c.charCodeAt(0))],
          },
        ],
      };
      const parsed2 = parseNfcTag(tagHouseUri);
      expect(parsed2.action).toBe('shopping-list');
      expect(parsed2.targetTab).toBe('list');
      expect(parsed2.houseId).toBe(targetHouseId);
      expect(parsed2.isVirgin).toBe(false);

      // 3. URL con query param kitchy://shopping-list?houseId={houseId}
      const tagWithQuery = 'kitchy://shopping-list?houseId=moriles-house';
      const parsed3 = parseNfcTag(tagWithQuery);
      expect(parsed3.action).toBe('shopping-list');
      expect(parsed3.targetTab).toBe('list');
      expect(parsed3.houseId).toBe('moriles-house');
    });

    test('Extrae correctamente registros de Texto plano KITCHY_SHOPPING_LIST e IDs de casa', () => {
      // 1. Texto plano KITCHY_SHOPPING_LIST
      const tagText = {
        id: 'band-text-01',
        ndefMessage: [
          {
            // RTD_TEXT con status 2 y lang 'en'
            payload: [0x02, 0x65, 0x6e, ...Array.from('KITCHY_SHOPPING_LIST').map((c) => c.charCodeAt(0))],
          },
        ],
      };
      const parsedText = parseNfcTag(tagText);
      expect(parsedText.action).toBe('shopping-list');
      expect(parsedText.targetTab).toBe('list');
      expect(parsedText.tagId).toBe('band-text-01');

      // 2. Texto plano KITCHY_SHOPPING_LIST con ID de casa adjunto
      const tagTextWithHouse = {
        id: 'band-text-02',
        ndefMessage: [
          {
            payload: [0x02, 0x65, 0x6e, ...Array.from('KITCHY_SHOPPING_LIST:house-cordoba').map((c) => c.charCodeAt(0))],
          },
        ],
      };
      const parsedTextHouse = parseNfcTag(tagTextWithHouse);
      expect(parsedTextHouse.action).toBe('shopping-list');
      expect(parsedTextHouse.targetTab).toBe('list');
      expect(parsedTextHouse.houseId).toBe('house-cordoba');

      // 3. ID de casa directo como payload de texto
      const rawHouseId = 'a0000000-0000-0000-0000-000000000001';
      const parsedDirectId = parseNfcTag(rawHouseId);
      expect(parsedDirectId.action).toBe('shopping-list');
      expect(parsedDirectId.targetTab).toBe('list');
      expect(parsedDirectId.houseId).toBe(rawHouseId);
    });

    test('Identifica etiquetas vírgenes o sin formato NDEF extrayendo su UID físico y mapeando a lista', () => {
      const virginTag = {
        id: '04:5A:2B:12:34:56:78',
        ndefMessage: [],
      };
      const parsedVirgin = parseNfcTag(virginTag);
      expect(parsedVirgin.tagId).toBe('04:5A:2B:12:34:56:78');
      expect(parsedVirgin.isVirgin).toBe(true);
      expect(parsedVirgin.action).toBe('shopping-list');
      expect(parsedVirgin.targetTab).toBe('list');
    });
  });

  describe('Test 2 (Redirección Inmediata y Feedback Sensorial)', () => {
    test('Simula lectura de etiqueta, navega a ShoppingListScreen, conmuta casa y dispara vibración háptica [0, 70, 50, 70]', () => {
      const vibrateSpy = jest.spyOn(Vibration, 'vibrate');
      const initSignalRSpy = jest.spyOn(SocialCollaborationService, 'initConnection');

      const targetHouseId = 'a0000000-0000-0000-0000-000000000002';
      const parsedResult: ParsedNfcResult = {
        tagId: 'band-test-01',
        action: 'shopping-list',
        targetTab: 'list',
        houseId: targetHouseId,
        rawText: `kitchy://house/${targetHouseId}`,
        isVirgin: false,
      };

      // Ejecutar redirección centralizada
      NfcService.handleRedirection(parsedResult, store.dispatch, store.getState().auth.availableHouses);

      // 1. Navegación inmediata a la pestaña 'list' (ShoppingListScreen)
      expect(store.getState().hardware.currentTab).toBe('list');

      // 2. Conmutación de casa activa en Redux
      expect(store.getState().auth.activeHouse.id).toBe(targetHouseId);

      // 3. Foco automático disparado para el input de añadir producto
      expect(store.getState().hardware.focusShoppingInputTrigger).toBeGreaterThan(0);

      // 4. Vibración háptica rítmica [0, 70, 50, 70]
      expect(vibrateSpy).toHaveBeenCalledWith([0, 70, 50, 70]);

      // 5. Sincronización en tiempo real vía SignalR
      expect(initSignalRSpy).toHaveBeenCalledWith(targetHouseId);
    });
  });

  describe('Test 3 (Limpieza de Recursos y Liberación del Sensor NFC)', () => {
    test('Llama a cancelTechnologyRequest() al finalizar para evitar bloqueos del chip y fugas de memoria', async () => {
      const cancelTechSpy = jest.spyOn(NfcManager, 'cancelTechnologyRequest');

      // Configurar getTag para devolver una etiqueta con NDEF
      (NfcManager.getTag as jest.Mock).mockResolvedValueOnce({
        id: 'nfc-pulsera-77',
        ndefMessage: [
          {
            payload: [0x00, ...Array.from('kitchy://shopping-list').map((c) => c.charCodeAt(0))],
          },
        ],
      });

      let scannedResult: any = null;
      await NfcService.startTagDiscovery((result) => {
        scannedResult = result;
      });

      expect(scannedResult).not.toBeNull();
      expect(scannedResult?.action).toBe('shopping-list');
      expect(scannedResult?.targetTab).toBe('list');

      // Verifica que cancelTechnologyRequest() fue invocado de forma limpia en el bloque finally
      expect(cancelTechSpy).toHaveBeenCalled();
    });

    test('Resiliencia: isSupported() devuelve false en tablet/emulador sin arrojar errores ni advertencias', async () => {
      (NfcManager.isSupported as jest.Mock).mockResolvedValueOnce(false);

      const status = await NfcService.init();
      expect(status.isSupported).toBe(false);
      expect(status.isEnabled).toBe(false);

      // Detener sesión sin error
      await expect(NfcService.stopTagDiscovery()).resolves.toBeUndefined();
    });
  });

  describe('Test 4 (Flujo con Sesión Cerrada: Login Obligatorio y Redirección Post-Login a Lista)', () => {
    test('Si el usuario cerró sesión y escanea la banda NFC, registra el pendingRedirect, obliga a loguear y redirige directamente a la Lista tras el login', async () => {
      const vibrateSpy = jest.spyOn(Vibration, 'vibrate');
      const targetHouseId = 'a0000000-0000-0000-0000-000000000002';

      // 1. Simular escaneo de etiqueta NFC con app cerrada y usuario deslogueado
      const rawTag = {
        id: 'band-coldstart-loggedout',
        ndefMessage: [
          {
            payload: [0x00, ...Array.from(`kitchy://house/${targetHouseId}`).map((c) => c.charCodeAt(0))],
          },
        ],
      };
      const parsed = parseNfcTag(rawTag);
      expect(parsed.houseId).toBe(targetHouseId);

      // 2. Al estar deslogueado, guardar como pendiente en Redux y AsyncStorage
      await NfcService.setPendingRedirect(parsed);
      const pendingStored = await NfcService.getPendingRedirect();
      expect(pendingStored).not.toBeNull();
      expect(pendingStored?.houseId).toBe(targetHouseId);
      expect(pendingStored?.targetTab).toBe('list');

      // 3. Simular que el usuario completa el login exitosamente
      // El manejador post-login consume el pending redirect
      NfcService.handleRedirection(pendingStored!, store.dispatch, store.getState().auth.availableHouses);
      await NfcService.clearPendingRedirect();

      // 4. Verificar que el destino final es estrictamente 'list' (ShoppingListScreen) y NO 'cook' ni 'home'
      expect(store.getState().hardware.currentTab).toBe('list');
      expect(store.getState().auth.activeHouse.id).toBe(targetHouseId);
      expect(store.getState().hardware.focusShoppingInputTrigger).toBeGreaterThan(0);
      expect(vibrateSpy).toHaveBeenCalledWith([0, 70, 50, 70]);

      // 5. Verificar que el pending quedó limpio
      const clearedPending = await NfcService.getPendingRedirect();
      expect(clearedPending).toBeNull();
    });
  });
});
