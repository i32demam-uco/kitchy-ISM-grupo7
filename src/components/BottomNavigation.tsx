import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { Colors, Typography } from '../theme';
import { RootTab } from '../types';
import { useAppDispatch, useAppSelector } from '../store';
import { setCurrentTab, setVoiceListening } from '../store/hardwareSlice';

const BUBBLE_WIDTH = 58;

/**
 * BottomNavigation - Isla Flotante con Animación de Burbuja iOS Dynamic Island.
 * 
 * Principios Arquitectónicos:
 * 1. UI/UX Architect: Isla flotante (#1C1C1E) despegada de bordes con borderRadius: 30 y borde glassmorphism.
 * 2. Burbuja Líquida Estilo iOS: Indicador animado mediante físicas elásticas (Spring Physics)
 *    que se desplaza fluidamente hacia la pestaña activa con efecto 'squash & stretch'.
 * 3. FAB Central Elevado: Botón de escáner en posición absoluta sobresaliendo 28px con sombra esmeralda.
 */
export const BottomNavigation: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentTab = useAppSelector((state) => state.hardware.currentTab);
  const shoppingItemsCount = useAppSelector(
    (state) => state.shoppingList.items.filter((i) => !i.isChecked).length
  );

  // Almacena las coordenadas X y anchos medidos de cada botón de pestaña
  const [tabPositions, setTabPositions] = useState<{
    [key: string]: { x: number; width: number };
  }>({});

  // Físicas elásticas de la burbuja (Spring Animation 60 FPS)
  const bubbleAnimX = useRef(new Animated.Value(8)).current;
  const bubbleScaleX = useRef(new Animated.Value(1)).current;
  const bubbleScaleY = useRef(new Animated.Value(1)).current;
  const bubbleOpacity = useRef(new Animated.Value(1)).current;

  // Registrar la posición en pantalla de cada pestaña
  const handleTabLayout = (tab: RootTab, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabPositions((prev) => ({
      ...prev,
      [tab]: { x, width },
    }));
  };

  // Transición elástica de la burbuja cuando cambia la pestaña activa
  useEffect(() => {
    const activeLayout = tabPositions[currentTab];
    if (activeLayout) {
      const targetX = activeLayout.x + (activeLayout.width - BUBBLE_WIDTH) / 2;

      Animated.parallel([
        // 1. Desplazamiento horizontal elástico (físicas iOS Dynamic Island)
        Animated.spring(bubbleAnimX, {
          toValue: targetX,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        // 2. Squash & Stretch líquido horizontal
        Animated.sequence([
          Animated.timing(bubbleScaleX, {
            toValue: 1.22,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(bubbleScaleX, {
            toValue: 1,
            friction: 4,
            tension: 80,
            useNativeDriver: true,
          }),
        ]),
        // 3. Squash & Stretch líquido vertical
        Animated.sequence([
          Animated.timing(bubbleScaleY, {
            toValue: 0.88,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(bubbleScaleY, {
            toValue: 1,
            friction: 4,
            tension: 80,
            useNativeDriver: true,
          }),
        ]),
        // 4. Opacidad visible
        Animated.timing(bubbleOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Si la pestaña actual es una subpantalla (ej. 'scan', 'profile', 'pantry'), desvanecer suavemente
      Animated.timing(bubbleOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [currentTab, tabPositions, bubbleAnimX, bubbleScaleX, bubbleScaleY, bubbleOpacity]);

  const handleTabPress = (tab: RootTab) => {
    dispatch(setCurrentTab(tab));
  };

  /**
   * Dispara el modo de voz al mantener pulsado el botón central (Hold-to-Talk).
   */
  const handleScanLongPress = () => {
    dispatch(setVoiceListening(true));
    dispatch(setCurrentTab('cook'));
  };

  return (
    <View style={styles.floatingWrapper} pointerEvents="box-none">
      {/* 1. Cuerpo de la Isla Flotante (Píldora Flotante #1C1C1E) */}
      <View style={styles.islandBar}>
        {/* Burbuja Flotante Elástica (Dynamic Island Effect) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeBubble,
            {
              opacity: bubbleOpacity,
              transform: [
                { translateX: bubbleAnimX },
                { scaleX: bubbleScaleX },
                { scaleY: bubbleScaleY },
              ],
            },
          ]}
        />

        {/* Pestaña: Inicio */}
        <TouchableOpacity
          style={styles.tabButton}
          onLayout={(e) => handleTabLayout('home', e)}
          onPress={() => handleTabPress('home')}
          activeOpacity={0.7}
        >
          <Text style={[styles.iconText, currentTab === 'home' && styles.iconActive]}>
            ⌂
          </Text>
          <Text style={[styles.tabLabel, currentTab === 'home' && styles.labelActive]}>
            Inicio
          </Text>
        </TouchableOpacity>

        {/* Pestaña: Lista de la compra con Badge de pendientes */}
        <TouchableOpacity
          style={styles.tabButton}
          onLayout={(e) => handleTabLayout('list', e)}
          onPress={() => handleTabPress('list')}
          activeOpacity={0.7}
        >
          <View>
            <Text style={[styles.iconText, currentTab === 'list' && styles.iconActive]}>
              ≡
            </Text>
            {shoppingItemsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{shoppingItemsCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, currentTab === 'list' && styles.labelActive]}>
            Lista
          </Text>
        </TouchableOpacity>

        {/* Espacio reservado para el FAB sobreelevado */}
        <View style={styles.fabSpacer} />

        {/* Pestaña: Cocinar (Modo Cocina / Recetas Delta) */}
        <TouchableOpacity
          style={styles.tabButton}
          onLayout={(e) => handleTabLayout('cook', e)}
          onPress={() => handleTabPress('cook')}
          activeOpacity={0.7}
        >
          <Text style={[styles.iconText, currentTab === 'cook' && styles.iconActive]}>
            ♨
          </Text>
          <Text style={[styles.tabLabel, currentTab === 'cook' && styles.labelActive]}>
            Cocinar
          </Text>
        </TouchableOpacity>

        {/* Pestaña: Hogares (Arquitectura Multihogar) */}
        <TouchableOpacity
          style={styles.tabButton}
          onLayout={(e) => handleTabLayout('houses', e)}
          onPress={() => handleTabPress('houses')}
          activeOpacity={0.7}
        >
          <Text style={[styles.iconText, currentTab === 'houses' && styles.iconActive]}>
            ⊞
          </Text>
          <Text style={[styles.tabLabel, currentTab === 'houses' && styles.labelActive]}>
            Hogares
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Botón Central FAB - Posición Absoluta Físicamente Elevada */}
      <View style={styles.fabWrapper} pointerEvents="box-none">
        <TouchableOpacity
          style={[
            styles.giantFab,
            currentTab === 'scan' && styles.giantFabActive,
          ]}
          onPress={() => handleTabPress('scan')}
          onLongPress={handleScanLongPress}
          delayLongPress={400}
          activeOpacity={0.85}
        >
          {/* Retículo láser de escáner OCR */}
          <View style={styles.scannerIconInner}>
            <View style={styles.scannerCornerTL} />
            <View style={styles.scannerCornerBR} />
            <View style={styles.scannerLaserLine} />
          </View>
          <Text style={styles.fabTitle}>ESCANEAR</Text>
        </TouchableOpacity>
        <Text style={styles.fabSubLabel}>Mantén para hablar</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 26 : 20,
    width: '90%',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  islandBar: {
    width: '100%',
    height: 64,
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 30,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    position: 'relative',
  },
  activeBubble: {
    position: 'absolute',
    top: 9,
    left: 0,
    width: BUBBLE_WIDTH,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0, 230, 118, 0.16)',
    borderWidth: 1.2,
    borderColor: 'rgba(0, 230, 118, 0.45)',
    shadowColor: Colors.primaryGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 4,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    zIndex: 2,
  },
  iconText: {
    fontSize: 21,
    color: '#8E8E93',
    marginBottom: 2,
  },
  iconActive: {
    color: Colors.primaryGreen,
  },
  tabLabel: {
    fontSize: 10,
    color: '#8E8E93',
    fontFamily: Typography.bodyMedium,
    fontWeight: '500',
  },
  labelActive: {
    color: '#FFFFFF',
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: Colors.primaryGreen,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#000000',
    fontSize: 9,
    fontFamily: Typography.bodySemiBold,
    fontWeight: 'bold',
  },
  fabSpacer: {
    width: 68,
  },
  fabWrapper: {
    position: 'absolute',
    top: -28, // Sobresale 28px por encima de la isla flotante
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  giantFab: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.65,
    shadowRadius: 16,
    elevation: 12,
  },
  giantFabActive: {
    backgroundColor: '#00FF85',
    transform: [{ scale: 1.05 }],
  },
  scannerIconInner: {
    width: 24,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scannerCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 7,
    height: 7,
    borderTopWidth: 2.2,
    borderLeftWidth: 2.2,
    borderColor: '#000000',
  },
  scannerCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 7,
    height: 7,
    borderBottomWidth: 2.2,
    borderRightWidth: 2.2,
    borderColor: '#000000',
  },
  scannerLaserLine: {
    width: 20,
    height: 1.8,
    backgroundColor: '#000000',
    borderRadius: 1,
  },
  fabTitle: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginTop: 2,
    fontFamily: Typography.bodySemiBold,
  },
  fabSubLabel: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '500',
    marginTop: 5,
  },
});
