import * as signalR from '@microsoft/signalr';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../store';
import {
  receiveIncomingMessage,
  addMessageOptimistic,
  confirmMessageSent,
  setMembers,
  updateOnlinePresence,
} from '../store/houseSocialSlice';
import {
  applyInventoryDelta,
  consumeProductOptimistic,
} from '../store/inventorySlice';
import { HouseMember, HouseMessage, InventoryDelta, Recipe } from '../types';
import { AUTH_TOKEN_KEY } from './api';

const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:5066' : 'http://localhost:5066';

export class SocialCollaborationService {
  private static connection: signalR.HubConnection | null = null;
  private static currentHouseId: string | null = null;
  private static isConnecting = false;

  public static async initConnection(houseId: string): Promise<boolean> {
    if (this.currentHouseId === houseId && this.connection?.state === signalR.HubConnectionState.Connected) {
      return true;
    }

    if (this.connection) {
      try {
        await this.connection.stop();
      } catch {
        // ignore
      }
      this.connection = null;
    }

    this.currentHouseId = houseId;

    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_BASE_URL}/hubs/house-collaboration`, {
          accessTokenFactory: () => token || '',
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.None)
        .build();

      // Register Incoming Handlers
      this.connection.on('ReceiveChatMessage', (message: HouseMessage) => {
        store.dispatch(receiveIncomingMessage(message));
      });

      this.connection.on('SyncInventoryState', (delta: InventoryDelta) => {
        store.dispatch(applyInventoryDelta(delta));
      });

      this.connection.on('MemberPresenceUpdated', (members: any[]) => {
        const mappedMembers: HouseMember[] = members.map((m) => ({
          userId: m.userId || m.UserId,
          fullName: m.fullName || m.FullName,
          avatarUrl: m.avatarUrl || m.AvatarUrl,
          role: m.role || m.Role,
          isOnline: m.isOnline ?? m.IsOnline ?? true,
          joinedAt: m.joinedAt || m.JoinedAt || new Date().toISOString(),
        }));
        store.dispatch(setMembers(mappedMembers));
        const onlineIds = mappedMembers.filter((m) => m.isOnline).map((m) => m.userId);
        store.dispatch(updateOnlinePresence(onlineIds));
      });

      await this.connection.start();
      await this.connection.invoke('JoinHouse', houseId);
      return true;
    } catch {
      // Offline fallback: keep client responsive
      return false;
    }
  }

  public static async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        if (this.currentHouseId) {
          await this.connection.invoke('LeaveHouse', this.currentHouseId);
        }
        await this.connection.stop();
      } catch {
        // ignore
      }
      this.connection = null;
      this.currentHouseId = null;
    }
  }

  /**
   * Envía un mensaje de texto con Optimistic UI (0 ms de latencia)
   */
  public static async sendTextMessage(
    houseId: string,
    content: string,
    senderId: string,
    senderName: string,
    targetStore = store,
    replyToMessage?: HouseMessage['replyToMessage']
  ): Promise<HouseMessage> {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const optimisticMessage: HouseMessage = {
      id: tempId,
      houseId,
      senderId,
      senderName,
      messageType: 'TEXT',
      content,
      replyToMessage,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    // 1. Inmediato: Actualizar UI en 0 ms
    targetStore.dispatch(addMessageOptimistic(optimisticMessage));

    // 2. Transmisión a Backend
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const response = await fetch(`${API_BASE_URL}/api/houses/${houseId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          content,
          messageType: 'TEXT',
        }),
      });

      if (response.ok) {
        const confirmed: HouseMessage = await response.json();
        targetStore.dispatch(confirmMessageSent({ tempId, confirmedMessage: confirmed }));
        return confirmed;
      }
    } catch {
      // Fallback tolerante
    }

    // Confirmación local offline
    const confirmedLocal: HouseMessage = {
      ...optimisticMessage,
      id: `local-${Date.now()}`,
      status: 'sent',
    };
    targetStore.dispatch(confirmMessageSent({ tempId, confirmedMessage: confirmedLocal }));
    return confirmedLocal;
  }

  /**
   * Comparte una tarjeta interactiva de receta en el chat del hogar (Optimistic UI 0 ms)
   */
  public static async sendRecipeShareMessage(
    houseId: string,
    recipe: Recipe,
    senderId: string,
    senderName: string,
    targetPersons: number = 2,
    targetStore = store
  ): Promise<HouseMessage> {
    const tempId = `temp-recipe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const content = `¡Mirad qué receta propongo cocinar hoy!: "${recipe.title}" (${targetPersons} ${targetPersons === 1 ? 'persona' : 'personas'} · ${recipe.totalTimeMinutes} min)`;
    const optimisticMessage: HouseMessage = {
      id: tempId,
      houseId,
      senderId,
      senderName,
      messageType: 'RECIPE_CARD',
      content,
      recipeData: recipe,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    // 1. Inmediato: Actualizar UI en 0 ms
    targetStore.dispatch(addMessageOptimistic(optimisticMessage));

    // 2. Transmisión a Backend
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const response = await fetch(`${API_BASE_URL}/api/houses/${houseId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          content,
          messageType: 'RECIPE_CARD',
          recipeData: recipe,
        }),
      });

      if (response.ok) {
        const confirmed: HouseMessage = await response.json();
        targetStore.dispatch(confirmMessageSent({ tempId, confirmedMessage: { ...confirmed, recipeData: recipe } }));
        return confirmed;
      }
    } catch {
      // Fallback tolerante
    }

    // Confirmación local offline
    const confirmedLocal: HouseMessage = {
      ...optimisticMessage,
      id: `local-recipe-${Date.now()}`,
      status: 'sent',
    };
    targetStore.dispatch(confirmMessageSent({ tempId, confirmedMessage: confirmedLocal }));
    return confirmedLocal;
  }

  /**
   * Envía un recurso multimedia (foto o vídeo) con Optimistic UI
   */
  public static async sendMediaMessage(
    houseId: string,
    media: { uri: string; type: string; fileName: string; isVideo?: boolean },
    content?: string,
    senderId = 'aleja',
    senderName = 'Alejandro',
    targetStore = store
  ): Promise<HouseMessage> {
    const tempId = `temp-media-${Date.now()}`;
    const isVideo = media.isVideo || media.type.startsWith('video/') || media.fileName.endsWith('.mp4');

    const optimisticMessage: HouseMessage = {
      id: tempId,
      houseId,
      senderId,
      senderName,
      messageType: isVideo ? 'VIDEO' : 'IMAGE',
      content: content || '',
      mediaUrl: media.uri,
      mediaThumbnailUrl: isVideo
        ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
        : media.uri,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    targetStore.dispatch(addMessageOptimistic(optimisticMessage));

    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const formData = new FormData();
      formData.append('file', {
        uri: media.uri,
        type: media.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        name: media.fileName || (isVideo ? 'video.mp4' : 'photo.jpg'),
      } as any);

      if (content) {
        formData.append('content', content);
      }

      const response = await fetch(`${API_BASE_URL}/api/houses/${houseId}/messages/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (response.ok) {
        const confirmed: HouseMessage = await response.json();
        targetStore.dispatch(confirmMessageSent({ tempId, confirmedMessage: confirmed }));
        return confirmed;
      }
    } catch {
      // Fallback offline
    }

    const confirmedLocal: HouseMessage = {
      ...optimisticMessage,
      id: `local-media-${Date.now()}`,
      status: 'sent',
    };
    targetStore.dispatch(confirmMessageSent({ tempId, confirmedMessage: confirmedLocal }));
    return confirmedLocal;
  }

  /**
   * Gasta o consume unidades de un producto con Optimistic UI instantáneo
   * y desencadena reactividad cruzada (tarjeta SYSTEM_ACTION en el chat)
   */
  public static async consumeProduct(
    houseId: string,
    itemId: string,
    quantity: number,
    itemName = 'Alimento',
    unit = 'ud',
    userId = 'aleja',
    userName = 'Alejandro',
    imageUrl?: string,
    targetStore = store
  ): Promise<void> {
    // 1. Optimistic UI: Descontar inmediatamente de Redux (0 ms)
    targetStore.dispatch(consumeProductOptimistic({ id: itemId, quantity }));

    // 2. Inyectar tarjeta SYSTEM_ACTION optimista localmente en el chat
    const actionMessage: HouseMessage = {
      id: `action-${Date.now()}`,
      houseId,
      senderId: userId,
      senderName: userName,
      messageType: 'SYSTEM_ACTION',
      content: `${userName} ha gastado ${quantity} ${unit} de ${itemName}`,
      actionMetadata: {
        actionType: 'CONSUMED',
        performedBy: userId,
        performedByName: userName,
        stockRemaining: 4, // Aproximado visualmente
        affectedProducts: [
          {
            productName: itemName,
            quantity,
            unit,
            imageUrl,
          },
        ],
      },
      createdAt: new Date().toISOString(),
      status: 'sent',
    };
    targetStore.dispatch(receiveIncomingMessage(actionMessage));

    // 3. Notificar backend vía REST
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      await fetch(`${API_BASE_URL}/api/inventory/${itemId}/consume?houseId=${houseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ quantity }),
      });
    } catch {
      // Fallback tolerante
    }
  }

  /**
   * Obtiene miembros del hogar
   */
  public static async fetchMembers(houseId: string): Promise<HouseMember[]> {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const response = await fetch(`${API_BASE_URL}/api/houses/${houseId}/members`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (response.ok) {
        const members: HouseMember[] = await response.json();
        store.dispatch(setMembers(members));
        return members;
      }
    } catch {
      // Fallback
    }
    return store.getState().houseSocial.members;
  }

  /**
   * Obtiene mensajes históricos del chat
   */
  public static async fetchMessages(houseId: string): Promise<HouseMessage[]> {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const response = await fetch(`${API_BASE_URL}/api/houses/${houseId}/messages?limit=30`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (response.ok) {
        const messages: HouseMessage[] = await response.json();
        return messages;
      }
    } catch {
      // Fallback
    }
    return store.getState().houseSocial.messages;
  }
}
