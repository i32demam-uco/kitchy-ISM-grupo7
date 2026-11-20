import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import { Platform } from 'react-native';
import { PermissionsManager } from './permissions';

export type VoiceResultCallback = (text: string) => void;
export type VoiceErrorCallback = (error: string) => void;
export type VoiceEndCallback = () => void;

/**
 * VoiceRecognitionService - Integración Hardware de Reconocimiento de Voz Nativo Real (Speech-to-Text).
 *
 * Cumplimiento Arquitectónico y Resiliencia en Dispositivos Reales (Tablets & Móviles Android/iOS):
 * 1. Hardware Sensor: Utiliza el motor nativo de SpeechRecognizer de Android / iOS.
 * 2. Auto-Rearm / Keep-Alive: En Android, SpeechRecognizer finaliza por inactividad (error 6/7)
 *    o tras cada frase dictada. El servicio mantiene activo el micrófono de forma continua
 *    reiniciando la escucha de forma transparente sin que la UI se apague.
 * 3. Filtrado de Errores Transitorios: Ignora timeouts por silencio ambiental y sólo
 *    aborta ante errores fatales de permisos o falta de motor de síntesis.
 * 4. Cero Memory Leaks: Limpia temporizadores y cancela la escucha al salir.
 */
export class VoiceRecognitionService {
  private static isListening: boolean = false;
  private static shouldKeepListening: boolean = false;
  private static isRecognizing: boolean = false;
  private static restartTimer: any = null;
  private static onResultHandler: VoiceResultCallback | null = null;
  private static onErrorHandler: VoiceErrorCallback | null = null;
  private static onEndHandler: VoiceEndCallback | null = null;
  private static isInitialized: boolean = false;

  private static getVoiceOptions() {
    if (Platform.OS === 'android') {
      return {
        EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
        EXTRA_MAX_RESULTS: 5,
        EXTRA_PARTIAL_RESULTS: true,
        REQUEST_PERMISSIONS_AUTO: false,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 3000,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2500,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2500,
      };
    }
    return {};
  }

  private static init() {
    if (this.isInitialized) return;

    Voice.onSpeechStart = () => {
      this.isRecognizing = true;
      this.isListening = true;
    };

    Voice.onSpeechEnd = () => {
      this.isRecognizing = false;
      // Si el usuario no ha pulsado pausar, auto-rearmar la escucha continua en cocina
      if (this.shouldKeepListening) {
        this.scheduleRestart(250);
      } else {
        this.isListening = false;
        if (this.onEndHandler) {
          this.onEndHandler();
        }
      }
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      this.isRecognizing = false;
      const code = String(e.error?.code || '');
      const errMsg = e.error?.message || 'Error en reconocimiento de voz';

      // Códigos transitorios de Android:
      // 6: SPEECH_TIMEOUT (No speech input / silencio)
      // 7: NO_MATCH (No entendió ruido de fondo o silencio)
      // 8: RECOGNIZER_BUSY (Motor temporalmente ocupado)
      // 5: CLIENT_SIDE (Estado temporal)
      const isTransient =
        code === '6' ||
        code === '7' ||
        code === '8' ||
        code === '5' ||
        errMsg.toLowerCase().includes('no speech') ||
        errMsg.toLowerCase().includes('no match') ||
        errMsg.toLowerCase().includes('busy');

      if (this.shouldKeepListening && isTransient) {
        // En un entorno de cocina, el silencio o ruido de sartenes no debe apagar el micrófono
        this.scheduleRestart(300);
        return;
      }

      // Error crítico de permisos
      if (code === '9' || errMsg.toLowerCase().includes('permission')) {
        this.shouldKeepListening = false;
        this.isListening = false;
        if (this.onErrorHandler) {
          this.onErrorHandler('Permiso de micrófono denegado en ajustes');
        }
        return;
      }

      // Si queremos seguir escuchando ante otro error, rearmar con backoff
      if (this.shouldKeepListening) {
        this.scheduleRestart(600);
      } else {
        this.isListening = false;
        if (this.onErrorHandler) {
          this.onErrorHandler(errMsg);
        }
      }
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        const transcript = e.value[0];
        if (transcript && this.onResultHandler) {
          this.onResultHandler(transcript);
        }
      }
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        const transcript = e.value[0];
        if (transcript && this.onResultHandler) {
          this.onResultHandler(transcript);
        }
      }
    };

    this.isInitialized = true;
  }

  private static scheduleRestart(delayMs = 250) {
    if (!this.shouldKeepListening) return;

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    this.restartTimer = setTimeout(async () => {
      if (!this.shouldKeepListening) return;
      try {
        if (this.isRecognizing) {
          await Voice.stop().catch(() => {});
        }
        await Voice.start('es-ES', this.getVoiceOptions());
        this.isListening = true;
      } catch (err: any) {
        console.warn('[VoiceRecognitionService] Rearm attempt warning:', err?.message || err);
        if (this.shouldKeepListening) {
          this.scheduleRestart(700);
        }
      }
    }, delayMs);
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
      if (onError) onError('Permiso de micrófono denegado en ajustes');
      return false;
    }

    try {
      const isVoiceAvailable = Voice && typeof Voice.start === 'function';
      if (!isVoiceAvailable) {
        if (onError) onError('Motor de reconocimiento de voz no disponible');
        return false;
      }

      this.shouldKeepListening = true;
      if (this.restartTimer) {
        clearTimeout(this.restartTimer);
        this.restartTimer = null;
      }

      try {
        await Voice.stop().catch(() => {});
      } catch {
        // Ignorar
      }

      await Voice.start('es-ES', this.getVoiceOptions());
      this.isListening = true;
      return true;
    } catch (err: any) {
      this.isListening = false;
      this.shouldKeepListening = false;
      const msg = err?.message || 'Servicio de voz no disponible en este dispositivo';
      if (onError) onError(msg);
      return false;
    }
  }

  static async stopListening(): Promise<void> {
    this.shouldKeepListening = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    try {
      await Voice.stop().catch(() => {});
    } catch {
      // Ignorar fallo al detener
    } finally {
      this.isListening = false;
      this.isRecognizing = false;
      if (this.onEndHandler) {
        this.onEndHandler();
      }
    }
  }

  static async destroy(): Promise<void> {
    this.shouldKeepListening = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    try {
      await Voice.destroy().catch(() => {});
      Voice.removeAllListeners();
    } catch {
      // Ignorar fallo al destruir
    } finally {
      this.isListening = false;
      this.isRecognizing = false;
      this.isInitialized = false;
      this.onResultHandler = null;
      this.onErrorHandler = null;
      this.onEndHandler = null;
    }
  }

  static getListeningState(): boolean {
    return this.isListening || this.shouldKeepListening;
  }
}
