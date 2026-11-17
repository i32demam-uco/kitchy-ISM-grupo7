import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { HouseMember, HouseMessage } from '../types';

export interface HouseSocialState {
  messages: HouseMessage[];
  members: HouseMember[];
  onlineUserIds: string[];
  activeHouseId: string;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastReadTimestamps: Record<string, string>;
  draftMessage: string;
}

const DEFAULT_MEMBERS: HouseMember[] = [
  {
    userId: 'aleja',
    fullName: 'Alejandro Gallardo',
    email: 'alejandro.gallardo@uco.es',
    role: 'Admin del Hogar',
    isOnline: true,
    joinedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    birthDate: '15/04/2001',
    bio: 'Cocinando rico todos los días y organizando la despensa.',
  },
  {
    userId: 'JP',
    fullName: 'José Pablo',
    email: 'jose.pablo@uco.es',
    role: 'Miembro del Hogar',
    isOnline: true,
    joinedAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    birthDate: '22/09/2000',
    bio: 'Especialista en carnes y compras exprés en Mercadona.',
  },
  {
    userId: 'David',
    fullName: 'David',
    email: 'david@uco.es',
    role: 'Miembro del Hogar',
    isOnline: true,
    joinedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    birthDate: '08/11/2002',
    bio: 'Control de caducidades y batch cooking los domingos.',
  },
];

const INITIAL_MESSAGES: HouseMessage[] = [
  {
    id: 'msg-seed-1',
    houseId: 'a0000000-0000-0000-0000-000000000001',
    senderId: 'JP',
    senderName: 'José Pablo',
    messageType: 'TEXT',
    content: '¡Hola chavales! He organizado la despensa y añadido la compra semanal.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    status: 'sent',
  },
  {
    id: 'msg-seed-2',
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
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    status: 'sent',
  },
  {
    id: 'msg-seed-3',
    houseId: 'a0000000-0000-0000-0000-000000000001',
    senderId: 'David',
    senderName: 'David',
    messageType: 'TEXT',
    content: '¿Alguien va a cenar en casa? La pechuga de pollo caduca hoy.',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: 'sent',
  },
];

const initialState: HouseSocialState = {
  messages: INITIAL_MESSAGES,
  members: DEFAULT_MEMBERS,
  onlineUserIds: ['aleja', 'JP', 'David'],
  activeHouseId: 'a0000000-0000-0000-0000-000000000001',
  isLoading: false,
  isSyncing: false,
  error: null,
  lastReadTimestamps: {},
  draftMessage: '',
};

export const houseSocialSlice = createSlice({
  name: 'houseSocial',
  initialState,
  reducers: {
    setDraftMessage: (state, action: PayloadAction<string>) => {
      state.draftMessage = action.payload;
    },
    markHouseAsRead: (state, action: PayloadAction<string>) => {
      state.lastReadTimestamps[action.payload] = new Date().toISOString();
    },
    setActiveHouseId: (state, action: PayloadAction<string>) => {
      state.activeHouseId = action.payload;
    },
    setMessages: (state, action: PayloadAction<HouseMessage[]>) => {
      state.messages = action.payload;
    },
    addMessageOptimistic: (state, action: PayloadAction<HouseMessage>) => {
      // Optimistic addition (RNF3: 0 ms delay)
      state.messages.push(action.payload);
    },
    confirmMessageSent: (
      state,
      action: PayloadAction<{ tempId: string; confirmedMessage: HouseMessage }>
    ) => {
      const index = state.messages.findIndex((m) => m.id === action.payload.tempId);
      if (index !== -1) {
        state.messages[index] = {
          ...action.payload.confirmedMessage,
          status: 'sent',
        };
      } else {
        state.messages.push({
          ...action.payload.confirmedMessage,
          status: 'sent',
        });
      }
    },
    receiveIncomingMessage: (state, action: PayloadAction<HouseMessage>) => {
      // Avoid duplicate messages if already present
      const exists = state.messages.some((m) => m.id === action.payload.id);
      if (!exists) {
        state.messages.push({
          ...action.payload,
          status: 'sent',
        });
      }
    },
    setMembers: (state, action: PayloadAction<HouseMember[]>) => {
      state.members = action.payload;
    },
    updateOnlinePresence: (state, action: PayloadAction<string[]>) => {
      state.onlineUserIds = action.payload;
      state.members.forEach((member) => {
        member.isOnline = action.payload.includes(member.userId);
      });
    },
    setMemberPresence: (
      state,
      action: PayloadAction<{ userId: string; isOnline: boolean }[]>
    ) => {
      action.payload.forEach((update) => {
        const member = state.members.find((m) => m.userId === update.userId);
        if (member) {
          member.isOnline = update.isOnline;
        }
      });
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload;
    },
    clearSocialState: (state) => {
      state.messages = [];
      state.members = [];
      state.onlineUserIds = [];
    },
  },
});

export const {
  setDraftMessage,
  markHouseAsRead,
  setActiveHouseId,
  setMessages,
  addMessageOptimistic,
  confirmMessageSent,
  receiveIncomingMessage,
  setMembers,
  updateOnlinePresence,
  setMemberPresence,
  setLoading,
  setSyncing,
  clearSocialState,
} = houseSocialSlice.actions;

export default houseSocialSlice.reducer;

