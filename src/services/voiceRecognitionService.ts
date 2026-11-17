import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import { PermissionsManager } from './permissions';

export type VoiceResultCallback = (text: string) => void;
export type VoiceErrorCallback = (error: string) => void;
export type VoiceEndCallback = () => void;

/**
 * VoiceRecognitionService - Integración Hardware de Reconocimiento de Voz Nativo Real (Speech-to-Text).
 *
 * Cumplimiento Arquitectónico:
 * 1. Hardware Sensor: Utiliza el motor nativo de SpeechRecognizer de Android / iOS.
 * 2. Cero Mockups: Transcribe la voz real capturada por el micrófono directamente al estado de la app.
 * 3. Gestión del Ciclo de Vida: Libera listeners y recursos de audio para evitar memory leaks.
 */
export class VoiceRecognitionService {
  private static isListening: boolean = false;
  private static onResultHandler: VoiceResultCallback | null = null;
  private static onErrorHandler: VoiceErrorCallback | null = null;
  private static onEndHandler: VoiceEndCallback | null = null;
  private static isInitialized: boolean = false;

  private static init() {
    if (this.isInitialized) return;

    Voice.onSpeechStart = () => {
      this.isListening = true;
    };

    Voice.onSpeechEnd = () => {
      this.isListening = false;
      if (this.onEndHandler) {
        this.onEndHandler();
      }
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      this.isListening = false;
      const errMsg = e.error?.message || 'Error en reconocimiento de voz';
      if (this.onErrorHandler) {
        this.onErrorHandler(errMsg);
      }
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        const transcript = e.value[0];
        if (this.onResultHandler) {
          this.onResultHandler(transcript);
        }
      }
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        const transcript = e.value[0];
        if (this.onResultHandler) {
          this.onResultHandler(transcript);
        }
      }
    };

    this.isInitialized = true;
  }

  static async startListening(
    onResult: VoiceResultCallback,
    onError?: VoiceErrorCallback,
    onEnd?: VoiceEndCallback
  ): Promise<boolean> {
    this.init();
    this.onResultHandler = onResult;
    this.onErrorHandler = onError || null;
    this.onEndHandler = onEnd || null;

    // 1. Solicitar permisos de audio reales
    const hasPerm = await PermissionsManager.requestAudioPermission();
    if (!hasPerm) {
      if (onError) onError('Permiso de micrófono denegado');
      return false;
    }

    try {
      const isVoiceAvailable = Voice && typeof Voice.start === 'function';
      if (!isVoiceAvailable) {
        if (onError) onError('Motor de reconocimiento de voz no disponible en este dispositivo');
        return false;
      }
      if (this.isListening) {
        await Voice.stop();
      }
      await Voice.start('es-ES');
      this.isListening = true;
      return true;
    } catch (err: any) {
      this.isListening = false;
      const msg = err?.message || 'Servicio de voz no disponible';
      if (onError) onError(msg);
      return false;
    }
  }

  static async stopListening(): Promise<void> {
    try {
      await Voice.stop();
    } catch {
      // Ignorar fallo al detener
    } finally {
      this.isListening = false;
    }
  }

  static async destroy(): Promise<void> {
    try {
      await Voice.destroy();
      Voice.removeAllListeners();
    } catch {
      // Ignorar fallo al destruir
    } finally {
      this.isListening = false;
      this.isInitialized = false;
      this.onResultHandler = null;
      this.onErrorHandler = null;
      this.onEndHandler = null;
    }
  }

  static getListeningState(): boolean {
    return this.isListening;
  }
}
