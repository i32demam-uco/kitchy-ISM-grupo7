/**
 * SpeechSynthesisService - Servicio de Síntesis de Voz (Text-to-Speech / TTS) para Modo Cocina.
 * 
 * Lee en voz alta las instrucciones de cada paso culinario, permitiendo al usuario cocinar
 * con las manos ocupadas sin necesidad de mirar la pantalla constantemente.
 */
export class SpeechSynthesisService {
  private static isSpeaking: boolean = false;
  private static ttsModule: any = null;
  private static isInitialized: boolean = false;

  private static init() {
    if (this.isInitialized) return;

    try {
      // Intentar cargar react-native-tts si estuviera enlazado nativamente
      const Tts = require('react-native-tts');
      if (Tts && typeof Tts.speak === 'function') {
        this.ttsModule = Tts;
        this.ttsModule.setDefaultLanguage('es-ES');
        this.ttsModule.setDefaultRate(0.5);
      }
    } catch {
      // Fallback a simulación auditiva sin bloquear la UI
      this.ttsModule = null;
    }

    this.isInitialized = true;
  }

  /**
   * Lee un texto en voz alta.
   */
  static speak(text: string, onDone?: () => void) {
    this.init();
    if (!text || text.trim() === '') return;

    this.isSpeaking = true;

    if (this.ttsModule) {
      try {
        this.ttsModule.stop();
        this.ttsModule.speak(text);
        if (onDone) {
          setTimeout(onDone, Math.max(1500, text.length * 60));
        }
        return;
      } catch {
        // En caso de fallo nativo, cae en fallback silencioso
      }
    }

    // Fallback de desarrollo y testing
    if (onDone) {
      setTimeout(() => {
        this.isSpeaking = false;
        onDone();
      }, 500);
    }
  }

  /**
   * Detiene la reproducción de voz actual.
   */
  static stop() {
    this.isSpeaking = false;
    if (this.ttsModule) {
      try {
        this.ttsModule.stop();
      } catch {
        // Ignorar
      }
    }
  }

  static getStatus(): boolean {
    return this.isSpeaking;
  }
}

