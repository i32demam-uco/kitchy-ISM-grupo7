/**
 * NfcService (Servicio Global de Sensores NFC y Deep Linking Nativo para Kitchy).
 * 
 * Principios de Arquitectura:
 * 1. Hardware Sensor Expert: Intercepta lectura física NDEF de bandas/pulseras inteligentes y llaveros.
 * 2. Deep Linking Zero-Friction: Decodifica esquemas URI kitchy://, registros de texto KITCHY_SHOPPING_LIST
 *    e identificadores de hogar en etiquetas NDEF o UIDs vírgenes.
 * 3. Realtime & State Sync: Al detectar un house_id, conmuta la casa activa en Redux en 0 ms
 *    y sincroniza el inventario colaborativo en tiempo real vía SignalR.
 * 4. UX & Háptica Sensorial: Dispara vibración táctil rítmica [0, 70, 50, 70] y redirige directamente
 *    a ShoppingListScreen con autoenfoque del input de producto.
 * 5. Resiliencia Máxima: Desacoplamiento total para emuladores y tablets sin chip (ej. Xiaomi Pad 5)
 *    sin emitir advertencias ni errores en consola.
 */
import { Vibration, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { HapticFeedback } from './haptics';
import { sanitizeText } from '../utils/sanitizer';
import { setActiveHouse } from '../store/authSlice';
import { setCurrentTab, triggerFocusShoppingInput } from '../store/hardwareSlice';
import { setInventory } from '../store/inventorySlice';
import { ApiService } from './api';
import { SocialCollaborationService } from './socialCollaborationService';

export interface ParsedNfcResult {
  tagId: string;
  action: 'shopping-list' | 'house-switch' | 'unknown';
  targetTab: 'list' | 'houses' | 'home';
  houseId?: string;
  rawText: string;
  isVirgin: boolean;
  uri?: string;
}

export type NfcScanResult = ParsedNfcResult;
export type NfcScanCallback = (result: ParsedNfcResult) => void;

/**
 * Decodifica un arreglo o buffer de bytes NDEF (RTD_URI o RTD_TEXT) de forma universal.
 */
function decodeNdefBytes(rawPayload: any): string {
  if (!rawPayload) return '';
  if (typeof rawPayload === 'string') return rawPayload;

  const bytes: number[] = Array.isArray(rawPayload)
    ? rawPayload
    : rawPayload instanceof Uint8Array
    ? Array.from(rawPayload)
    : typeof rawPayload === 'object'
    ? Object.values(rawPayload)
    : [];

  if (bytes.length === 0) return '';

  // 1. Intentar decodificación nativa de URI
  try {
    if (Ndef && Ndef.uri && typeof Ndef.uri.decodePayload === 'function') {
      const decodedUri = Ndef.uri.decodePayload(rawPayload as any);
      if (typeof decodedUri === 'string' && decodedUri.startsWith('kitchy://')) {
        return decodedUri;
      }
    }
  } catch {
    // ignorar fallo de helper y usar decodificador directo
  }

  // 2. Intentar decodificación nativa de Texto
  try {
    if (Ndef && Ndef.text && typeof Ndef.text.decodePayload === 'function') {
      const decodedText = Ndef.text.decodePayload(rawPayload as any);
      if (typeof decodedText === 'string' && decodedText.length > 0) {
        return decodedText;
      }
    }
  } catch {
    // ignorar fallo de helper y usar decodificador directo
  }

  // 3. Decodificador manual de bajo nivel para esquemas URI (Prefijo 0x00 para URI completa)
  if (bytes[0] === 0x00) {
    const uriStr = bytes.slice(1).map((b) => String.fromCharCode(b)).join('');
    if (uriStr.startsWith('kitchy://') || uriStr.startsWith('http')) {
      return uriStr;
    }
  }

  // 4. Decodificador manual de registros RTD_TEXT (Byte de estado + código de idioma)
  const status = bytes[0];
  const langLen = status & 0x3f;
  if (langLen > 0 && langLen < bytes.length) {
    const textStr = bytes.slice(1 + langLen).map((b) => String.fromCharCode(b)).join('');
    if (textStr.length > 0) {
      return textStr;
    }
  }

  // 5. Fallback directo a caracteres ASCII / UTF-8
  return bytes.map((b) => String.fromCharCode(b)).join('');
}

/**
 * Parsea e interpreta el contenido de cualquier etiqueta o payload NFC físico.
 * Reconoce esquemas URI (kitchy://), registros de texto (KITCHY_SHOPPING_LIST), IDs de hogar
 * y etiquetas vírgenes/no formateadas.
 */
export function parseNfcTag(tag: any): ParsedNfcResult {
  const tagId =
    typeof tag === 'object' && tag && tag.id ? String(tag.id) : `tag-${Date.now()}`;

  let rawText = '';
  let isVirgin = false;

  if (typeof tag === 'string') {
    rawText = tag;
  } else if (tag && Array.isArray(tag.ndefMessage) && tag.ndefMessage.length > 0) {
    for (const record of tag.ndefMessage) {
      if (record && record.payload) {
        const decoded = decodeNdefBytes(record.payload);
        if (decoded && decoded.trim().length > 0) {
          rawText = decoded.trim();
          break;
        }
      }
    }
  } else if (tag && tag.payload) {
    rawText = decodeNdefBytes(tag.payload).trim();
  } else {
    isVirgin = true;
  }

  rawText = (rawText || '').trim();

  // Etiqueta virgen o sin registros NDEF legibles:
  // Se lee el UID físico, se asocia temporalmente a la casa activa y se ejecuta la redirección
  if (!rawText || isVirgin) {
    return {
      tagId,
      action: 'shopping-list',
      targetTab: 'list',
      rawText: '',
      isVirgin: true,
    };
  }

  // 1. Esquema URI kitchy:// (ej: kitchy://shopping-list o kitchy://house/{houseId})
  if (rawText.toLowerCase().startsWith('kitchy://')) {
    let houseId: string | undefined;

    // kitchy://house/{houseId}
    const houseMatch = rawText.match(/kitchy:\/\/house\/([a-zA-Z0-9_-]+)/i);
    if (houseMatch && houseMatch[1]) {
      houseId = sanitizeText(houseMatch[1], 64);
    }

    // kitchy://shopping-list?houseId={houseId} o ?house={houseId}
    const queryMatch = rawText.match(/[?&](?:houseId|house)=([a-zA-Z0-9_-]+)/i);
    if (queryMatch && queryMatch[1]) {
      houseId = sanitizeText(queryMatch[1], 64);
    }

    return {
      tagId,
      action: 'shopping-list',
      targetTab: 'list',
      houseId,
      rawText,
      isVirgin: false,
      uri: rawText,
    };
  }

  // 2. Registro de Texto plano KITCHY_SHOPPING_LIST
  if (rawText.toUpperCase().includes('KITCHY_SHOPPING_LIST')) {
    const houseMatch = rawText.match(/(?:[:?&/]|houseId=|house=)([a-zA-Z0-9_-]{8,64})/i);
    return {
      tagId,
      action: 'shopping-list',
      targetTab: 'list',
      houseId: houseMatch ? sanitizeText(houseMatch[1], 64) : undefined,
      rawText,
      isVirgin: false,
    };
  }

  // 3. Registro JSON (ej: {"houseId": "xxx"} o {"house_id": "xxx"})
  if (rawText.startsWith('{') && rawText.endsWith('}')) {
    try {
      const parsedJson = JSON.parse(rawText);
      const extractedHouseId = parsedJson.houseId || parsedJson.house_id || parsedJson.id;
      if (extractedHouseId && typeof extractedHouseId === 'string') {
        return {
          tagId,
          action: 'shopping-list',
          targetTab: 'list',
          houseId: sanitizeText(extractedHouseId, 64),
          rawText,
          isVirgin: false,
        };
      }
    } catch {
      // Ignorar si no era JSON válido
    }
  }

  // 4. Clave o identificador de hogar directo (UUID o código alfanumérico)
  const isDirectId = /^[a-zA-Z0-9_-]{8,64}$/.test(rawText);
  if (isDirectId) {
    return {
      tagId,
      action: 'shopping-list',
      targetTab: 'list',
      houseId: sanitizeText(rawText, 64),
      rawText,
      isVirgin: false,
    };
  }

  // 5. Fallback por defecto: orden mapeada a la Lista de la Compra
  return {
    tagId,
    action: 'shopping-list',
    targetTab: 'list',
    rawText,
    isVirgin: false,
  };
}

class NfcServiceClass {
  private isInitialized = false;
  private isScanning = false;

  /**
   * Inicializa de forma segura el hardware NFC nativo sin emitir errores en tablets o emuladores
   */
  async init(): Promise<{ isSupported: boolean; isEnabled: boolean }> {
    try {
      if (!this.isInitialized) {
        await NfcManager.start();
        this.isInitialized = true;
      }
      const isSupported = await this.isSupported();
      const isEnabled = isSupported ? await this.isEnabled() : false;
      return { isSupported, isEnabled };
    } catch {
      return { isSupported: false, isEnabled: false };
    }
  }

  /**
   * Comprueba si el hardware físico cuenta con chip NFC (resiliente a tablets sin chip)
   */
  async isSupported(): Promise<boolean> {
    try {
      return await NfcManager.isSupported();
    } catch {
      return false;
    }
  }

  /**
   * Comprueba si el chip NFC está encendido en los ajustes del sistema
   */
  async isEnabled(): Promise<boolean> {
    try {
      return await NfcManager.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Abre la pantalla nativa de ajustes de conectividad NFC
   */
  async goToSettings(): Promise<void> {
    try {
      await NfcManager.goToNfcSetting();
    } catch {
      // Ignorar en plataformas que no lo soportan
    }
  }

  /**
   * Manejador centralizado de redirección y feedback háptico/SignalR
   */
  handleRedirection(
    parsed: ParsedNfcResult,
    dispatch: any,
    availableHouses?: any[]
  ): void {
    // 1. Vibración háptica rítmica corta conforme a directiva
    try {
      Vibration.vibrate([0, 70, 50, 70]);
    } catch {
      // ignore
    }
    HapticFeedback.impactAsync();

    // 2. Si el payload incluye un house_id válido, actualizar estado global de Redux y sincronizar SignalR en 0 ms
    if (parsed.houseId) {
      const houseId = parsed.houseId;
      dispatch(setActiveHouse(houseId));

      // Sincronización en tiempo real vía SignalR
      try {
        SocialCollaborationService.initConnection(houseId);
        ApiService.getInventory(houseId).then((items) => {
          if (items && items.length > 0) {
            dispatch(setInventory(items));
          }
        }).catch(() => {});
      } catch {
        // Modo offline resiliente
      }
    }

    // 3. Disparar foco en el campo "Añadir producto a la lista..."
    dispatch(triggerFocusShoppingInput());

    // 4. Navegar a la pestaña 'Lista' (ShoppingListScreen)
    dispatch(setCurrentTab('list'));
  }

  /**
   * Inicia el ciclo de escucha activa de etiquetas físicas (NDEF y NfcA)
   * Garantiza la liberación del chip llamando a cancelTechnologyRequest() en el bloque finally.
   */
  async startTagDiscovery(onTagScanned: NfcScanCallback): Promise<void> {
    if (this.isScanning) {
      await this.stopTagDiscovery();
    }

    try {
      await this.init();
      this.isScanning = true;

      // Solicitar tecnología NDEF y NfcA
      await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.NfcA]);

      const tag = await NfcManager.getTag();
      const parsedResult = parseNfcTag(tag);

      // Feedback háptico inmediato
      try {
        Vibration.vibrate([0, 70, 50, 70]);
      } catch {
        // ignore
      }
      HapticFeedback.impactAsync();

      onTagScanned(parsedResult);
    } catch (err: any) {
      // Silenciar cancelaciones deliberadas del usuario
      if (err?.message?.includes?.('cancelled')) return;
    } finally {
      await this.stopTagDiscovery();
    }
  }

  /**
   * Detiene la sesión de lectura NFC de forma limpia liberando el chip para evitar memory leaks
   */
  async stopTagDiscovery(): Promise<void> {
    this.isScanning = false;
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch {
      // Ignorar si no había sesión activa
    }
  }

  /**
   * Clave de persistencia para redirecciones NFC pendientes cuando el usuario no está autenticado
   */
  private readonly PENDING_REDIRECT_KEY = '@kitchy_pending_nfc_redirect';

  /**
   * Almacena una redirección NFC para ejecutarla tras iniciar sesión
   */
  async setPendingRedirect(redirect: ParsedNfcResult | null): Promise<void> {
    try {
      if (redirect) {
        await AsyncStorage.setItem(this.PENDING_REDIRECT_KEY, JSON.stringify(redirect));
      } else {
        await AsyncStorage.removeItem(this.PENDING_REDIRECT_KEY);
      }
    } catch {
      // Ignorar fallos de I/O
    }
  }

  /**
   * Recupera la redirección NFC pendiente
   */
  async getPendingRedirect(): Promise<ParsedNfcResult | null> {
    try {
      const stored = await AsyncStorage.getItem(this.PENDING_REDIRECT_KEY);
      if (stored) {
        return JSON.parse(stored) as ParsedNfcResult;
      }
    } catch {
      // Ignorar fallos de parsing
    }
    return null;
  }

  /**
   * Elimina cualquier redirección NFC pendiente
   */
  async clearPendingRedirect(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.PENDING_REDIRECT_KEY);
    } catch {
      // Ignorar
    }
  }

  /**
   * Intercepta el Intent inicial de lectura NDEF en arranque en frío (App cerrada)
   */
  async getInitialTag(): Promise<ParsedNfcResult | null> {
    try {
      await this.init();
      const isSupp = await this.isSupported();
      if (!isSupp) return null;

      // Consultar tag inicial de react-native-nfc-manager
      let rawTag: any = null;
      if (typeof (NfcManager as any).getInitialTag === 'function') {
        rawTag = await (NfcManager as any).getInitialTag();
      } else if (typeof (NfcManager as any).getLaunchTagEvent === 'function') {
        rawTag = await (NfcManager as any).getLaunchTagEvent();
      }

      if (rawTag) {
        return parseNfcTag(rawTag);
      }
    } catch {
      // Silenciar en entornos sin chip
    }
    return null;
  }

  /**
   * Configura la escucha en primer plano y segundo plano para tags NFC y esquemas kitchy://
   * Devuelve una función para limpiar los listeners de forma limpia.
   */
  setupForegroundListener(onTagScanned: NfcScanCallback): () => void {
    let isActive = true;

    // 1. Listener de deep links vía Linking (kitchy://)
    const linkingSub = Linking.addEventListener('url', (event) => {
      if (!isActive) return;
      if (event.url && event.url.toLowerCase().startsWith('kitchy://')) {
        const parsed = parseNfcTag(event.url);
        onTagScanned(parsed);
      }
    });

    // 2. Listener de etiquetas NDEF vía NfcManager
    try {
      if (typeof (NfcManager as any).setEventListener === 'function') {
        (NfcManager as any).setEventListener(NfcTech.Ndef, async (tag: any) => {
          if (!isActive) return;
          try {
            const parsed = parseNfcTag(tag);
            onTagScanned(parsed);
          } finally {
            await this.stopTagDiscovery();
          }
        });
      }
    } catch {
      // Silenciar si no está soportado
    }

    return () => {
      isActive = false;
      linkingSub.remove();
      try {
        if (typeof (NfcManager as any).setEventListener === 'function') {
          (NfcManager as any).setEventListener(NfcTech.Ndef, null);
        }
      } catch {}
      this.stopTagDiscovery();
    };
  }

  /**
   * Dispara una simulación de contacto NFC para entornos sin chip (Emuladores / Tablets como Xiaomi Pad 5)
   */
  simulateTagScan(mockHouseId?: string, onTagScanned?: NfcScanCallback): void {
    try {
      Vibration.vibrate([0, 70, 50, 70]);
    } catch {}
    HapticFeedback.impactAsync();

    const tagId = `sim-nfc-${Date.now().toString().slice(-4)}`;
    const parsed: ParsedNfcResult = {
      tagId,
      action: 'shopping-list',
      targetTab: 'list',
      houseId: mockHouseId,
      rawText: mockHouseId ? `kitchy://house/${mockHouseId}` : 'KITCHY_SHOPPING_LIST',
      isVirgin: !mockHouseId,
      uri: mockHouseId ? `kitchy://house/${mockHouseId}` : undefined,
    };

    if (onTagScanned) {
      onTagScanned(parsed);
    }
  }
}

export const NfcService = new NfcServiceClass();
