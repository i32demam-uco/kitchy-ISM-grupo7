import React, { useEffect, useState, useRef } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store, useAppDispatch, useAppSelector } from './src/store';
import { setInventory } from './src/store/inventorySlice';
import { setCurrentTab } from './src/store/hardwareSlice';
import { RootTab } from './src/types';
import { Colors } from './src/theme';
import { BottomNavigation } from './src/components/BottomNavigation';
import { SplashScreen } from './src/components/SplashScreen';
import { CustomAlertModal } from './src/components/CustomAlertModal';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { TicketScannerScreen } from './src/screens/TicketScannerScreen';
import { CookingModeScreen } from './src/screens/CookingModeScreen';
import { ShoppingListScreen } from './src/screens/ShoppingListScreen';
import { HousesScreen } from './src/screens/HousesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { FullPantryScreen } from './src/screens/FullPantryScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { NfcGeofenceModal } from './src/components/NfcGeofenceModal';

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
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  const { width: screenWidth } = useWindowDimensions();
  const pagerRef = useRef<any>(null);
  const isProgrammaticScroll = useRef(false);

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

  // Sincronizar el scroll del pager horizontal al pulsar una pestaña en la barra inferior
  useEffect(() => {
    const tabIndex = MAIN_TABS.indexOf(currentTab);
    if (tabIndex !== -1 && pagerRef.current) {
      isProgrammaticScroll.current = true;
      pagerRef.current.scrollTo({ x: tabIndex * screenWidth, animated: true });
      const timer = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [currentTab, screenWidth]);

  // Manejar el cambio de pestaña cuando el usuario arrastra la pantalla horizontalmente
  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isProgrammaticScroll.current) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / screenWidth);
    const targetTab = MAIN_TABS[pageIndex];
    if (targetTab && targetTab !== currentTab) {
      dispatch(setCurrentTab(targetTab));
    }
  };

  const isSubScreen =
    currentTab === 'scan' || currentTab === 'profile' || currentTab === 'pantry';

  const renderSubScreen = () => {
    switch (currentTab) {
      case 'scan':
        return <TicketScannerScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'pantry':
        return <FullPantryScreen />;
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
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
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

            {/* Barra de Navegación Inferior (Isla Flotante con Dynamic Island Bubble) */}
            <BottomNavigation />

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