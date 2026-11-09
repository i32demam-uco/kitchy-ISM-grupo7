import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { CookingModeScreen } from '../src/screens/CookingModeScreen';

describe('CookingModeScreen (Figma Screen 3 Hands-free Mode)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('renders recipe steps, timer, safety tip and voice recognition wave', async () => {
    let renderer: any;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <CookingModeScreen />
        </Provider>
      );
    });

    const root = renderer.root;
    const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
    const normalizedText = texts.join(' ').replace(/\s+/g, ' ');

    // Recipe header
    expect(normalizedText).toContain('MODO COCINA • MANOS LIBRES');
    expect(normalizedText).toContain('Pollo con tomate y huevo');
    expect(normalizedText).toContain('2 personas • Con lo que tienes en casa');

    // Step instruction
    expect(normalizedText).toContain('Añade el tomate y baja el fuego');
    expect(normalizedText).toContain('08:00');

    // Safety tip & voice
    expect(normalizedText).toContain('El pollo debe alcanzar 74 °C en el centro.');
    expect(normalizedText).toContain('Te escucho, Alejandro');

    // Clean up
    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });
});
