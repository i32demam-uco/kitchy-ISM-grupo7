import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootTab } from '../types';

interface HardwareState {
  currentTab: RootTab;
  isPagerScrollEnabled: boolean;
  isProximityActive: boolean;
  isVoiceListening: boolean;
  voiceStatusText: string;
  isNfcModalVisible: boolean;
  isGeofenceAlertVisible: boolean;
  geofenceSupermarketName: string;
  focusShoppingInputTrigger: number;
  pendingNfcRedirect: any | null;
}

const initialState: HardwareState = {
  currentTab: 'home',
  isPagerScrollEnabled: true,
  isProximityActive: true,
  isVoiceListening: false,
  voiceStatusText: 'Te escucho, Alejandro. Di «siguiente» o «repite el paso»',
  isNfcModalVisible: false,
  isGeofenceAlertVisible: false,
  geofenceSupermarketName: 'Mercadona Gran Vía Parque (a 80 m)',
  focusShoppingInputTrigger: 0,
  pendingNfcRedirect: null,
};

export const hardwareSlice = createSlice({
  name: 'hardware',
  initialState,
  reducers: {
    setCurrentTab: (state, action: PayloadAction<RootTab>) => {
      state.currentTab = action.payload;
    },
    triggerFocusShoppingInput: (state) => {
      state.focusShoppingInputTrigger += 1;
    },
    setPendingNfcRedirect: (state, action: PayloadAction<any | null>) => {
      state.pendingNfcRedirect = action.payload;
    },
    toggleProximity: (state) => {
      state.isProximityActive = !state.isProximityActive;
    },
    setVoiceListening: (state, action: PayloadAction<boolean>) => {
      state.isVoiceListening = action.payload;
    },
    setVoiceStatusText: (state, action: PayloadAction<string>) => {
      state.voiceStatusText = action.payload;
    },
    setNfcModalVisible: (state, action: PayloadAction<boolean>) => {
      state.isNfcModalVisible = action.payload;
    },
    setGeofenceAlertVisible: (state, action: PayloadAction<boolean>) => {
      state.isGeofenceAlertVisible = action.payload;
    },
    setPagerScrollEnabled: (state, action: PayloadAction<boolean>) => {
      state.isPagerScrollEnabled = action.payload;
    },
  },
});

export const {
  setCurrentTab,
  triggerFocusShoppingInput,
  setPendingNfcRedirect,
  toggleProximity,
  setVoiceListening,
  setVoiceStatusText,
  setNfcModalVisible,
  setGeofenceAlertVisible,
  setPagerScrollEnabled,
} = hardwareSlice.actions;

export default hardwareSlice.reducer;
