import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { ProfileScreen } from '../src/screens/ProfileScreen';
import { CustomAlertModal } from '../src/components/CustomAlertModal';
import { KitchyAlert } from '../src/services/kitchyAlert';
import { setCredentials } from '../src/store/authSlice';
import { ApiService } from '../src/services/api';

describe('Logout & Popup Nomenclature Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    KitchyAlert.hide();
    ReactTestRenderer.act(() => {
      store.dispatch(
        setCredentials({
          token: 'mock-token-xyz',
          userId: 'aleja',
          email: 'aleja@uco.es',
          fullName: 'Alejandro Gallardo',
          defaultHouseId: 'a0000000-0000-0000-0000-000000000001',
        })
      );
    });
  });

  afterEach(() => {
    ReactTestRenderer.act(() => {
      KitchyAlert.hide();
      jest.runAllTimers();
    });
    jest.useRealTimers();
  });

  test('Logout button triggers KitchyAlert with standard friendly copy without JWT or token references', async () => {
    const alertSpy = jest.spyOn(KitchyAlert, 'show');

    let renderer: any;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <ProfileScreen />
          <CustomAlertModal />
        </Provider>
      );
    });

    const root = renderer.root;
    const logoutBtn = root.findByProps({ testID: 'btn-profile-logout' });
    expect(logoutBtn).toBeDefined();

    // Trigger logout press
    await ReactTestRenderer.act(async () => {
      logoutBtn.props.onPress();
    });

    // Check KitchyAlert.show was called
    expect(alertSpy).toHaveBeenCalled();
    const [title, message, buttons] = alertSpy.mock.calls[0];

    expect(title).toBe('¿Cerrar sesión?');
    expect(message).toBe('¿Estás seguro de que quieres cerrar sesión?');

    // Ensure strictly no mention of JWT or token or BCrypt
    expect(message!.toLowerCase()).not.toContain('jwt');
    expect(message!.toLowerCase()).not.toContain('token');
    expect(message!.toLowerCase()).not.toContain('bcrypt');

    // Check buttons
    expect(buttons).toBeDefined();
    expect(buttons!).toHaveLength(2);
    expect(buttons![0].text).toBe('Cancelar');
    expect(buttons![1].text).toBe('Cerrar sesión');
    expect(buttons![1].style).toBe('destructive');

    alertSpy.mockRestore();
  });

  test('CustomAlertModal renders logout alert dialog with logout icon, title, message and buttons', async () => {
    let renderer: any;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <CustomAlertModal />
        </Provider>
      );
    });

    // Fire alert
    ReactTestRenderer.act(() => {
      KitchyAlert.show(
        '¿Cerrar sesión?',
        '¿Estás seguro de que quieres cerrar sesión?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar sesión', style: 'destructive', onPress: jest.fn() },
        ]
      );
    });

    const root = renderer.root;
    const titleEl = root.findByProps({ testID: 'custom-alert-title' });
    const msgEl = root.findByProps({ testID: 'custom-alert-message' });
    const cancelBtn = root.findByProps({ testID: 'custom-alert-btn-cancelar' });
    const confirmBtn = root.findByProps({ testID: 'custom-alert-btn-cerrar-sesi-n' });

    expect(titleEl.props.children).toBe('¿Cerrar sesión?');
    expect(msgEl.props.children).toBe('¿Estás seguro de que quieres cerrar sesión?');
    expect(cancelBtn).toBeDefined();
    expect(confirmBtn).toBeDefined();
  });

  test('Clicking confirm button in CustomAlertModal triggers logout and cleans session', async () => {
    const apiLogoutSpy = jest.spyOn(ApiService, 'logout').mockResolvedValue(undefined as any);

    let renderer: any;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <ProfileScreen />
          <CustomAlertModal />
        </Provider>
      );
    });

    const root = renderer.root;
    const logoutBtn = root.findByProps({ testID: 'btn-profile-logout' });

    await ReactTestRenderer.act(async () => {
      logoutBtn.props.onPress();
    });

    const confirmBtn = root.findByProps({ testID: 'custom-alert-btn-cerrar-sesi-n' });
    await ReactTestRenderer.act(async () => {
      confirmBtn.props.onPress();
    });

    expect(apiLogoutSpy).toHaveBeenCalled();
    expect(store.getState().auth.token).toBeNull();
    expect(store.getState().auth.isAuthenticated).toBe(false);

    apiLogoutSpy.mockRestore();
  });

  test('Exit App dialog displays CustomAlertModal with logout icon, "¿Salir de Kitchy?" and "Salir" button', async () => {
    let renderer: any;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <CustomAlertModal />
        </Provider>
      );
    });

    // Simulate BackHandler triggering KitchyAlert
    const exitAppSpy = jest.fn();
    ReactTestRenderer.act(() => {
      KitchyAlert.show(
        '¿Salir de Kitchy?',
        '¿Estás seguro de que quieres salir de la aplicación?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salir', style: 'destructive', onPress: exitAppSpy },
        ]
      );
    });

    const root = renderer.root;
    const titleEl = root.findByProps({ testID: 'custom-alert-title' });
    const msgEl = root.findByProps({ testID: 'custom-alert-message' });
    const cancelBtn = root.findByProps({ testID: 'custom-alert-btn-cancelar' });
    const salirBtn = root.findByProps({ testID: 'custom-alert-btn-salir' });

    expect(titleEl.props.children).toBe('¿Salir de Kitchy?');
    expect(msgEl.props.children).toBe('¿Estás seguro de que quieres salir de la aplicación?');
    expect(cancelBtn).toBeDefined();
    expect(salirBtn).toBeDefined();

    // Clicking "Salir" triggers the exit function
    await ReactTestRenderer.act(async () => {
      salirBtn.props.onPress();
    });

    expect(exitAppSpy).toHaveBeenCalled();
  });
});
