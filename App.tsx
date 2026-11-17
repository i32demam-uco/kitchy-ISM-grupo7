import React, { useEffect, useState, useRef } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  BackHandler,
  Linking,
  Vibration,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store, useAppDispatch, useAppSelector } from './src/store';
import { setInventory } from './src/store/inventorySlice';
import { setCurrentTab, setPendingNfcRedirect } from './src/store/hardwareSlice';
import { RootTab } from './src/types';
import { Colors } from './src/theme';
import { BottomNavigation } from './src/components/BottomNavigation';
import { SplashScreen } from './src/components/SplashScreen';
import { CustomAlertModal } from './src/components/CustomAlertModal';
import { KitchyAlert } from './src/services/kitchyAlert';
import { ApiService } from './src/services/api';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { TicketScannerScreen } from './src/screens/TicketScannerScreen';
import { CookingModeScreen } from './src/screens/CookingModeScreen';
import { ShoppingListScreen } from './src/screens/ShoppingListScreen';
import { HousesScreen } from './src/screens/HousesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { FullPantryScreen } from './src/screens/FullPantryScreen';
import { HouseSocialScreen } from './src/screens/HouseSocialScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { NfcGeofenceModal } from './src/components/NfcGeofenceModal';
import { NfcService, parseNfcTag } from './src/services/nfcService';

const MAIN_TABS: RootTab[] = ['home', 'list', 'cook', 'houses'];

/**
 * MainNavigator - Orquestador Principal de Navegación y Estado de Kitchy.
 * 
 * Principios Arquitectónicos Aplicados:
 * 1. Skill UI/UX Architect: Navegación horizontal fluida por gestos (Swipe Navigation)
 *    entre las 4 pestañas maestras (Inicio, Lista, Cocinar, Hogares) a 60 FPS sin memory leaks.
 * 2. Dinámica iOS Dynamic Island: Sincronización bidireccional entre el deslizador de páginas
 *    y la burbuja flotante elástica de BottomNavigation.
 * 3. Categorización de Despensa: Navegación a FullPantryScreen con taxonomía estructurada.
 * 4. Skill Realtime & Offline-First: Hidratación inmediata desde AsyncStorage.
 */
const MainNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentTab = useAppSelector((state) => state.hardware.currentTab);
  const isPagerScrollEnabled = useAppSelector(
    (state) => state.hardware.isPagerScrollEnabled ?? true
  );
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const availableHouses = useAppSelector((state) => state.auth.availableHouses);

  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  const { width: screenWidth } = useWindowDimensions();
  const pagerRef = useRef<any>(null);
  const isProgrammaticScroll = useRef(false);
  const isUserDragging = useRef(false);

  // Escucha de Deep Linking y Lectura NDEF Nativa (Banda/Pulsera NFC)
  useEffect(() => {
    // 1. Detección en Cold Start (Arranque en frío con app cerrada)
    const checkColdStartNfcAndDeepLinks = async () => {
      try {
        let detected: any = null;

        const initialTag = await NfcService.getInitialTag();
        if (initialTag) {
          detected = initialTag;
        } else {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl && initialUrl.toLowerCase().startsWith('kitchy://')) {
            detected = parseNfcTag(initialUrl);
          }
        }

        if (detected) {
          const session = await ApiService.getStoredSession();
          if (session && session.token) {
            // Usuario con sesión activa: saltar directamente a ShoppingListScreen
            NfcService.handleRedirection(detected, dispatch, availableHouses);
          } else {
            // Usuario con sesión cerrada: registrar como pendiente para redirigir tras el login
            dispatch(setPendingNfcRedirect(detected));
            await NfcService.setPendingRedirect(detected);
            try {
              Vibration.vibrate([0, 70, 50, 70]);
            } catch {}
          }
        }
      } catch {
        // Silenciar en entornos sin chip NFC
      }
    };

    checkColdStartNfcAndDeepLinks();

    // 2. Escucha activa en Foreground y Background
    const cleanupNfc = NfcService.setupForegroundListener(async (parsed) => {
      const session = await ApiService.getStoredSession();
      if (session && session.token) {
        NfcService.handleRedirection(parsed, dispatch, availableHouses);
      } else {
        dispatch(setPendingNfcRedirect(parsed));
        await NfcService.setPendingRedirect(parsed);
        try {
          Vibration.vibrate([0, 70, 50, 70]);
        } catch {}
      }
    });

    return () => {
      cleanupNfc();
    };
  }, [dispatch, availableHouses]);

  // Hidratación Offline-First desde Caché Local (RNF3)
  useEffect(() => {
    const hydrateLocalCache = async () => {
      try {
        const cachedInventory = await AsyncStorage.getItem('@kitchy_inventory_cache');
        if (cachedInventory) {
          const parsed = JSON.parse(cachedInventory);
          if (Array.isArray(parsed) && parsed.length > 0) {
            dispatch(setInventory(parsed));
          }
        }
      } catch {
        // En caso de fallo o primera ejecución, se mantiene el estado inicial pre-cargado
      }
    };

    hydrateLocalCache();
  }, [dispatch]);

  // Al autenticarse, purgar cualquier pestaña anterior y fijar 'home' salvo si ya se redirigió a 'list'
  useEffect(() => {
    if (isAuthenticated) {
      if (currentTab !== 'list') {
        dispatch(setCurrentTab('home'));
      }
    }
  }, [isAuthenticated, dispatch]);

  // Sincronizar el scroll del pager horizontal al pulsar una pestaña en la barra inferior
  useEffect(() => {
    const tabIndex = MAIN_TABS.indexOf(currentTab);
    if (tabIndex !== -1 && pagerRef.current && screenWidth > 0) {
      isProgrammaticScroll.current = true;
      pagerRef.current.scrollTo({ x: tabIndex * screenWidth, animated: true });
      const timer = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [currentTab, screenWidth]);

  // Manejar el cambio de pestaña ÚNICAMENTE cuando el usuario arrastra la pantalla físicamente con el dedo
  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isUserDragging.current || isProgrammaticScroll.current) return;
    isUserDragging.current = false;
    const offsetX = e.nativeEvent.contentOffset.x;
    if (!screenWidth || screenWidth <= 0) return;
    const pageIndex = Math.round(offsetX / screenWidth);
    const targetTab = MAIN_TABS[pageIndex];
    if (targetTab && targetTab !== currentTab) {
      dispatch(setCurrentTab(targetTab));
    }
  };

  const isSubScreen =
    currentTab === 'scan' ||
    currentTab === 'profile' ||
    currentTab === 'pantry' ||
    currentTab === 'social';

  // Intercepción del Botón 'Atrás' Físico / Gestos de Android (BackHandler)
  useEffect(() => {
    const onBackPress = () => {
      if (!isAuthenticated) return false;

      // 1. Si está en el chat social del hogar, volver a gestión multihogar (Hogares)
      if (currentTab === 'social') {
        dispatch(setCurrentTab('houses'));
        return true;
      }

      // 1b. Si está en otra subpantalla (Perfil, Despensa completa, Escáner), volver a Inicio
      if (isSubScreen) {
        dispatch(setCurrentTab('home'));
        return true;
      }

      // 2. Si está en otra pestaña de la barra principal (Lista, Cocinar, Hogares), volver a Inicio
      if (currentTab !== 'home') {
        dispatch(setCurrentTab('home'));
        return true;
      }

      // 3. Si ya está en la pantalla principal (Dashboard / Inicio), confirmar salida con estética Kitchy
      KitchyAlert.show(
        '¿Salir de Kitchy?',
        '¿Estás seguro de que quieres salir de la aplicación?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Salir',
            style: 'destructive',
            onPress: () => BackHandler.exitApp(),
          },
        ]
      );
      return true;
    };

    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );
    return () => backSubscription.remove();
  }, [isAuthenticated, isSubScreen, currentTab, dispatch]);

  const renderSubScreen = () => {
    switch (currentTab) {
      case 'scan':
        return <TicketScannerScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'pantry':
        return <FullPantryScreen />;
      case 'social':
        return <HouseSocialScreen />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Flujo Condicional de Autenticación */}
        {isAuthenticated ? (
          <>
            {/* Contenedor Principal: Pager Deslizable o Subpantalla */}
            {isSubScreen ? (
              <View style={styles.content}>{renderSubScreen()}</View>
            ) : (
              <ScrollView
                ref={pagerRef}
                horizontal
                pagingEnabled
                scrollEnabled={isPagerScrollEnabled}
                nestedScrollEnabled={true}
                directionalLockEnabled={true}
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                contentOffset={{
                  x:
                    (MAIN_TABS.indexOf(currentTab) >= 0
                      ? MAIN_TABS.indexOf(currentTab)
                      : 0) * screenWidth,
                  y: 0,
                }}
                onScrollBeginDrag={() => {
                  isUserDragging.current = true;
                  isProgrammaticScroll.current = false;
                }}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                style={styles.content}
              >
                <View style={{ width: screenWidth, flex: 1 }}>
                  <DashboardScreen />
                </View>
                <View style={{ width: screenWidth, flex: 1 }}>
                  <ShoppingListScreen />
                </View>
                <View style={{ width: screenWidth, flex: 1 }}>
                  <CookingModeScreen />
                </View>
                <View style={{ width: screenWidth, flex: 1 }}>
                  <HousesScreen />
                </View>
              </ScrollView>
            )}

            {/* Barra de Navegación Inferior (Isla Flotante con Dynamic Island Bubble) - Solo en pestañas principales */}
            {!isSubScreen && <BottomNavigation />}

            {/* Modal de Simulación de Sensores NFC y Geovalla de Supermercado (100m) */}
            <NfcGeofenceModal />
          </>
        ) : (
          /* Pantallas de Autenticación Premium: Login / Registro con Fondo Cocina Oscura */
          authView === 'login' ? (
            <LoginScreen
              onNavigateToRegister={() => setAuthView('register')}
              onLoginSuccess={() => {}}
            />
          ) : (
            <RegisterScreen
              onNavigateToLogin={() => setAuthView('login')}
              onRegisterSuccess={() => setAuthView('login')}
            />
          )
        )}

        {/* Modal Global de Avisos Premium Dark Mode (Sustituye Alert.alert) */}
        <CustomAlertModal />
      </SafeAreaView>

      {/* Pantalla Splash con Autenticación Silenciosa y Fade-Out Fluido (Edge-to-Edge) */}
      {isSplashVisible && (
        <SplashScreen
          onFinish={(authenticated) => {
            setIsSplashVisible(false);
          }}
        />
      )}
    </View>
  );
};

/**
 * Punto de entrada raíz de la aplicación móvil Kitchy.
 * Configura los Providers de estado global (Redux Toolkit) y márgenes seguros (Safe Area).
 */
export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <MainNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
});