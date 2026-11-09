import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Colors, Typography } from '../theme';
import { RootTab } from '../types';
import { useAppDispatch, useAppSelector } from '../store';
import { setCurrentTab, setVoiceListening } from '../store/hardwareSlice';

/**
 * BottomNavigation - Isla Flotante Ergonómica (Ley de Fitts).
 * 
 * Corrección de Scrum Master:
 * - position: 'absolute', bottom: 22, width: '90%', alignSelf: 'center', borderRadius: 30.
 * - Fondo marengo profundo (#1C1C1E) con borde sutil glassmorphism (0.08).
 * - Botón central FAB posicionado de forma absoluta con top: -28 respecto a la isla,
 *   sobresaliendo físicamente por encima y proyectando sombra verde intensa (#00E676).
 * - Espaciador central fabSpacer para evitar solapamientos con las pestañas laterales.
 */
export const BottomNavigation: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentTab = useAppSelector((state) => state.hardware.currentTab);
  const shoppingItemsCount = useAppSelector(
    (state) => state.shoppingList.items.filter((i) => !i.isChecked).length
  );

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
        {/* Pestaña: Inicio */}
        <TouchableOpacity
          style={styles.tabButton}
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
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
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
    fontWeight: '600',
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
    width: 18,
    height: 2,
    backgroundColor: '#000000',
  },
  fabTitle: {
    fontSize: 8.5,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '800',
    color: '#000000',
    marginTop: 3,
    letterSpacing: 0.6,
  },
  fabSubLabel: {
    fontSize: 9.5,
    color: '#9CA3AF',
    fontFamily: Typography.body,
    marginTop: 4,
  },
});
