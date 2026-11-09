import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../src/store';
import { SplashScreen } from '../src/components/SplashScreen';

describe('SplashScreen - Silent Authentication & Brand Experience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('renders official brand logo image (logo_splash.png)', async () => {
    const onFinish = jest.fn();
    let renderer: any;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <SplashScreen onFinish={onFinish} />
        </Provider>
      );
    });

    const root = renderer.root;
    const images = root.findAllByType('Image');
    expect(images.length).toBeGreaterThan(0);
  });

  test('checks AsyncStorage for session and calls onFinish with auth status', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGVqYSIsImV4cCI6MTk4NzIxOTIwMH0.valid'
    );
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        token: 'valid',
        userId: 'aleja',
        email: 'aleja@uco.es',
        fullName: 'Alejandro Gallardo',
      })
    );

    const onFinish = jest.fn();

    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(
        <Provider store={store}>
          <SplashScreen onFinish={onFinish} />
        </Provider>
      );
    });

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@kitchy_jwt_token');

    // Advance timers through entrance delay and exit transition
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(onFinish).toHaveBeenCalledWith(true);
  });

  test('navigates to login flow when no stored session exists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const onFinish = jest.fn();

    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(
        <Provider store={store}>
          <SplashScreen onFinish={onFinish} />
        </Provider>
      );
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(onFinish).toHaveBeenCalledWith(false);
  });
});
