import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { LoginScreen } from '../src/screens/LoginScreen';
import { RegisterScreen } from '../src/screens/RegisterScreen';
import { ProfileScreen } from '../src/screens/ProfileScreen';
import { setCredentials, logout } from '../src/store/authSlice';
import { ApiService } from '../src/services/api';

describe('Auth & Profile Module (Epic Authentication & Identity)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('LoginScreen renders email input, password input and login button', () => {
    const onNavigateToRegister = jest.fn();
    const onLoginSuccess = jest.fn();

    let renderer: any;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <LoginScreen
            onNavigateToRegister={onNavigateToRegister}
            onLoginSuccess={onLoginSuccess}
          />
        </Provider>
      );
    });

    const root = renderer.root;
    const textInputs = root.findAllByType('TextInput');
    expect(textInputs.length).toBeGreaterThanOrEqual(2);

    const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
    expect(texts).toContain('Iniciar Sesión');
    expect(texts).toContain('Entrar a Kitchy');
  });

  test('RegisterScreen renders full name, email, password and confirmation fields', () => {
    const onNavigateToLogin = jest.fn();
    const onRegisterSuccess = jest.fn();

    let renderer: any;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <RegisterScreen
            onNavigateToLogin={onNavigateToLogin}
            onRegisterSuccess={onRegisterSuccess}
          />
        </Provider>
      );
    });

    const root = renderer.root;
    const textInputs = root.findAllByType('TextInput');
    expect(textInputs.length).toBeGreaterThanOrEqual(4);

    const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
    expect(texts).toContain('Crear Cuenta');
    expect(texts).toContain('Crear Mi Cuenta');
  });

  test('ProfileScreen renders user details, action buttons and logout button', () => {
    // Establecer usuario autenticado en Redux
    store.dispatch(
      setCredentials({
        token: 'mock-valid-token',
        userId: 'aleja',
        email: 'aleja@uco.es',
        fullName: 'Alejandro Gallardo',
        defaultHouseId: 'a0000000-0000-0000-0000-000000000001',
      })
    );

    let renderer: any;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <ProfileScreen />
        </Provider>
      );
    });

    const root = renderer.root;
    const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();

    expect(texts).toContain('Mi Perfil');
    expect(texts).toContain('Alejandro Gallardo');
    expect(texts).toContain('aleja@uco.es');
    expect(texts).toContain('Mis Datos');
    expect(texts).toContain('Cambiar Contraseña');
    expect(texts).toContain('Cerrar Sesión');
  });

  test('ApiService login and register generate cryptographic mock responses with valid JWT tokens', async () => {
    const loginResult = await ApiService.login('aleja@uco.es', 'Kitchy2026!');
    expect(loginResult).toBeDefined();
    expect(loginResult.token).toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(loginResult.email).toBe('aleja@uco.es');

    const regResult = await ApiService.register('nuevo@uco.es', 'Password123!', 'Estudiante UCO');
    expect(regResult).toBeDefined();
    expect(regResult.token).toBeDefined();
    expect(regResult.fullName).toBe('Estudiante UCO');
  });
});
