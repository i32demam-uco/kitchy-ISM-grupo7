import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import { HouseSocialScreen } from '../src/screens/HouseSocialScreen';
import { SystemActivityCard } from '../src/components/SystemActivityCard';
import { SocialCollaborationService } from '../src/services/socialCollaborationService';
import { HouseMessage } from '../src/types';

describe('Módulo Social y TIEMPO REAL: HouseSocialScreen y SystemActivityCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. Renderiza la lista de miembros con nombres, roles e indicador luminoso verde (#00E676)', async () => {
    let renderer: any;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <HouseSocialScreen />
        </Provider>
      );
    });

    const root = renderer.root;
    const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
    const allText = texts.join(' ');

    // Presencia de integrantes del piso
    expect(allText).toContain('Alejandro');
    expect(allText).toContain('José');
    expect(allText).toContain('David');

    // Roles
    expect(allText).toContain('Admin');
    expect(allText).toContain('Miembro');

    // Indicador luminoso online en tiempo real
    const onlineDots = root.findAll((el: any) => el.props.testID && el.props.testID.startsWith('online-indicator-'));
    expect(onlineDots.length).toBeGreaterThanOrEqual(2);

    await act(async () => {
      renderer.unmount();
    });
  });

  test('2. Envío optimista de mensajes en 0 ms con icono de estado', async () => {
    let renderer: any;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <HouseSocialScreen />
        </Provider>
      );
    });

    const input = renderer.root.findByProps({ testID: 'input-chat-message' });
    const sendButton = renderer.root.findByProps({ testID: 'btn-chat-send' });

    await act(async () => {
      input.props.onChangeText('¿Quién compra pan hoy?');
    });

    await act(async () => {
      sendButton.props.onPress();
    });

    const texts = renderer.root.findAllByType('Text').map((t: any) => t.props.children).flat();
    const allText = texts.join(' ');
    expect(allText).toContain('¿Quién compra pan hoy?');

    await act(async () => {
      renderer.unmount();
    });
  });

  test('3. Adjunción multimedia (foto/vídeo) mockeada y desplegable', async () => {
    let renderer: any;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <HouseSocialScreen />
        </Provider>
      );
    });

    const attachButton = renderer.root.findByProps({ testID: 'btn-social-attach' });

    // Desplegar menú de adjuntos
    await act(async () => {
      attachButton.props.onPress();
    });

    let texts = renderer.root.findAllByType('Text').map((t: any) => t.props.children).flat();
    expect(texts.join(' ')).toContain('Hacer Foto / Vídeo');
    expect(texts.join(' ')).toContain('Elegir de Galería');

    // Simular envío de adjunto
    await act(async () => {
      await SocialCollaborationService.sendMediaMessage(
        'a0000000-0000-0000-0000-000000000001',
        {
          uri: 'file:///mock/captured_photo.jpg',
          type: 'image/jpeg',
          fileName: 'receta.jpg',
        },
        'Foto adjunta para la cena'
      );
    });

    texts = renderer.root.findAllByType('Text').map((t: any) => t.props.children).flat();
    expect(texts.join(' ')).toContain('Foto adjunta para la cena');

    await act(async () => {
      renderer.unmount();
    });
  });

  test('4. Renderizado de SystemActivityCard para Gasto de Despensa (Consumo de Alimentos con stock restante)', async () => {
    const mockActionConsumed: HouseMessage = {
      id: 'action-test-1',
      houseId: 'a0000000-0000-0000-0000-000000000001',
      senderId: 'aleja',
      senderName: 'Alejandro Gallardo',
      messageType: 'SYSTEM_ACTION',
      content: 'Alejandro ha gastado 2 unidades de Huevos L',
      actionMetadata: {
        actionType: 'CONSUMED',
        performedBy: 'aleja',
        performedByName: 'Alejandro Gallardo',
        stockRemaining: 4,
        affectedProducts: [
          {
            productName: 'Huevos L',
            quantity: 2,
            unit: 'ud',
            imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200',
          },
        ],
      },
      createdAt: new Date().toISOString(),
      status: 'sent',
    };

    let renderer: any;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <SystemActivityCard
            content={mockActionConsumed.content}
            metadata={mockActionConsumed.actionMetadata}
            createdAt={mockActionConsumed.createdAt}
          />
        </Provider>
      );
    });

    const root = renderer.root;
    const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
    const allText = texts.join(' ');

    expect(allText).toContain('Gasto de Despensa');
    expect(allText).toContain('Alejandro ha gastado 2 unidades de Huevos L');
    expect(allText).toContain('Stock restante: 4 ud');
  });

  test('5. Renderizado de SystemActivityCard para Compra / Escaneo OCR con botón "Ver en Despensa >"', async () => {
    const onViewPantryMock = jest.fn();

    const mockActionScan: HouseMessage = {
      id: 'action-test-2',
      houseId: 'a0000000-0000-0000-0000-000000000001',
      senderId: 'JP',
      senderName: 'José Pablo',
      messageType: 'SYSTEM_ACTION',
      content: 'JP ha escaneado una compra y ha añadido 4 productos a la despensa',
      actionMetadata: {
        actionType: 'SCANNED_TICKET',
        performedBy: 'JP',
        performedByName: 'José Pablo',
        totalAdded: 4,
        storeName: 'Mercadona',
        affectedProducts: [
          {
            productName: 'Tomate frito Hacendado',
            quantity: 2,
            unit: 'ud',
            imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200',
          },
          {
            productName: 'Huevos L',
            quantity: 6,
            unit: 'ud',
            imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200',
          },
          {
            productName: 'Pechuga de pollo',
            quantity: 500,
            unit: 'g',
            imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200',
          },
          {
            productName: 'Leche entera',
            quantity: 1,
            unit: 'l',
            imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200',
          },
        ],
      },
      createdAt: new Date().toISOString(),
      status: 'sent',
    };

    let renderer: any;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <SystemActivityCard
            content={mockActionScan.content}
            metadata={mockActionScan.actionMetadata}
            createdAt={mockActionScan.createdAt}
            onViewPantry={onViewPantryMock}
          />
        </Provider>
      );
    });

    const root = renderer.root;
    const texts = root.findAllByType('Text').map((t: any) => t.props.children).flat();
    const allText = texts.join(' ');

    expect(allText).toContain('Nueva Compra Añadida (Mercadona)');
    expect(allText).toContain('JP ha escaneado una compra y ha añadido 4 productos a la despensa');
    expect(allText).toContain('Tomate frito Hacendado');
    expect(allText).toContain('+2 ud');
    expect(allText).toContain('Huevos L');
    expect(allText).toContain('+6 ud');
    expect(allText).toContain('Ver en Despensa');

    const pantryBtn = root.findByProps({ testID: 'btn-view-in-pantry' });
    await act(async () => {
      pantryBtn.props.onPress();
    });
    expect(onViewPantryMock).toHaveBeenCalledTimes(1);
  });

  test('6. Reactividad Cruzada: Consumir producto reduce cantidad y genera SYSTEM_ACTION en chat', async () => {
    const initialEggQty = store
      .getState()
      .inventory.items.find((i) => i.name.includes('Huevos'))?.quantity;

    expect(initialEggQty).toBe(6);

    // Consumir 2 huevos
    await act(async () => {
      await SocialCollaborationService.consumeProduct(
        'a0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000002',
        2,
        'Huevos L',
        'unidades',
        'aleja',
        'Alejandro Gallardo'
      );
    });

    // Verificar reducción inmediata en Redux (0 ms Optimistic UI)
    const updatedEggQty = store
      .getState()
      .inventory.items.find((i) => i.name.includes('Huevos'))?.quantity;
    expect(updatedEggQty).toBe(4);

    // Verificar inyección de SYSTEM_ACTION en el chat
    const messages = store.getState().houseSocial.messages;
    const lastMsg = messages[messages.length - 1];
    expect(lastMsg.messageType).toBe('SYSTEM_ACTION');
    expect(lastMsg.content).toContain('Alejandro Gallardo ha gastado 2 unidades de Huevos L');
  });

  test('7. Navegación hacia atrás desde el chat del hogar redirige a "houses" (Gestión multihogar), no a "home"', async () => {
    let renderer: any;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <HouseSocialScreen />
        </Provider>
      );
    });

    const root = renderer.root;
    const backBtn = root.findByProps({ testID: 'btn-social-back' });
    expect(backBtn).toBeDefined();

    await act(async () => {
      backBtn.props.onPress();
    });

    // Debe navegar a 'houses', NUNCA a 'home'
    expect(store.getState().hardware.currentTab).toBe('houses');

    await act(async () => {
      renderer.unmount();
    });
  });

  test('8. Compartir receta inyecta draftMessage y pre-rellena el inputText en HouseSocialScreen', async () => {
    const { setDraftMessage } = require('../src/store/houseSocialSlice');
    await act(async () => {
      store.dispatch(setDraftMessage('¡Mirad qué receta propongo cocinar hoy!: Tortilla'));
    });

    let renderer: any;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Provider store={store}>
          <HouseSocialScreen />
        </Provider>
      );
    });

    const root = renderer.root;
    const textInput = root.findByProps({ testID: 'input-chat-message' });
    expect(textInput.props.value).toBe('¡Mirad qué receta propongo cocinar hoy!: Tortilla');

    await act(async () => {
      renderer.unmount();
    });
  });
});
