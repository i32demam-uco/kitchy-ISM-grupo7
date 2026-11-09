import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootTab } from '../types';

interface HardwareState {
  currentTab: RootTab;
  isProximityActive: boolean;
  isVoiceListening: boolean;
  voiceStatusText: string;
  isNfcModalVisible: boolean;
  isGeofenceAlertVisible: boolean;
  geofenceSupermarketName: string;
}

const initialState: HardwareState = {
  currentTab: 'home',
  isProximityActive: true,
  isVoiceListening: false,
  voiceStatusText: 'Te escucho, Alejandro. Di «siguiente» o «repite el paso»',
  isNfcModalVisible: false,
  isGeofenceAlertVisible: false,
  geofenceSupermarketName: 'Mercadona Gran Vía Parque (a 80 m)',
};

export const hardwareSlice = createSlice({
  name: 'hardware',
  initialState,
  reducers: {
    setCurrentTab: (state, action: PayloadAction<RootTab>) => {
      state.currentTab = action.payload;
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
  },
});

export const {
  setCurrentTab,
  toggleProximity,
  setVoiceListening,
  setVoiceStatusText,
  setNfcModalVisible,
  setGeofenceAlertVisible,
} = hardwareSlice.actions;

export default hardwareSlice.reducer;

