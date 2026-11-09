import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
} from 'react-native';
import { Colors } from '../theme';
import { useAppDispatch, useAppSelector } from '../store';
import {
  nextStep,
  prevStep,
  toggleTimer,
  decrementTimer,
  resetTimer,
  setDeltaModalVisible,
} from '../store/recipesSlice';
import { setCurrentTab, toggleProximity } from '../store/hardwareSlice';
import { RecipeDeltaModal } from '../components/RecipeDeltaModal';
import { VectorIcon } from '../components/VectorIcon';
import { KitchyAlert } from '../services/kitchyAlert';

export const CookingModeScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const recipesState = useAppSelector((state) => state.recipes);
  const hardwareState = useAppSelector((state) => state.hardware);
  const auth = useAppSelector((state) => state.auth);

  const activeRecipe = recipesState.activeRecipe;
  const currentStep = activeRecipe.steps[recipesState.currentStepIndex] || activeRecipe.steps[0];
  const totalSteps = activeRecipe.steps.length;

  // Waveform animated bars
  const wave1 = useRef(new Animated.Value(0.4)).current;
  const wave2 = useRef(new Animated.Value(0.7)).current;
  const wave3 = useRef(new Animated.Value(0.3)).current;
  const wave4 = useRef(new Animated.Value(0.9)).current;
  const wave5 = useRef(new Animated.Value(0.5)).current;

  // Timer countdown effect
  useEffect(() => {
    let interval: any = null;
    if (recipesState.isTimerRunning && recipesState.timerSecondsRemaining > 0) {
      interval = setInterval(() => {
        dispatch(decrementTimer());
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recipesState.isTimerRunning, recipesState.timerSecondsRemaining, dispatch]);

  // Audio waveform animation loop
  useEffect(() => {
    const createWaveLoop = (anim: Animated.Value, minVal: number, maxVal: number, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: maxVal,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: minVal,
            duration,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createWaveLoop(wave1, 0.2, 1.0, 350);
    const anim2 = createWaveLoop(wave2, 0.3, 0.9, 450);
    const anim3 = createWaveLoop(wave3, 0.1, 0.8, 280);
    const anim4 = createWaveLoop(wave4, 0.4, 1.0, 500);
    const anim5 = createWaveLoop(wave5, 0.2, 0.7, 390);

    anim1.start();
    anim2.start();
    anim3.start();
    anim4.start();
    anim5.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      anim4.stop();
      anim5.stop();
    };
  }, [wave1, wave2, wave3, wave4, wave5]);

  // Proximity Hand Sweep Gesture (RF14, CU-03)
  const handleProximitySweepSimulation = () => {
    if (recipesState.currentStepIndex < totalSteps - 1) {
      dispatch(nextStep());
      KitchyAlert.show(
        'Gesto detectado (Sensor Proximidad)',
        `Has avanzado al Paso ${recipesState.currentStepIndex + 2} sin tocar la pantalla con las manos sucias.`
      );
    } else {
      KitchyAlert.show(
        'Receta completada',
        '¡Buen provecho! Has completado todos los pasos de la receta.'
      );
    }
  };

  const handleVoiceCommandSimulation = (command: 'siguiente' | 'repetir') => {
    if (command === 'siguiente') {
      if (recipesState.currentStepIndex < totalSteps - 1) {
        dispatch(nextStep());
      }
    } else {
      dispatch(resetTimer());
    }
  };

  // Format MM:SS
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Superior */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => dispatch(setCurrentTab('home'))}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        {/* Gestos Activos Chip con Vector Icon (image_2aaa36.png) */}
        <TouchableOpacity
          style={styles.gesturesChip}
          onPress={() => dispatch(toggleProximity())}
        >
          <VectorIcon name="hand-wave" size={13} color={hardwareState.isProximityActive ? Colors.primaryGreen : '#9CA3AF'} />
          <Text style={styles.gesturesText}>
            {hardwareState.isProximityActive ? 'Gestos activos' : 'Gestos pausados'}
          </Text>
          <View
            style={[
              styles.gestureDot,
              hardwareState.isProximityActive && styles.gestureDotActive,
            ]}
          />
        </TouchableOpacity>

        {/* Delta Button */}
        <TouchableOpacity
          style={styles.deltaButton}
          onPress={() => dispatch(setDeltaModalVisible(true))}
        >
          <Text style={styles.deltaButtonText}>Δ Faltantes</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Hero Header Fotorrealista: Sartén en Alta Resolución con Overlay Gradual */}
        <View style={styles.recipeHeroWrapper}>
          <Image
            source={{
              uri:
                activeRecipe.imageUrl ||
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
            }}
            style={styles.heroRecipePhoto}
            resizeMode="cover"
          />
          <View style={styles.heroDarkOverlay} />

          <View style={styles.heroContentInside}>
            <Text style={styles.modeSubtitle}>MODO COCINA • MANOS LIBRES</Text>
            <Text style={styles.recipeTitle}>{activeRecipe.title}</Text>
            <Text style={styles.recipeMeta}>{activeRecipe.description}</Text>

            {/* Barras de Progreso Segmentadas (image_2aaa36.png) */}
            <View style={styles.segmentedProgressRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.segmentBar,
                    s <= currentStep.step
                      ? styles.segmentBarActive
                      : styles.segmentBarInactive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.progressInfoRow}>
              <Text style={styles.stepBadgeText}>
                PASO {currentStep.step} DE {totalSteps}
              </Text>
              <Text style={styles.timeRemaining}>Quedan aprox 12 min</Text>
            </View>
          </View>
        </View>

        {/* 3. Instrucción Gigante a Media Distancia */}
        <View style={styles.stepInstructionCard}>
          <Text style={styles.stepBigTitle}>{currentStep.title}</Text>
          <Text style={styles.stepBigDescription}>{currentStep.text}</Text>
        </View>

        {/* 4. Temporizador Integrado con Vector Icon */}
        <View style={styles.timerContainer}>
          <View style={styles.timerLeft}>
            <View style={styles.timerIconRow}>
              <VectorIcon name="timer" size={22} color={Colors.primaryGreen} />
              <Text style={styles.timerClock}>
                {formatTimer(recipesState.timerSecondsRemaining)}
              </Text>
            </View>
            <Text style={styles.timerLabel}>Di «iniciar temporizador»</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.timerPlayButton,
              recipesState.isTimerRunning && styles.timerPauseButton,
            ]}
            onPress={() => dispatch(toggleTimer())}
            activeOpacity={0.8}
          >
            <Text style={styles.timerPlayIcon}>
              {recipesState.isTimerRunning ? '⏸' : '▶'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 5. Alerta de Seguridad Alimentaria con Vector Termómetro (Cero Emojis) */}
        {currentStep.tip && (
          <View style={styles.safetyCard}>
            <VectorIcon name="thermometer" size={16} color="#F59E0B" />
            <Text style={styles.safetyText}>{currentStep.tip}</Text>
          </View>
        )}

        {/* 6. Onda de Reconocimiento de Voz y Gestos (RF14, RF15) */}
        <View style={styles.handsFreeContainer}>
          {/* Visualizador de Onda de Audio Animada */}
          <View style={styles.waveformRow}>
            <Animated.View style={[styles.waveBar, { transform: [{ scaleY: wave1 }] }]} />
            <Animated.View style={[styles.waveBar, { transform: [{ scaleY: wave2 }] }]} />
            <Animated.View style={[styles.waveBar, { transform: [{ scaleY: wave3 }] }]} />
            <Animated.View style={[styles.waveBar, { transform: [{ scaleY: wave4 }] }]} />
            <Animated.View style={[styles.waveBar, { transform: [{ scaleY: wave5 }] }]} />
            <Animated.View style={[styles.waveBar, { transform: [{ scaleY: wave2 }] }]} />
            <Animated.View style={[styles.waveBar, { transform: [{ scaleY: wave4 }] }]} />
          </View>

          <Text style={styles.voicePromptTitle}>
            • Te escucho, {auth.fullName}
          </Text>
          <Text style={styles.voicePromptSub}>
            Di «siguiente» o «repite el paso»
          </Text>
          <Text style={styles.gesturePrompt}>
            Pasa la mano por la cámara para avanzar sin tocar la pantalla
          </Text>

          {/* Controles de Simulación de Sensores para Pruebas en Vivo */}
          <View style={styles.sensorControlsRow}>
            <TouchableOpacity
              style={styles.sensorTestBtn}
              onPress={handleProximitySweepSimulation}
            >
              <Text style={styles.sensorTestBtnText}>Gesto de Proximidad</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sensorTestBtn}
              onPress={() => handleVoiceCommandSimulation('siguiente')}
            >
              <Text style={styles.sensorTestBtnText}>Voz: «Siguiente»</Text>
            </TouchableOpacity>
          </View>

          {/* Navegación manual de reserva */}
          <View style={styles.manualStepNav}>
            <TouchableOpacity
              onPress={() => dispatch(prevStep())}
              disabled={recipesState.currentStepIndex === 0}
              style={[
                styles.navBtn,
                recipesState.currentStepIndex === 0 && styles.navBtnDisabled,
              ]}
            >
              <Text style={styles.navBtnText}>← Paso anterior</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => dispatch(nextStep())}
              disabled={recipesState.currentStepIndex >= totalSteps - 1}
              style={[
                styles.navBtn,
                recipesState.currentStepIndex >= totalSteps - 1 && styles.navBtnDisabled,
              ]}
            >
              <Text style={styles.navBtnText}>Paso siguiente →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal del Algoritmo Delta de Ingredientes Faltantes */}
      <RecipeDeltaModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D10',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1C1C22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  gesturesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  gestureDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#6B7280',
    marginRight: 6,
  },
  gestureDotActive: {
    backgroundColor: Colors.primaryGreen,
  },
  gesturesText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
  },
  deltaButton: {
    backgroundColor: '#1E1E26',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  deltaButtonText: {
    color: Colors.primaryGreen,
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingBottom: 95,
  },
  recipeHeroWrapper: {
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 6,
    marginBottom: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroRecipePhoto: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroDarkOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(14, 15, 18, 0.72)',
  },
  heroContentInside: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 18,
  },
  modeSubtitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.primaryGreen,
    letterSpacing: 1.4,
  },
  recipeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  recipeMeta: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 2,
  },
  segmentedProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 6,
  },
  segmentBar: {
    flex: 1,
    height: 3.5,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  segmentBarActive: {
    backgroundColor: Colors.primaryGreen,
  },
  segmentBarInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepBadgeText: {
    color: Colors.primaryGreen,
    fontSize: 11,
    fontWeight: '800',
  },
  timeRemaining: {
    fontSize: 11.5,
    color: '#9CA3AF',
  },
  stepInstructionCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 6,
  },
  stepBigTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 32,
  },
  stepBigDescription: {
    fontSize: 15.5,
    color: '#D1D5DB',
    lineHeight: 23,
    marginTop: 12,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: 22,
    padding: 18,
    marginTop: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  timerLeft: {
    flex: 1,
  },
  timerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerClock: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 8,
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 3,
  },
  timerPlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primaryGreen,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  timerPauseButton: {
    backgroundColor: '#F59E0B',
  },
  timerPlayIcon: {
    fontSize: 18,
    color: '#000000',
  },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#261912',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  safetyEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  safetyText: {
    color: '#FCD34D',
    fontSize: 12.5,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  handsFreeContainer: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: '#131317',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    marginBottom: 10,
  },
  waveBar: {
    width: 4,
    height: 28,
    backgroundColor: Colors.primaryGreen,
    borderRadius: 2,
    marginHorizontal: 3,
  },
  voicePromptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  voicePromptSub: {
    fontSize: 12,
    color: Colors.primaryGreen,
    marginTop: 2,
    fontWeight: '500',
  },
  gesturePrompt: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 6,
    textAlign: 'center',
  },
  sensorControlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  sensorTestBtn: {
    backgroundColor: '#22222A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sensorTestBtnText: {
    color: '#E5E7EB',
    fontSize: 11.5,
    fontWeight: '600',
  },
  manualStepNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  navBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1A1A22',
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
  },
});

