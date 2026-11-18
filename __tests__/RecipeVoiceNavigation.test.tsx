import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import {
  setActiveRecipe,
  setHandsFreeActive,
  goToStep,
  DEFAULT_RECIPE,
} from '../src/store/recipesSlice';
import { HandsFreeCookingScreen } from '../src/screens/HandsFreeCookingScreen';
import {
  parseRecipeVoiceCommand,
} from '../src/utils/recipeVoiceCommands';
import { VoiceRecognitionService } from '../src/services/voiceRecognitionService';
import { SpeechSynthesisService } from '../src/services/speechSynthesisService';

describe('⚡ RecipeVoiceNavigation: Control por Voz Interactivo en Recetas ⚡', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(SpeechSynthesisService, 'speak').mockImplementation(() => {});
    jest.spyOn(SpeechSynthesisService, 'stop').mockImplementation(() => {});
    await ReactTestRenderer.act(async () => {
      store.dispatch(setActiveRecipe(DEFAULT_RECIPE));
      store.dispatch(setHandsFreeActive(true));
    });
  });

  afterEach(() => {
    VoiceRecognitionService.stopListening();
  });

  describe('1. Parser de Comandos de Voz en Español (parseRecipeVoiceCommand)', () => {
    test('Interpreta órdenes de avanzar al siguiente paso', () => {
      const phrases = [
        'pasa al siguiente paso',
        'siguiente paso',
        'siguiente',
        'avanza',
        'adelante',
        'continúa al siguiente',
        'próximo paso',
      ];

      for (const phrase of phrases) {
        const cmd = parseRecipeVoiceCommand(phrase, 5);
        expect(cmd.type).toBe('NEXT_STEP');
        expect(cmd.feedbackMessage).toContain('siguiente paso');
      }
    });

    test('Interpreta saltos a pasos específicos con dígitos numéricos ("pasa al paso 4")', () => {
      const res4 = parseRecipeVoiceCommand('pasa al paso 4', 5);
      expect(res4.type).toBe('GO_TO_STEP');
      expect(res4.stepNumber).toBe(4);
      expect(res4.feedbackMessage).toContain('paso 4');

      const res2 = parseRecipeVoiceCommand('ve al paso 2', 5);
      expect(res2.type).toBe('GO_TO_STEP');
      expect(res2.stepNumber).toBe(2);

      const res5 = parseRecipeVoiceCommand('salta al paso 5', 5);
      expect(res5.type).toBe('GO_TO_STEP');
      expect(res5.stepNumber).toBe(5);

      const res1 = parseRecipeVoiceCommand('pon el paso 1', 5);
      expect(res1.type).toBe('GO_TO_STEP');
      expect(res1.stepNumber).toBe(1);

      const res3 = parseRecipeVoiceCommand('paso 3', 5);
      expect(res3.type).toBe('GO_TO_STEP');
      expect(res3.stepNumber).toBe(3);
    });

    test('Interpreta números en palabras y ordinales en español ("paso cuatro", "tercer paso")', () => {
      const resWord = parseRecipeVoiceCommand('pasa al paso cuatro', 5);
      expect(resWord.type).toBe('GO_TO_STEP');
      expect(resWord.stepNumber).toBe(4);

      const resTwo = parseRecipeVoiceCommand('ve al paso dos', 5);
      expect(resTwo.type).toBe('GO_TO_STEP');
      expect(resTwo.stepNumber).toBe(2);

      const resOrdinal = parseRecipeVoiceCommand('cuarto paso', 5);
      expect(resOrdinal.type).toBe('GO_TO_STEP');
      expect(resOrdinal.stepNumber).toBe(4);

      const resFirst = parseRecipeVoiceCommand('al primer paso', 5);
      expect(resFirst.type).toBe('GO_TO_STEP');
      expect(resFirst.stepNumber).toBe(1);
    });

    test('Acota límites si el número excede los pasos totales de la receta', () => {
      const resOutOfRange = parseRecipeVoiceCommand('ve al paso 99', 5);
      expect(resOutOfRange.type).toBe('GO_TO_STEP');
      expect(resOutOfRange.stepNumber).toBe(5); // Clamped to 5
    });

    test('Interpreta retroceder al paso anterior', () => {
      const phrases = ['paso anterior', 'anterior', 'vuelve al paso anterior', 'atrás', 'retrocede'];
      for (const phrase of phrases) {
        const cmd = parseRecipeVoiceCommand(phrase, 5);
        expect(cmd.type).toBe('PREV_STEP');
      }
    });

    test('Interpreta repetir el paso actual', () => {
      const cmd = parseRecipeVoiceCommand('repite el paso por favor', 5);
      expect(cmd.type).toBe('REPEAT_STEP');
    });

    test('Interpreta controles de temporizador', () => {
      expect(parseRecipeVoiceCommand('iniciar temporizador', 5).type).toBe('START_TIMER');
      expect(parseRecipeVoiceCommand('pausar tiempo', 5).type).toBe('PAUSE_TIMER');
    });

    test('Detecta comando desconocido con sugerencia de ayuda', () => {
      const cmd = parseRecipeVoiceCommand('abre la puerta', 5);
      expect(cmd.type).toBe('UNKNOWN');
      expect(cmd.feedbackMessage).toContain('Prueba diciendo');
    });
  });

  describe('2. UI & Integración en Pantalla de Cocina (HandsFreeCookingScreen)', () => {
    test('Renderiza el botón interactivo de micrófono para pulsar y activar/pausar', async () => {
      let renderer: any;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <Provider store={store}>
            <HandsFreeCookingScreen />
          </Provider>
        );
      });

      const root = renderer.root;
      const micBtn = root.findByProps({ testID: 'btn-toggle-mic-cooking' });
      expect(micBtn).toBeDefined();

      const textNodes = micBtn.findAllByType('Text' as any);
      const textContents = textNodes.map((n: any) => n.props.children).join(' ');
      expect(textContents).toContain('Escuchando');

      // Tocar el botón de micrófono para pausar
      await ReactTestRenderer.act(async () => {
        micBtn.props.onPress();
      });

      const textNodesAfter = micBtn.findAllByType('Text' as any);
      const textContentsAfter = textNodesAfter.map((n: any) => n.props.children).join(' ');
      expect(textContentsAfter).toContain('Pulsar para activar micrófono');

      await ReactTestRenderer.act(() => {
        renderer.unmount();
      });
    });

    test('Ejecuta comando "pasa al paso 4" y actualiza Redux al paso 4 (índice 3)', async () => {
      let voiceCallback: ((text: string) => void) | null = null;
      jest.spyOn(VoiceRecognitionService, 'startListening').mockImplementation(async (onResult: any) => {
        voiceCallback = onResult;
        return true;
      });

      let renderer: any;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <Provider store={store}>
            <HandsFreeCookingScreen />
          </Provider>
        );
      });

      expect(voiceCallback).toBeDefined();

      // Emitir voz simulada: "pasa al paso 4"
      await ReactTestRenderer.act(async () => {
        voiceCallback?.('pasa al paso 4');
      });

      // El índice de Redux debe ser 3 (Paso 4: Cascar los huevos)
      expect(store.getState().recipes.currentStepIndex).toBe(3);

      // Comprobar banner de feedback visual
      const root = renderer.root;
      const banner = root.findByProps({ testID: 'voice-feedback-banner' });
      expect(banner).toBeDefined();
      const bannerText = banner.findByType('Text' as any).props.children;
      expect(bannerText).toContain('Paso 4');

      await ReactTestRenderer.act(() => {
        renderer.unmount();
      });
    });

    test('Ejecuta comando "pasa al siguiente paso" y avanza en Redux', async () => {
      let voiceCallback: ((text: string) => void) | null = null;
      jest.spyOn(VoiceRecognitionService, 'startListening').mockImplementation(async (onResult: any) => {
        voiceCallback = onResult;
        return true;
      });

      await ReactTestRenderer.act(async () => {
        store.dispatch(goToStep(1)); // Comenzamos en paso 2 (índice 1)
      });

      let renderer: any;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <Provider store={store}>
            <HandsFreeCookingScreen />
          </Provider>
        );
      });

      // Emitir voz simulada: "pasa al siguiente paso"
      await ReactTestRenderer.act(async () => {
        voiceCallback?.('pasa al siguiente paso');
      });

      // Debe haber avanzado al paso 3 (índice 2)
      expect(store.getState().recipes.currentStepIndex).toBe(2);

      await ReactTestRenderer.act(() => {
        renderer.unmount();
      });
    });

    test('Ejecuta comando "paso anterior" y retrocede en Redux', async () => {
      let voiceCallback: ((text: string) => void) | null = null;
      jest.spyOn(VoiceRecognitionService, 'startListening').mockImplementation(async (onResult: any) => {
        voiceCallback = onResult;
        return true;
      });

      await ReactTestRenderer.act(async () => {
        store.dispatch(goToStep(3)); // Comenzamos en paso 4 (índice 3)
      });

      let renderer: any;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <Provider store={store}>
            <HandsFreeCookingScreen />
          </Provider>
        );
      });

      // Emitir voz: "paso anterior"
      await ReactTestRenderer.act(async () => {
        voiceCallback?.('paso anterior');
      });

      // Debe retroceder al paso 3 (índice 2)
      expect(store.getState().recipes.currentStepIndex).toBe(2);

      await ReactTestRenderer.act(() => {
        renderer.unmount();
      });
    });
  });
});
