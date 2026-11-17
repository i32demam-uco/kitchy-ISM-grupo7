const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve(null);
  }),
  getItem: jest.fn((key: string) => {
    return Promise.resolve(mockStorage[key] || null);
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve(null);
  }),
  clear: jest.fn(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    return Promise.resolve(null);
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockStorage))),
}));

// Mock react-native-vision-camera
const mockRequestCameraPerm = jest.fn().mockResolvedValue(true);
jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const { View } = require('react-native');

  const CameraMock = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      takePhoto: jest.fn().mockResolvedValue({ path: '/mock/ticket.jpg' }),
    }));
    return React.createElement(View, { testID: 'vision-camera', ...props });
  });

  return {
    Camera: CameraMock,
    useCameraDevice: jest.fn(() => ({
      id: 'back-camera',
      position: 'back',
      name: 'Back Camera Mock',
    })),
    useCameraPermission: jest.fn(() => ({
      hasPermission: true,
      requestPermission: mockRequestCameraPerm,
    })),
    useCodeScanner: jest.fn((config) => config),
    usePhotoOutput: jest.fn(() => ({
      capturePhoto: jest.fn().mockResolvedValue({
        saveToTemporaryFileAsync: jest.fn().mockResolvedValue('file:///mock/ticket.jpg'),
        dispose: jest.fn(),
      }),
    })),
  };
});

// Mock react-native-nfc-manager
jest.mock('react-native-nfc-manager', () => {
  return {
    __esModule: true,
    default: {
      start: jest.fn().mockResolvedValue(true),
      isSupported: jest.fn().mockResolvedValue(true),
      isEnabled: jest.fn().mockResolvedValue(true),
      requestTechnology: jest.fn().mockResolvedValue(true),
      cancelTechnologyRequest: jest.fn().mockResolvedValue(true),
      getTag: jest.fn().mockResolvedValue({ id: 'mock-nfc-tag-123', ndefMessage: [] }),
      getInitialTag: jest.fn().mockResolvedValue(null),
      getLaunchTagEvent: jest.fn().mockResolvedValue(null),
      setEventListener: jest.fn(),
      goToNfcSetting: jest.fn().mockResolvedValue(true),
      registerTagEvent: jest.fn().mockResolvedValue(true),
      unregisterTagEvent: jest.fn().mockResolvedValue(true),
    },
    NfcTech: {
      Ndef: 'Ndef',
      NfcA: 'NfcA',
      MifareClassic: 'MifareClassic',
    },
    Ndef: {
      text: {
        decodePayload: jest.fn((payload) => {
          if (typeof payload === 'string') return payload;
          if (Array.isArray(payload) || payload instanceof Uint8Array) {
            const bytes = Array.from(payload);
            const status = bytes[0];
            const langLen = status & 0x3f;
            if (langLen > 0 && langLen < bytes.length) {
              return bytes.slice(1 + langLen).map((b) => String.fromCharCode(b)).join('');
            }
            return bytes.map((b) => String.fromCharCode(b)).join('');
          }
          return 'kitchy://house/a0000000-0000-0000-0000-000000000001';
        }),
      },
      uri: {
        decodePayload: jest.fn((payload) => {
          if (typeof payload === 'string') return payload;
          if (Array.isArray(payload) || payload instanceof Uint8Array) {
            const bytes = Array.from(payload);
            if (bytes[0] === 0x00) {
              return bytes.slice(1).map((b) => String.fromCharCode(b)).join('');
            }
            return bytes.map((b) => String.fromCharCode(b)).join('');
          }
          return 'kitchy://shopping-list';
        }),
      },
    },
    NfcEvents: {
      DiscoverTag: 'DiscoverTag',
      SessionClosed: 'SessionClosed',
    },
  };
});

// Mock @react-native-ml-kit/text-recognition
jest.mock('@react-native-ml-kit/text-recognition', () => {
  return {
    __esModule: true,
    default: {
      recognize: jest.fn().mockResolvedValue({
        text: 'MERCADONA\n1 LECHE ENTERA HACENDADO 1,05\n2 TOMATE FRITO HACENDADO 1,70\n1 PECHUGA POLLO 3,60',
        blocks: [
          {
            text: '1 LECHE ENTERA HACENDADO 1,05',
            lines: [{ text: '1 LECHE ENTERA HACENDADO 1,05' }],
          },
          {
            text: '2 TOMATE FRITO HACENDADO 1,70',
            lines: [{ text: '2 TOMATE FRITO HACENDADO 1,70' }],
          },
          {
            text: '1 PECHUGA POLLO 3,60',
            lines: [{ text: '1 PECHUGA POLLO 3,60' }],
          },
        ],
      }),
    },
  };
});

// Mock @react-native-ml-kit/barcode-scanning
jest.mock('@react-native-ml-kit/barcode-scanning', () => {
  return {
    __esModule: true,
    default: {
      scan: jest.fn().mockResolvedValue([
        {
          format: 32,
          value: '8480000350012',
        },
      ]),
    },
    BarcodeFormat: {
      EAN_13: 32,
      QR_CODE: 256,
    },
  };
});

// Mock @react-native-voice/voice
jest.mock('@react-native-voice/voice', () => ({
  __esModule: true,
  default: {
    onSpeechStart: null,
    onSpeechRecognized: null,
    onSpeechEnd: null,
    onSpeechError: null,
    onSpeechResults: null,
    onSpeechPartialResults: null,
    isAvailable: jest.fn().mockResolvedValue(1),
    start: jest.fn().mockResolvedValue(true),
    stop: jest.fn().mockResolvedValue(true),
    cancel: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    removeAllListeners: jest.fn(),
    isRecognizing: jest.fn().mockResolvedValue(false),
  },
}));

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn((options, callback) => {
    callback({
      didCancel: false,
      assets: [{ uri: 'file:///mock/captured_photo.jpg', fileName: 'captured_photo.jpg', type: 'image/jpeg', fileSize: 1024 * 1024 }],
    });
  }),
  launchImageLibrary: jest.fn((options, callback) => {
    callback({
      didCancel: false,
      assets: [{ uri: 'file:///mock/selected_photo.jpg', fileName: 'selected_photo.jpg', type: 'image/jpeg', fileSize: 1024 * 1024 }],
    });
  }),
}));

// Mock @microsoft/signalr
jest.mock('@microsoft/signalr', () => {
  const handlers = {};
  const mockHubConnection = {
    start: jest.fn().mockResolvedValue(true),
    stop: jest.fn().mockResolvedValue(true),
    invoke: jest.fn().mockResolvedValue(true),
    state: 'Connected',
    on: jest.fn((eventName, handler) => {
      handlers[eventName] = handler;
    }),
    off: jest.fn((eventName) => {
      delete handlers[eventName];
    }),
    __trigger: (eventName, data) => {
      if (handlers[eventName]) handlers[eventName](data);
    },
  };

  return {
    HubConnectionBuilder: jest.fn().mockImplementation(() => ({
      withUrl: jest.fn().mockReturnThis(),
      withAutomaticReconnect: jest.fn().mockReturnThis(),
      configureLogging: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue(mockHubConnection),
    })),
    HubConnectionState: {
      Connected: 'Connected',
      Disconnected: 'Disconnected',
      Connecting: 'Connecting',
      Reconnecting: 'Reconnecting',
    },
    LogLevel: { Information: 1 },
    HttpTransportType: { WebSockets: 1, LongPolling: 2 },
  };
});

