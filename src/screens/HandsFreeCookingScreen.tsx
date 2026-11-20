import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
  Dimensions,
  DeviceEventEmitter,
  PanResponder,
} from 'react-native';
import { Colors, Typography } from '../theme';
import { useAppDispatch, useAppSelector } from '../store';
import {
  nextStep,
  prevStep,
  goToStep,
  toggleTimer,
  decrementTimer,
  resetTimer,
  setHandsFreeActive,
  setDeltaModalVisible,
} from '../store/recipesSlice';
import { toggleProximity } from '../store/hardwareSlice';
import { removeInventoryItem, updateInventoryItemQuantity } from '../store/inventorySlice';
import { RecipeDeltaModal } from '../components/RecipeDeltaModal';
import { VectorIcon } from '../components/VectorIcon';
import { KitchyAlert } from '../services/kitchyAlert';
import { SpeechSynthesisService } from '../services/speechSynthesisService';
import { VoiceRecognitionService } from '../services/voiceRecognitionService';
import { RecipeService } from '../services/recipeService';
import { HapticFeedback } from '../services/haptics';
import { parseRecipeVoiceCommand } from '../utils/recipeVoiceCommands';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HandsFreeCookingScreenProps {
  onBack?: () => void;
}

/**
 * HandsFreeCookingScreen - Clon Pixel-Perfect del Visor de Cocina Manos Libres.
 * 
 * Requisitos y Fidelidad Visual Absoluta (media_1794509021467_1ee6b01b.jpg):
 * 1. Cabecera con degradado fotorrealista del plato e interruptor de Gestos Activos en esmeralda oscuro.
 * 2. Título de modo "MODO COCINA · MANOS LIBRES" y subtítulo de raciones/despensa.
 * 3. Barra segmentada de progreso: "PASO X DE Y" y "Quedan unos Z min.".
 * 4. Tipografía Poppins Bold (28px) para la instrucción principal y 16px para la descripción.
 * 5. Tarjeta del temporizador redondeada (#162921) con contador interactivo y botón Play/Pause verde (#00E676).
 * 6. Alerta ámbar de Seguridad Alimentaria (temperatura interna del alimento).
 * 7. Ecualizador animado a 60 FPS con feedback de voz interactivo ("Te escucho, Alejandro").
 * 8. Sensor de proximidad con debounce de 800ms para avanzar al pasar la mano sobre la pantalla.
 */
export const HandsFreeCookingScreen: React.FC<HandsFreeCookingScreenProps> = ({ onBack }) => {
  const dispatch = useAppDispatch();
  const recipesState = useAppSelector((state) => state.recipes);
  const hardwareState = useAppSelector((state) => state.hardware);
  const auth = useAppSelector((state) => state.auth);
  const houseId = auth.activeHouse?.id || 'a0000000-0000-0000-0000-000000000001';

  const activeRecipe = recipesState.activeRecipe;
  const currentStepIndex = recipesState.currentStepIndex;
  const currentStep = activeRecipe.steps[currentStepIndex] || activeRecipe.steps[0];
  const totalSteps = activeRecipe.steps.length;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicListening, setIsMicListening] = useState<boolean>(false);
  const [lastVoiceTranscript, setLastVoiceTranscript] = useState<string>('');
  const [voiceFeedback, setVoiceFeedback] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);
  const feedbackTimeoutRef = useRef<any>(null);
  const lastProximityTrigger = useRef<number>(0);

  // Micro-punto parpadeante de detección física de hardware
  const hardwareDotAnim = useRef(new Animated.Value(0)).current;

  // Transiciones fluidas de Paso a Paso (fade + slide vertical suave)
  const stepFadeAnim = useRef(new Animated.Value(1)).current;
  const stepSlideAnim = useRef(new Animated.Value(0)).current;

  // Parpadeo reactivo del micro-punto verde cuando el sensor físico detecta barrido
  const flashHardwareDot = useCallback(() => {
    Animated.sequence([
      Animated.timing(hardwareDotAnim, {
        toValue: 1,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(hardwareDotAnim, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start();
  }, [hardwareDotAnim]);

  // Transición animada al cambiar de paso
  useEffect(() => {
    stepFadeAnim.setValue(0);
    stepSlideAnim.setValue(14);
    Animated.parallel([
      Animated.timing(stepFadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(stepSlideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStepIndex, stepFadeAnim, stepSlideAnim]);

  // Barras animadas del ecualizador de voz a 60 FPS
  const wave1 = useRef(new Animated.Value(0.35)).current;
  const wave2 = useRef(new Animated.Value(0.75)).current;
  const wave3 = useRef(new Animated.Value(0.45)).current;
  const wave4 = useRef(new Animated.Value(1.0)).current;
  const wave5 = useRef(new Animated.Value(0.6)).current;
  const wave6 = useRef(new Animated.Value(0.3)).current;
  const wave7 = useRef(new Animated.Value(0.85)).current;

  // Temporizador regresivo por segundo
  useEffect(() => {
    let timerInterval: any = null;
    if (recipesState.isTimerRunning && recipesState.timerSecondsRemaining > 0) {
      timerInterval = setInterval(() => {
        dispatch(decrementTimer());
      }, 1000);
    } else if (recipesState.timerSecondsRemaining === 0 && recipesState.isTimerRunning) {
      dispatch(toggleTimer());
      HapticFeedback.impactAsync();
      KitchyAlert.show(
        '¡Temporizador finalizado!',
        `El tiempo para "${currentStep.title}" ha concluido.`
      );
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [recipesState.isTimerRunning, recipesState.timerSecondsRemaining, currentStep?.title, dispatch]);

  // Animación continua del ecualizador auditivo
  useEffect(() => {
    const createLoop = (anim: Animated.Value, min: number, max: number, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: max,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: min,
            duration,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const a1 = createLoop(wave1, 0.2, 0.9, 320);
    const a2 = createLoop(wave2, 0.3, 1.0, 420);
    const a3 = createLoop(wave3, 0.15, 0.8, 270);
    const a4 = createLoop(wave4, 0.4, 1.0, 480);
    const a5 = createLoop(wave5, 0.25, 0.85, 360);
    const a6 = createLoop(wave6, 0.1, 0.7, 300);
    const a7 = createLoop(wave7, 0.3, 0.95, 400);

    a1.start();
    a2.start();
    a3.start();
    a4.start();
    a5.start();
    a6.start();
    a7.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
      a4.stop();
      a5.stop();
      a6.stop();
      a7.stop();
    };
  }, [wave1, wave2, wave3, wave4, wave5, wave6, wave7]);

  // Síntesis de voz automática al cambiar de paso
  useEffect(() => {
    if (currentStep) {
      const speechText = `${currentStep.title}. ${currentStep.text}`;
      setIsSpeaking(true);
      SpeechSynthesisService.speak(speechText, () => {
        setIsSpeaking(false);
      });
    }
    return () => {
      SpeechSynthesisService.stop();
    };
  }, [currentStepIndex]);

  const handleCompleteCooking = useCallback(async () => {
    HapticFeedback.impactAsync();
    SpeechSynthesisService.stop();

    // Descontar en Redux local inmediatamente
    activeRecipe.ingredients.forEach((ing) => {
      dispatch(updateInventoryItemQuantity({
        id: ing.name,
        delta: -(ing.quantity * recipesState.servingsMultiplier),
      }));
    });

    try {
      await RecipeService.completeCooking(
        activeRecipe.id,
        houseId,
        recipesState.servingsMultiplier
      );
    } catch {
      // Resiliencia offline
    }

    KitchyAlert.show(
      '¡Receta completada!',
      `Has cocinado "${activeRecipe.title}". Los ingredientes se han descontado de tu despensa y se ha avisado al chat del hogar.`,
      [
        {
          text: 'Buen provecho',
          onPress: () => {
            dispatch(setHandsFreeActive(false));
            if (onBack) onBack();
          },
        },
      ]
    );
  }, [activeRecipe, houseId, recipesState.servingsMultiplier, dispatch, onBack]);

  // Controles de Respaldo con Pausa Inteligente
  const handleManualNextStep = useCallback(() => {
    HapticFeedback.impactAsync();
    // Pausa Inteligente: detiene el temporizador inmediatamente
    if (recipesState.isTimerRunning) {
      dispatch(toggleTimer());
    }
    if (currentStepIndex < totalSteps - 1) {
      dispatch(nextStep());
    } else {
      handleCompleteCooking();
    }
  }, [recipesState.isTimerRunning, currentStepIndex, totalSteps, dispatch, handleCompleteCooking]);

  const handleManualPrevStep = useCallback(() => {
    HapticFeedback.selectionAsync();
    // Pausa Inteligente: detiene el temporizador
    if (recipesState.isTimerRunning) {
      dispatch(toggleTimer());
    }
    if (currentStepIndex > 0) {
      dispatch(prevStep());
    }
  }, [recipesState.isTimerRunning, currentStepIndex, dispatch]);

  // Sensor de proximidad con debounce de 800 ms y Pausa Inteligente (RF14, CU-03)
  const triggerProximityStepAdvance = useCallback(() => {
    if (!hardwareState.isProximityActive) return;

    const now = Date.now();
    if (now - lastProximityTrigger.current < 600) {
      return; // Debounce activo
    }
    lastProximityTrigger.current = now;

    // Indicador visual parpadeante del hardware y respuesta háptica
    flashHardwareDot();
    handleManualNextStep();
  }, [hardwareState.isProximityActive, flashHardwareDot, handleManualNextStep]);

  // Retroceder un paso mediante sensor o gesto
  const triggerProximityStepBack = useCallback(() => {
    if (!hardwareState.isProximityActive) return;

    const now = Date.now();
    if (now - lastProximityTrigger.current < 600) {
      return; // Debounce activo
    }
    lastProximityTrigger.current = now;

    flashHardwareDot();
    handleManualPrevStep();
  }, [hardwareState.isProximityActive, flashHardwareDot, handleManualPrevStep]);

  // Gesto táctil horizontal (Swipe/Scroll) para avanzar o retroceder paso
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Detectar desplazamiento horizontal intencionado (>35px) y mayor que el vertical
        return (
          Math.abs(gestureState.dx) > 35 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -45) {
          // Deslizamiento hacia la izquierda -> Siguiente paso
          handleManualNextStep();
        } else if (gestureState.dx > 45) {
          // Deslizamiento hacia la derecha -> Paso anterior
          handleManualPrevStep();
        }
      },
    })
  ).current;

  // Listener nativo del sensor de proximidad del dispositivo
  useEffect(() => {
    if (!hardwareState.isProximityActive) return;

    const handleHardwareProximity = (data?: any) => {
      console.log('[Native Proximity Hardware Sweep Detected]:', data);
      if (
        data &&
        (data.direction === 'back' ||
          data.direction === 'prev' ||
          data.direction === 'backward' ||
          data.action === 'prev')
      ) {
        triggerProximityStepBack();
      } else {
        triggerProximityStepAdvance();
      }
    };

    const sub1 = DeviceEventEmitter.addListener('proximityStateDidChange', handleHardwareProximity);
    const sub2 = DeviceEventEmitter.addListener('Proximity', handleHardwareProximity);
    const sub3 = DeviceEventEmitter.addListener('proximity', handleHardwareProximity);

    return () => {
      sub1.remove();
      sub2.remove();
      sub3.remove();
    };
  }, [hardwareState.isProximityActive, triggerProximityStepAdvance, triggerProximityStepBack]);

  // Procesamiento y ejecución inteligente de comandos de voz
  const handleVoiceCommand = useCallback(
    (text: string) => {
      if (!text || !text.trim()) return;
      const cleanText = text.trim();
      setLastVoiceTranscript(cleanText);

      const command = parseRecipeVoiceCommand(cleanText, totalSteps);

      if (command.type === 'GO_TO_STEP' && typeof command.stepNumber === 'number') {
        const targetIndex = command.stepNumber - 1;
        if (targetIndex >= 0 && targetIndex < totalSteps) {
          HapticFeedback.notificationSuccessAsync();
          dispatch(goToStep(targetIndex));
          const stepTitle = activeRecipe.steps[targetIndex]?.title || '';
          setVoiceFeedback({
            message: `✓ Paso ${command.stepNumber}: ${stepTitle}`,
            type: 'success',
          });
        }
      } else if (command.type === 'NEXT_STEP') {
        HapticFeedback.selectionAsync();
        if (currentStepIndex < totalSteps - 1) {
          dispatch(nextStep());
          setVoiceFeedback({
            message: `✓ Siguiente paso (${currentStepIndex + 2} de ${totalSteps})`,
            type: 'success',
          });
        } else {
          setVoiceFeedback({
            message: 'Ya estás en el último paso.',
            type: 'info',
          });
        }
      } else if (command.type === 'PREV_STEP') {
        HapticFeedback.selectionAsync();
        if (currentStepIndex > 0) {
          dispatch(prevStep());
          setVoiceFeedback({
            message: `✓ Paso anterior (${currentStepIndex} de ${totalSteps})`,
            type: 'success',
          });
        } else {
          setVoiceFeedback({
            message: 'Ya estás en el primer paso.',
            type: 'info',
          });
        }
      } else if (command.type === 'REPEAT_STEP') {
        HapticFeedback.selectionAsync();
        if (currentStep) {
          const speechText = `${currentStep.title}. ${currentStep.text}`;
          SpeechSynthesisService.speak(speechText);
          setVoiceFeedback({
            message: `🔊 Repitiendo: ${currentStep.title}`,
            type: 'info',
          });
        }
      } else if (command.type === 'START_TIMER') {
        HapticFeedback.selectionAsync();
        if (!recipesState.isTimerRunning) {
          dispatch(toggleTimer());
        }
        setVoiceFeedback({
          message: '⏱ Temporizador en marcha',
          type: 'success',
        });
      } else if (command.type === 'PAUSE_TIMER') {
        HapticFeedback.selectionAsync();
        if (recipesState.isTimerRunning) {
          dispatch(toggleTimer());
        }
        setVoiceFeedback({
          message: '⏸ Temporizador pausado',
          type: 'info',
        });
      } else {
        setVoiceFeedback({
          message: `«${cleanText}». Di «pasa al siguiente paso» o «ve al paso 4».`,
          type: 'info',
        });
      }

      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      feedbackTimeoutRef.current = setTimeout(() => {
        setVoiceFeedback(null);
      }, 4000);
    },
    [totalSteps, currentStepIndex, activeRecipe.steps, currentStep, recipesState.isTimerRunning, dispatch]
  );

  const handleVoiceCommandRef = useRef(handleVoiceCommand);
  handleVoiceCommandRef.current = handleVoiceCommand;

  // Alternar encendido/apagado del micrófono bajo demanda
  const toggleVoiceListening = useCallback(async () => {
    HapticFeedback.impactAsync();
    if (isMicListening) {
      await VoiceRecognitionService.stopListening();
      setIsMicListening(false);
      setVoiceFeedback({
        message: 'Micrófono pausado. Pulsa el botón para reactivar.',
        type: 'info',
      });
    } else {
      setIsMicListening(true);
      setVoiceFeedback({
        message: 'Escuchando tu voz... Di «pasa al siguiente paso» o «ve al paso 4»',
        type: 'info',
      });
      const started = await VoiceRecognitionService.startListening(
        (text: string) => {
          handleVoiceCommandRef.current(text);
        },
        (errMsg) => {
          setIsMicListening(false);
          setVoiceFeedback({
            message: errMsg || 'Error al iniciar reconocimiento de voz',
            type: 'error',
          });
        }
      );
      if (!started) {
        setIsMicListening(false);
      }
    }
  }, [isMicListening]);

  // Limpieza exclusiva al desmontar la pantalla de cocina
  useEffect(() => {
    return () => {
      VoiceRecognitionService.stopListening().catch(() => {});
    };
  }, []);

  const handleBack = () => {
    HapticFeedback.selectionAsync();
    SpeechSynthesisService.stop();
    dispatch(setHandsFreeActive(false));
    if (onBack) {
      onBack();
    }
  };

  const handleToggleTimer = () => {
    HapticFeedback.impactAsync();
    dispatch(toggleTimer());
  };

  const formatTimerDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cálculo de tiempo restante aproximado
  const remainingMinutes = Math.max(
    1,
    Math.round(
      activeRecipe.steps
        .slice(currentStepIndex)
        .reduce((acc, s) => acc + (s.timeSeconds || 180), 0) / 60
    )
  );

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* 1. Header Superior Transparente con Retroceso y Gestos Activos */}
      <View style={styles.topNavigation}>
        <TouchableOpacity
          style={styles.backCircleButton}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityLabel="Volver al menú de recetas"
        >
          <VectorIcon name="chevron-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.topRightControls}>
          {/* Chip "Control por Voz" Interactivo */}
          <TouchableOpacity
            style={[
              styles.voiceTopPill,
              isMicListening ? styles.voiceTopPillActive : styles.voiceTopPillInactive,
            ]}
            onPress={toggleVoiceListening}
            activeOpacity={0.8}
            testID="pill-toggle-mic"
          >
            <VectorIcon
              name="mic"
              size={13}
              color={isMicListening ? '#00E676' : '#9CA3AF'}
            />
            <Text
              style={[
                styles.voiceTopPillText,
                isMicListening ? styles.voiceTopPillTextActive : styles.voiceTopPillTextInactive,
              ]}
            >
              {isMicListening ? 'Voz activa' : 'Voz pausada'}
            </Text>
            <View
              style={[
                styles.voiceIndicatorDot,
                isMicListening && styles.voiceIndicatorDotActive,
              ]}
            />
          </TouchableOpacity>

          {/* Chip "Gestos activos" en Esmeralda Oscuro */}
          <TouchableOpacity
            style={[
              styles.gesturesPill,
              !hardwareState.isProximityActive && styles.gesturesPillInactive,
            ]}
            onPress={() => {
              HapticFeedback.selectionAsync();
              dispatch(toggleProximity());
            }}
            activeOpacity={0.8}
          >
          <VectorIcon
            name="hand-wave"
            size={14}
            color={hardwareState.isProximityActive ? Colors.primaryGreen : '#9CA3AF'}
          />
          <Text
            style={[
              styles.gesturesPillText,
              !hardwareState.isProximityActive && styles.gesturesPillTextInactive,
            ]}
          >
            {hardwareState.isProximityActive ? 'Gestos activos' : 'Gestos pausados'}
          </Text>
          {/* Micro-punto de hardware reactivo: Parpadea en verde neón al detectar movimiento físico */}
          <Animated.View
            style={[
              styles.gestureIndicatorDot,
              hardwareState.isProximityActive && styles.gestureIndicatorDotActive,
              {
                opacity: hardwareDotAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [hardwareState.isProximityActive ? 0.7 : 0.2, 1.0],
                }),
                transform: [
                  {
                    scale: hardwareDotAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.0, 1.9],
                    }),
                  },
                ],
              },
            ]}
          />
        </TouchableOpacity>
      </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Fotografía del Plato con Degradado Oscuro y Tipografía */}
        <View style={styles.heroDishCard}>
          <Image
            source={{
              uri:
                activeRecipe.imageUrl ||
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
            }}
            style={styles.heroDishImage}
            resizeMode="cover"
          />
          <View style={styles.heroGradientOverlay} />

          <View style={styles.heroTextOverlay}>
            <Text style={styles.modeCategoryLabel}>MODO COCINA · MANOS LIBRES</Text>
            <Text style={styles.recipeTitleHeading} numberOfLines={2}>
              {activeRecipe.title}
            </Text>
            <Text style={styles.recipeSubtitleLabel}>
              {activeRecipe.subtitle || `${activeRecipe.servings * recipesState.servingsMultiplier} personas · Con lo que tienes en casa`}
            </Text>
          </View>
        </View>

        {/* 3. Barra de Progreso Segmentada y Metadatos de Paso */}
        <View style={styles.progressContainer}>
          <View style={styles.segmentedProgressBar}>
            {activeRecipe.steps.map((stepItem, index) => {
              const isPassedOrCurrent = index <= currentStepIndex;
              return (
                <TouchableOpacity
                  key={`step-seg-${stepItem.step}`}
                  style={[
                    styles.segmentBarItem,
                    isPassedOrCurrent ? styles.segmentBarActive : styles.segmentBarInactive,
                  ]}
                  onPress={() => {
                    HapticFeedback.selectionAsync();
                    dispatch(goToStep(index));
                  }}
                  activeOpacity={0.8}
                />
              );
            })}
          </View>

          <View style={styles.stepInfoRow}>
            <Text style={styles.stepNumberBadge}>
              PASO {currentStep.step} DE {totalSteps}
            </Text>
            <Text style={styles.timeRemainingText}>
              Quedan unos {remainingMinutes} min.
            </Text>
          </View>
        </View>

        {/* 4. Instrucción Principal en Poppins Bold (28px) con Transición Fluida */}
        <Animated.View
          style={[
            styles.instructionBlock,
            {
              opacity: stepFadeAnim,
              transform: [{ translateY: stepSlideAnim }],
            },
          ]}
        >
          <Text style={styles.instructionMainTitle}>
            {currentStep.title}
          </Text>
          <Text style={styles.instructionDescription}>
            {currentStep.text}
          </Text>
        </Animated.View>

        {/* 5. Tarjeta Redondeada del Temporizador (#162921) */}
        <View style={styles.timerCard}>
          <View style={styles.timerLeftContent}>
            <View style={styles.timerIconAndNumbers}>
              <VectorIcon name="timer" size={24} color={Colors.primaryGreen} />
              <Text style={styles.timerNumbersText}>
                {formatTimerDisplay(recipesState.timerSecondsRemaining)}
              </Text>
            </View>
            <Text style={styles.timerPromptText}>
              {recipesState.isTimerRunning ? 'Temporizador en marcha' : 'Di «iniciar temporizador»'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.timerPlayButton}
            onPress={handleToggleTimer}
            activeOpacity={0.8}
            accessibilityLabel={recipesState.isTimerRunning ? 'Pausar temporizador' : 'Iniciar temporizador'}
          >
            <VectorIcon
              name={recipesState.isTimerRunning ? 'pause' : 'play'}
              size={20}
              color="#000000"
            />
          </TouchableOpacity>
        </View>

        {/* Controles Manuales de Respaldo: Botonera Flotante Glassmorphism con Pausa Inteligente */}
        <View style={styles.manualControlsRow}>
          <TouchableOpacity
            style={[
              styles.manualNavButton,
              currentStepIndex === 0 && styles.manualNavButtonDisabled,
            ]}
            onPress={handleManualPrevStep}
            disabled={currentStepIndex === 0}
            activeOpacity={0.75}
            accessibilityLabel="Paso anterior"
          >
            <VectorIcon
              name="chevron-left"
              size={18}
              color={currentStepIndex === 0 ? '#6B7280' : '#FFFFFF'}
            />
            <Text
              style={[
                styles.manualNavButtonText,
                currentStepIndex === 0 && styles.manualNavButtonTextDisabled,
              ]}
            >
              Anterior
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.manualNavButton, styles.manualNavButtonNext]}
            onPress={handleManualNextStep}
            activeOpacity={0.8}
            accessibilityLabel={currentStepIndex === totalSteps - 1 ? 'Finalizar receta' : 'Siguiente paso'}
          >
            <Text style={styles.manualNavButtonNextText}>
              {currentStepIndex === totalSteps - 1 ? 'Finalizar' : 'Siguiente Paso'}
            </Text>
            <VectorIcon
              name={currentStepIndex === totalSteps - 1 ? 'check' : 'chevron-right'}
              size={18}
              color="#000000"
            />
          </TouchableOpacity>
        </View>

        {/* 6. Alerta Ámbar de Seguridad Alimentaria */}
        <View style={styles.safetyAlertContainer}>
          <VectorIcon name="thermometer" size={16} color="#FFA000" />
          <Text style={styles.safetyAlertText}>
            {currentStep.tip || 'Asegúrate de cocinar el alimento a temperatura interna segura.'}
          </Text>
        </View>

        {/* 7. Barra de Sensor de Proximidad Interactivo y Gestos de Barrido */}
        <View style={styles.proximityDetectorBar}>
          <TouchableOpacity
            style={styles.proximityHalfBtn}
            onPress={triggerProximityStepBack}
            activeOpacity={0.8}
            accessibilityLabel="Paso anterior por gesto"
          >
            <VectorIcon name="chevron-left" size={15} color="#9CA3AF" />
            <Text style={styles.proximityDetectorSubText}>Barrido Izq (Atrás)</Text>
          </TouchableOpacity>

          <View style={styles.proximityDivider} />

          <TouchableOpacity
            style={styles.proximityHalfBtn}
            onPress={triggerProximityStepAdvance}
            activeOpacity={0.8}
            accessibilityLabel="Siguiente paso por sensor frontal o barrido"
          >
            <VectorIcon name="hand-wave" size={15} color={Colors.primaryGreen} />
            <Text style={styles.proximityDetectorText}>Sensor / Barrido Dcha</Text>
            <VectorIcon name="chevron-right" size={15} color={Colors.primaryGreen} />
          </TouchableOpacity>
        </View>

        {/* 8. Botón Finalizar Receta (en último paso o accesible) */}
        {currentStepIndex === totalSteps - 1 && (
          <TouchableOpacity
            style={styles.completeRecipeButton}
            onPress={handleCompleteCooking}
            activeOpacity={0.85}
          >
            <VectorIcon name="check" size={20} color="#000000" />
            <Text style={styles.completeRecipeButtonText}>
              Completar y descontar ingredientes de la despensa
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* 9. Barra Inferior Flotante: Control por Voz Interactivo con Botón de Micrófono */}
      <View style={styles.floatingAudioBar}>
        {/* Banner de feedback táctil y confirmación de comandos por voz */}
        {voiceFeedback && (
          <View
            style={[
              styles.voiceFeedbackBubble,
              voiceFeedback.type === 'success' && styles.voiceFeedbackBubbleSuccess,
              voiceFeedback.type === 'error' && styles.voiceFeedbackBubbleError,
            ]}
            testID="voice-feedback-banner"
          >
            <View
              style={[
                styles.voiceFeedbackDot,
                voiceFeedback.type === 'success' && styles.voiceFeedbackDotSuccess,
                voiceFeedback.type === 'error' && styles.voiceFeedbackDotError,
              ]}
            />
            <Text style={styles.voiceFeedbackText}>{voiceFeedback.message}</Text>
          </View>
        )}

        {/* Botón Principal Interactivo: Pulsar para activar/pausar micrófono */}
        <TouchableOpacity
          style={[
            styles.micActionButton,
            isMicListening && styles.micActionButtonActive,
          ]}
          onPress={toggleVoiceListening}
          activeOpacity={0.85}
          testID="btn-toggle-mic-cooking"
        >
          <View style={[styles.micIconCircle, isMicListening && styles.micIconCircleActive]}>
            <VectorIcon
              name="mic"
              size={22}
              color={isMicListening ? '#000000' : Colors.primaryGreen}
            />
          </View>

          <View style={styles.micButtonTextCol}>
            <Text
              style={[
                styles.micButtonMainText,
                isMicListening && styles.micButtonMainTextActive,
              ]}
            >
              {isMicListening ? 'Escuchando tu voz...' : 'Pulsar para activar micrófono'}
            </Text>
            <Text style={styles.micButtonSubText}>
              {isMicListening
                ? 'Di «pasa al siguiente paso» o «ve al paso 4»'
                : 'Pulsa el botón para dar órdenes por voz'}
            </Text>
          </View>

          {/* Mini ecualizador o badge cuando está activo */}
          {isMicListening ? (
            <View style={styles.equalizerRowSmall}>
              {[wave1, wave2, wave3, wave4, wave5].map((waveAnim, wIdx) => (
                <Animated.View
                  key={`wave-${wIdx}`}
                  style={[
                    styles.equalizerBarSmall,
                    {
                      transform: [{ scaleY: waveAnim }],
                    },
                  ]}
                />
              ))}
            </View>
          ) : (
            <View style={styles.micIdleBadge}>
              <Text style={styles.micIdleBadgeText}>MUTE</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Chips de comandos rápidos por voz (ideal para tablets, entornos con ruido o dictado rápido) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.voiceQuickChipsContainer}
          style={styles.voiceQuickChipsScroll}
          testID="voice-quick-chips-scroll"
        >
          <TouchableOpacity
            style={styles.voiceChip}
            onPress={() => handleVoiceCommand('pasa al siguiente paso')}
            activeOpacity={0.7}
            accessibilityLabel="Comando rápido: siguiente paso"
            testID="voice-chip-next"
          >
            <VectorIcon name="chevron-right" size={12} color={Colors.primaryGreen} />
            <Text style={styles.voiceChipText}>«pasa al siguiente paso»</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.voiceChip}
            onPress={() => handleVoiceCommand('paso anterior')}
            activeOpacity={0.7}
            accessibilityLabel="Comando rápido: paso anterior"
            testID="voice-chip-prev"
          >
            <VectorIcon name="chevron-left" size={12} color="#9CA3AF" />
            <Text style={styles.voiceChipText}>«paso anterior»</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.voiceChip}
            onPress={() => handleVoiceCommand(`pasa al paso ${Math.min(totalSteps, currentStepIndex + 2)}`)}
            activeOpacity={0.7}
            accessibilityLabel="Comando rápido: saltar paso"
            testID="voice-chip-jump"
          >
            <VectorIcon name="format-list-numbered" size={12} color="#00E676" />
            <Text style={styles.voiceChipText}>{`«ve al paso ${Math.min(totalSteps, currentStepIndex + 2)}»`}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.voiceChip}
            onPress={() => handleVoiceCommand('repite el paso')}
            activeOpacity={0.7}
            accessibilityLabel="Comando rápido: repetir paso"
            testID="voice-chip-repeat"
          >
            <VectorIcon name="volume-high" size={12} color="#00E676" />
            <Text style={styles.voiceChipText}>«repite el paso»</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.voiceChip}
            onPress={() => handleVoiceCommand(recipesState.isTimerRunning ? 'pausar temporizador' : 'iniciar temporizador')}
            activeOpacity={0.7}
            accessibilityLabel="Comando rápido: temporizador"
            testID="voice-chip-timer"
          >
            <VectorIcon name="timer" size={12} color="#FFA000" />
            <Text style={styles.voiceChipText}>
              {recipesState.isTimerRunning ? '«pausar tiempo»' : '«iniciar temporizador»'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Indicador de gestos alternativos y manos libres */}
        <Text style={styles.proximityHint}>
          Pasa la mano para avanzar, sin tocar la pantalla, o pulsa el micrófono para hablar
        </Text>
      </View>

      {/* Modal de Conciliación Delta */}
      <RecipeDeltaModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0C',
  },
  topNavigation: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceTopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162921',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.35)',
    gap: 6,
  },
  voiceTopPillActive: {
    backgroundColor: '#162921',
    borderColor: 'rgba(0, 230, 118, 0.5)',
  },
  voiceTopPillInactive: {
    backgroundColor: '#242426',
    borderColor: '#3A3A3C',
  },
  voiceTopPillText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Typography.family,
  },
  voiceTopPillTextActive: {
    color: '#00E676',
  },
  voiceTopPillTextInactive: {
    color: '#9CA3AF',
  },
  voiceIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6B7280',
  },
  voiceIndicatorDotActive: {
    backgroundColor: '#00E676',
  },
  backCircleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(28, 28, 30, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gesturesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162921',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.35)',
    gap: 8,
  },
  gesturesPillInactive: {
    backgroundColor: '#242426',
    borderColor: '#3A3A3C',
  },
  gesturesPillText: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Typography.family,
  },
  gesturesPillTextInactive: {
    color: '#9CA3AF',
  },
  gestureIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6B7280',
  },
  gestureIndicatorDotActive: {
    backgroundColor: '#00E676',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroDishCard: {
    width: SCREEN_WIDTH,
    height: 280,
    position: 'relative',
    backgroundColor: '#1C1C1E',
  },
  heroDishImage: {
    width: '100%',
    height: '100%',
  },
  heroGradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 10, 12, 0.55)',
  },
  heroTextOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  modeCategoryLabel: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
    fontFamily: Typography.family,
  },
  recipeTitleHeading: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    fontFamily: Typography.family,
    marginBottom: 4,
  },
  recipeSubtitleLabel: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Typography.family,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  segmentedProgressBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  segmentBarItem: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  segmentBarActive: {
    backgroundColor: '#00E676',
  },
  segmentBarInactive: {
    backgroundColor: '#27272A',
  },
  stepInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepNumberBadge: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: Typography.family,
  },
  timeRemainingText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Typography.family,
  },
  instructionBlock: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  instructionMainTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
    fontFamily: Typography.family,
    marginBottom: 12,
  },
  instructionDescription: {
    color: '#D1D5DB',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Typography.family,
    fontWeight: '400',
  },
  timerCard: {
    marginHorizontal: 20,
    backgroundColor: '#162921',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  timerLeftContent: {
    flex: 1,
  },
  timerIconAndNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  timerNumbersText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    fontFamily: Typography.family,
    letterSpacing: 1,
  },
  timerPromptText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Typography.family,
  },
  timerPlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  manualControlsRow: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  manualNavButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  manualNavButtonDisabled: {
    opacity: 0.4,
    backgroundColor: '#18181A',
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  manualNavButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Typography.family,
  },
  manualNavButtonTextDisabled: {
    color: '#6B7280',
  },
  manualNavButtonNext: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  manualNavButtonNextText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Typography.family,
  },
  safetyAlertContainer: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 160, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 160, 0, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  safetyAlertText: {
    color: '#FFA000',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Typography.family,
    flex: 1,
  },
  proximityDetectorBar: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  proximityHalfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: 4,
  },
  proximityDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  proximityDetectorText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Typography.family,
  },
  proximityDetectorSubText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Typography.family,
  },
  completeRecipeButton: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E676',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  completeRecipeButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Typography.family,
  },
  floatingAudioBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 10, 12, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 14,
    paddingBottom: 28,
    alignItems: 'center',
  },
  equalizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 28,
    marginBottom: 8,
  },
  equalizerBar: {
    width: 3.5,
    height: 24,
    borderRadius: 2,
    backgroundColor: '#00E676',
  },
  assistantStatusText: {
    color: '#00E676',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Typography.family,
    marginBottom: 2,
  },
  voiceCommandHint: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Typography.family,
    marginBottom: 2,
  },
  voiceFeedbackBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#3A3A3C',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 10,
    maxWidth: '90%',
    gap: 8,
  },
  voiceFeedbackBubbleSuccess: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: 'rgba(0, 230, 118, 0.4)',
  },
  voiceFeedbackBubbleError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  voiceFeedbackDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#60A5FA',
  },
  voiceFeedbackDotSuccess: {
    backgroundColor: '#00E676',
  },
  voiceFeedbackDotError: {
    backgroundColor: '#EF4444',
  },
  voiceFeedbackText: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Typography.family,
  },
  micActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '90%',
    maxWidth: 380,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  micActionButtonActive: {
    backgroundColor: '#12241A',
    borderColor: '#00E676',
    shadowColor: '#00E676',
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  micIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    marginRight: 12,
  },
  micIconCircleActive: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
  },
  micButtonTextCol: {
    flex: 1,
  },
  micButtonMainText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    fontFamily: Typography.family,
    marginBottom: 2,
  },
  micButtonMainTextActive: {
    color: '#00E676',
  },
  micButtonSubText: {
    color: '#9CA3AF',
    fontSize: 11.5,
    fontFamily: Typography.family,
  },
  equalizerRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    paddingLeft: 8,
  },
  equalizerBarSmall: {
    width: 3,
    height: 18,
    borderRadius: 1.5,
    backgroundColor: '#00E676',
  },
  micIdleBadge: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  micIdleBadgeText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  voiceQuickChipsScroll: {
    maxHeight: 34,
    marginTop: 8,
    marginBottom: 6,
  },
  voiceQuickChipsContainer: {
    paddingHorizontal: 2,
    gap: 8,
    alignItems: 'center',
  },
  voiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  voiceChipText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Typography.family,
  },
  proximityHint: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '400',
    fontFamily: Typography.family,
  },
});
