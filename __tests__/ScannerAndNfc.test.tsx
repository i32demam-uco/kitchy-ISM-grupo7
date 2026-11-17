import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { TouchableOpacity } from 'react-native';
import { store } from '../src/store';
import { setCurrentTab } from '../src/store/hardwareSlice';
import { ScannerScreen } from '../src/screens/ScannerScreen';
import { NfcService } from '../src/services/nfcService';
import { useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

describe('ScannerAndNfc (Directiva de Hardware Nativo: Cámara en Vivo + NFC)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.dispatch(setCurrentTab('scan'));
  });

  test('Test 1: Al montar el modo Cámara se solicitan permisos y se activa el stream del dispositivo trasero', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <ScannerScreen />
        </Provider>
      );
    });

    const root = renderer.root;

    // 1. Verifica que useCameraDevice fue invocado solicitando la cámara trasera ('back')
    expect(useCameraDevice).toHaveBeenCalledWith('back');

    // 2. Verifica que se verificaron los permisos de cámara
    expect(useCameraPermission).toHaveBeenCalled();

    // 3. Localiza el componente Camera nativo activo con el sensor trasero
    const cameraComponent = root.findByProps({ testID: 'vision-camera' });
    expect(cameraComponent).toBeDefined();
    expect(cameraComponent.props.isActive).toBe(true);
    expect(cameraComponent.props.device.position).toBe('back');

    await ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });

  test('Test 2 (Crítico): ScannerScreen mantiene visor dual (Cámara/Barcode) sin pestaña NFC y delega NFC al nivel de sistema con redirección a Lista', async () => {
    const cancelTechSpy = jest.spyOn(NfcManager, 'cancelTechnologyRequest');

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <ScannerScreen />
        </Provider>
      );
    });

    const root = renderer.root;

    // 1. Verificar que en ScannerScreen NO existe la píldora NFC (eliminada de la vista de tickets)
    const touchables = root.findAllByType(TouchableOpacity);
    const nfcPill = touchables.find((t: any) => {
      const texts = t.findAllByType('Text').map((node: any) => node.props.children);
      return texts.includes('NFC');
    });
    expect(nfcPill).toBeUndefined();

    // 2. Verificar que sí existen las píldoras de Cámara y Código de Barras
    const cameraPill = touchables.find((t: any) => {
      const texts = t.findAllByType('Text').map((node: any) => node.props.children);
      return texts.includes('Cámara');
    });
    const barcodePill = touchables.find((t: any) => {
      const texts = t.findAllByType('Text').map((node: any) => node.props.children);
      return texts.includes('Código de Barras');
    });
    expect(cameraPill).toBeDefined();
    expect(barcodePill).toBeDefined();

    // 3. Simular el contacto con una etiqueta NFC a nivel de sistema
    await ReactTestRenderer.act(async () => {
      NfcService.simulateTagScan('a0000000-0000-0000-0000-000000000002', (result) => {
        expect(result.tagId).toBeDefined();
        NfcService.handleRedirection(result, store.dispatch, store.getState().auth.availableHouses);
      });
    });

    // 4. Verificar que el navegador cambió inmediatamente el tab activo a 'list' (ShoppingListScreen)
    const currentTab = store.getState().hardware.currentTab;
    expect(currentTab).toBe('list');

    // 5. Verificar que se disparó el foco en el input "Añadir producto a la lista..."
    const focusTrigger = store.getState().hardware.focusShoppingInputTrigger;
    expect(focusTrigger).toBeGreaterThan(0);

    // 6. Verificar que se libera la tecnología NFC mediante NfcService.stopTagDiscovery()
    await ReactTestRenderer.act(async () => {
      renderer.unmount();
      await NfcService.stopTagDiscovery();
    });
    expect(cancelTechSpy).toHaveBeenCalled();
  });
});

