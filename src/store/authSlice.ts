import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { House } from '../types';

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  activeHouse: House;
  availableHouses: House[];
  membersInActiveHouse: Array<{ id: string; name: string; avatar: string }>;
}

const initialHouses: House[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Piso Ciudad Jardín',
    address: 'Calle Gran Vía Parque, Córdoba',
    latitude: 37.8847,
    longitude: -4.7892,
    inviteCode: 'UCO2026',
    memberCount: 3,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    name: 'Casa Moriles',
    address: 'Calle Bodegas, Moriles',
    latitude: 37.4332,
    longitude: -4.6111,
    inviteCode: 'MORILES26',
    memberCount: 2,
  },
];

const initialState: AuthState = {
  token: null,
  isAuthenticated: false,
  userId: 'aleja',
  fullName: 'Alejandro Gallardo',
  email: 'aleja@uco.es',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
  activeHouse: initialHouses[0],
  availableHouses: initialHouses,
  membersInActiveHouse: [
    { id: 'jp', name: 'José Pablo', avatar: 'JP' },
    { id: 'david', name: 'David', avatar: 'D' },
    { id: 'aleja', name: 'Alejandro', avatar: 'A' },
  ],
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        token: string;
        userId: string;
        email: string;
        fullName: string;
        defaultHouseId?: string;
      }>
    ) => {
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.userId = action.payload.userId;
      state.email = action.payload.email;
      state.fullName = action.payload.fullName;
      if (action.payload.defaultHouseId) {
        const found = state.availableHouses.find(
          (h) => h.id === action.payload.defaultHouseId
        );
        if (found) {
          state.activeHouse = found;
        }
      }
    },
    logout: (state) => {
      state.token = null;
      state.isAuthenticated = false;
    },
    updateUserProfile: (
      state,
      action: PayloadAction<{ fullName?: string; email?: string; avatarUrl?: string }>
    ) => {
      if (action.payload.fullName) state.fullName = action.payload.fullName;
      if (action.payload.email) state.email = action.payload.email;
      if (action.payload.avatarUrl) state.avatarUrl = action.payload.avatarUrl;
    },
    setActiveHouse: (state, action: PayloadAction<string>) => {
      const found = state.availableHouses.find((h) => h.id === action.payload);
      if (found) {
        state.activeHouse = found;
      }
    },
    addHouse: (state, action: PayloadAction<House>) => {
      if (!state.availableHouses.some((h) => h.id === action.payload.id)) {
        state.availableHouses.push(action.payload);
      }
      state.activeHouse = action.payload;
    },
    setAvailableHouses: (state, action: PayloadAction<House[]>) => {
      state.availableHouses = action.payload;
      if (!state.availableHouses.some((h) => h.id === state.activeHouse.id) && state.availableHouses.length > 0) {
        state.activeHouse = state.availableHouses[0];
      }
    },
  },
});

export const {
  setCredentials,
  logout,
  updateUserProfile,
  setActiveHouse,
  addHouse,
  setAvailableHouses,
} = authSlice.actions;

export default authSlice.reducer;

