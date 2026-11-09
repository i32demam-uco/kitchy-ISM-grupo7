import React, { useEffect, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store, useAppDispatch, useAppSelector } from './src/store';
import { setInventory } from './src/store/inventorySlice';
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
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { NfcGeofenceModal } from './src/components/NfcGeofenceModal';

/**
 * MainNavigator - Orquestador Principal de Navegación y Estado de Kitchy.
 * 
 * Principios Arquitectónicos Aplicados:
 * 1. Skill Realtime & Offline-First: Carga inmediata e hidratación reactiva del inventario
 *    desde AsyncStorage antes de requerir sincronización de red con PostgreSQL / Supabase.
 * 2. Skill UI/UX Pixel-Perfect & Fricción Cero:
 *    - Si existe un token JWT válido, el SplashScreen transiciona directamente al Dashboard.
 *    - Si no existe sesión activa, presenta LoginScreen con fotorrealismo de cocina oscura y Glassmorphism.
 * 3. Skill Ciberseguridad & QA:
 *    - Cierre de sesión seguro con destrucción de token JWT local.
 *    - Cero emojis y soporte de gestión de perfil de usuario.
 */
const MainNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentTab = useAppSelector((state) => state.hardware.currentTab);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

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

  /**
   * Selector declarativo de pantallas según la pestaña activa del store global.
   */
  const renderCurrentScreen = () => {
    switch (currentTab) {
      case 'home':
        return <DashboardScreen />;
      case 'scan':
        return <TicketScannerScreen />;
      case 'cook':
        return <CookingModeScreen />;
      case 'list':
        return <ShoppingListScreen />;
      case 'houses':
        return <HousesScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Flujo Condicional de Autenticación */}
        {isAuthenticated ? (
          <>
            {/* Contenedor de la Pantalla Activa de la App */}
            <View style={styles.content}>{renderCurrentScreen()}</View>

            {/* Barra de Navegación Inferior (Isla Flotante - Ley de Fitts) */}
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