import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface VectorIconProps {
  name:
    | 'camera'
    | 'nfc'
    | 'house'
    | 'clock'
    | 'thermometer'
    | 'timer'
    | 'arrow-up-right'
    | 'chevron-down'
    | 'chevron-up'
    | 'chevron-left'
    | 'chevron-right'
    | 'hand-wave'
    | 'check'
    | 'zap'
    | 'sparkle'
    | 'sparkles'
    | 'plus'
    | 'add'
    | 'minus'
    | 'qr-code'
    | 'barcode'
    | 'shopping-cart'
    | 'shopping-bag'
    | 'calendar'
    | 'trash'
    | 'flash'
    | 'play'
    | 'pause'
    | 'arrow-up'
    | 'image'
    | 'close'
    | 'users'
    | 'people'
    | 'layers'
    | 'location'
    | 'mic'
    | 'bell'
    | 'more-vertical'
    | 'restaurant'
    | 'flame'
    | 'heart'
    | 'heart-outline'
    | 'pencil'
    | 'share-social'
    | 'radar'
    | 'logout';
  size?: number;
  color?: string;
  bgColor?: string;
}

/**
 * VectorIcon - Componente de Iconografía Vectorial Limpia (Cero Emojis).
 * 
 * Cumple estrictamente la directiva UI/UX Premium de Fotorrealismo:
 * Reemplaza emojis de baja calidad con trazados geométricos vectoriales tipo Feather / Ionicons.
 */
export const VectorIcon: React.FC<VectorIconProps> = ({
  name,
  size = 18,
  color = '#FFFFFF',
  bgColor,
}) => {
  switch (name) {
    case 'camera':
      return (
        <View style={{ width: size, height: size * 0.8, justifyContent: 'center', alignItems: 'center' }}>
          {/* Pequeña pestaña superior del visor */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              width: size * 0.35,
              height: size * 0.2,
              backgroundColor: color,
              borderTopLeftRadius: 2,
              borderTopRightRadius: 2,
            }}
          />
          {/* Cuerpo de la cámara */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              width: size,
              height: size * 0.68,
              borderWidth: 1.6,
              borderColor: color,
              borderRadius: 4,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* Lente central */}
            <View
              style={{
                width: size * 0.32,
                height: size * 0.32,
                borderRadius: (size * 0.32) / 2,
                borderWidth: 1.5,
                borderColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'nfc':
      return (
        <View
          style={{
            width: size,
            height: size,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Tres ondas concéntricas de radiofrecuencia ))) */}
          <View
            style={{
              width: size * 0.45,
              height: size * 0.4,
              borderRightWidth: 1.8,
              borderColor: color,
              borderRadius: size * 0.25,
              marginRight: 2,
            }}
          />
          <View
            style={{
              width: size * 0.7,
              height: size * 0.65,
              borderRightWidth: 1.8,
              borderColor: color,
              borderRadius: size * 0.4,
              marginRight: 2,
            }}
          />
          <View
            style={{
              width: size * 0.95,
              height: size * 0.9,
              borderRightWidth: 1.8,
              borderColor: color,
              borderRadius: size * 0.55,
            }}
          />
        </View>
      );

    case 'clock':
      return (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1.6,
            borderColor: color,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Manecilla vertical (12h) */}
          <View
            style={{
              position: 'absolute',
              top: size * 0.22,
              width: 1.5,
              height: size * 0.3,
              backgroundColor: color,
              borderRadius: 1,
            }}
          />
          {/* Manecilla horizontal (3h) */}
          <View
            style={{
              position: 'absolute',
              left: size * 0.45,
              top: size * 0.45,
              width: size * 0.26,
              height: 1.5,
              backgroundColor: color,
              borderRadius: 1,
            }}
          />
        </View>
      );

    case 'house':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          {/* Tejado triangular */}
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: size * 0.48,
              borderRightWidth: size * 0.48,
              borderBottomWidth: size * 0.42,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
            }}
          />
          {/* Paredes */}
          <View
            style={{
              width: size * 0.72,
              height: size * 0.45,
              borderWidth: 1.5,
              borderTopWidth: 0,
              borderColor: color,
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2,
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            {/* Puerta */}
            <View
              style={{
                width: size * 0.24,
                height: size * 0.28,
                backgroundColor: color,
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
              }}
            />
          </View>
        </View>
      );

    case 'thermometer':
      return (
        <View style={{ width: size * 0.6, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {/* Tubo vertical */}
          <View
            style={{
              width: size * 0.26,
              height: size * 0.65,
              borderWidth: 1.4,
              borderBottomWidth: 0,
              borderColor: color,
              borderTopLeftRadius: size * 0.13,
              borderTopRightRadius: size * 0.13,
              alignItems: 'center',
              paddingTop: 2,
            }}
          >
            {/* Mercurio interno */}
            <View
              style={{
                width: size * 0.1,
                height: size * 0.35,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
          {/* Bulbo inferior */}
          <View
            style={{
              width: size * 0.44,
              height: size * 0.44,
              borderRadius: (size * 0.44) / 2,
              borderWidth: 1.4,
              borderColor: color,
              backgroundColor: color,
              marginTop: -size * 0.08,
            }}
          />
        </View>
      );

    case 'timer':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {/* Pulsador superior */}
          <View
            style={{
              width: size * 0.28,
              height: size * 0.14,
              backgroundColor: color,
              borderRadius: 1,
              marginBottom: 1,
            }}
          />
          {/* Esfera */}
          <View
            style={{
              width: size * 0.82,
              height: size * 0.82,
              borderRadius: (size * 0.82) / 2,
              borderWidth: 1.6,
              borderColor: color,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 1.5,
                height: size * 0.26,
                backgroundColor: color,
                marginTop: -size * 0.1,
              }}
            />
          </View>
        </View>
      );

    case 'arrow-up-right':
      return (
        <View
          style={{
            width: size,
            height: size,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: size * 0.7,
              height: size * 0.7,
              borderTopWidth: 1.8,
              borderRightWidth: 1.8,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'chevron-down':
      return (
        <View
          style={{
            width: size * 0.7,
            height: size * 0.4,
            borderBottomWidth: 1.8,
            borderRightWidth: 1.8,
            borderColor: color,
            transform: [{ rotate: '45deg' }],
            marginTop: -2,
          }}
        />
      );

    case 'hand-wave':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          {/* Palma estilizada */}
          <View
            style={{
              width: size * 0.6,
              height: size * 0.7,
              borderWidth: 1.5,
              borderColor: color,
              borderRadius: 5,
            }}
          />
        </View>
      );

    case 'check':
      return (
        <View
          style={{
            width: size * 0.7,
            height: size * 0.4,
            borderBottomWidth: 2,
            borderLeftWidth: 2,
            borderColor: color,
            transform: [{ rotate: '-45deg' }],
            marginTop: -2,
          }}
        />
      );

    case 'zap':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: 0,
              height: 0,
              borderRightWidth: size * 0.4,
              borderBottomWidth: size * 0.5,
              borderRightColor: 'transparent',
              borderBottomColor: color,
              transform: [{ rotate: '15deg' }],
            }}
          />
        </View>
      );

    case 'sparkle':
    case 'sparkles':
      return (
        <View
          style={{
            width: size,
            height: size,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: size * 0.22,
              height: size,
              backgroundColor: color,
              borderRadius: size * 0.11,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: size,
              height: size * 0.22,
              backgroundColor: color,
              borderRadius: size * 0.11,
            }}
          />
          <View
            style={{
              width: size * 0.45,
              height: size * 0.45,
              borderRadius: (size * 0.45) / 2,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'plus':
    case 'add':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              position: 'absolute',
              width: size * 0.22,
              height: size * 0.85,
              backgroundColor: color,
              borderRadius: 2,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: size * 0.85,
              height: size * 0.22,
              backgroundColor: color,
              borderRadius: 2,
            }}
          />
        </View>
      );

    case 'pause':
      return (
        <View style={{ width: size, height: size, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
          <View style={{ width: size * 0.24, height: size * 0.8, backgroundColor: color, borderRadius: 2 }} />
          <View style={{ width: size * 0.24, height: size * 0.8, backgroundColor: color, borderRadius: 2 }} />
        </View>
      );

    case 'qr-code':
      return (
        <View
          style={{
            width: size,
            height: size,
            borderWidth: size * 0.14,
            borderColor: color,
            borderRadius: 3,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 2,
          }}
        >
          <View
            style={{
              width: size * 0.45,
              height: size * 0.45,
              backgroundColor: color,
              borderRadius: 1,
            }}
          />
        </View>
      );

    case 'barcode':
      return (
        <View
          style={{
            width: size,
            height: size * 0.75,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View style={{ width: 2, height: '100%', backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 1, height: '100%', backgroundColor: color }} />
          <View style={{ width: 3, height: '100%', backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 1.5, height: '100%', backgroundColor: color }} />
          <View style={{ width: 2, height: '100%', backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 3.5, height: '100%', backgroundColor: color, borderRadius: 1 }} />
        </View>
      );

    case 'shopping-cart':
      return (
        <View style={{ width: size, height: size * 0.9, justifyContent: 'center', alignItems: 'center' }}>
          {/* Cesta del carrito */}
          <View
            style={{
              width: size * 0.8,
              height: size * 0.55,
              borderWidth: 1.8,
              borderColor: color,
              borderTopWidth: 0,
              borderBottomLeftRadius: 4,
              borderBottomRightRadius: 4,
            }}
          />
          {/* Ruedas */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: size * 0.65, marginTop: 2 }}>
            <View style={{ width: size * 0.16, height: size * 0.16, borderRadius: (size * 0.16) / 2, backgroundColor: color }} />
            <View style={{ width: size * 0.16, height: size * 0.16, borderRadius: (size * 0.16) / 2, backgroundColor: color }} />
          </View>
        </View>
      );

    case 'calendar':
      return (
        <View
          style={{
            width: size,
            height: size * 0.9,
            borderWidth: 1.8,
            borderColor: color,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          {/* Barra superior de calendario */}
          <View style={{ width: '100%', height: size * 0.28, backgroundColor: color }} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: size * 0.25, height: size * 0.2, backgroundColor: color, borderRadius: 1 }} />
          </View>
        </View>
      );

    case 'trash':
      return (
        <View style={{ width: size * 0.8, height: size, justifyContent: 'center', alignItems: 'center' }}>
          {/* Tapa del cubo */}
          <View style={{ width: size * 0.9, height: 2, backgroundColor: color, borderRadius: 1 }} />
          {/* Cubo */}
          <View
            style={{
              width: size * 0.7,
              height: size * 0.65,
              borderWidth: 1.6,
              borderColor: color,
              borderTopWidth: 0,
              borderBottomLeftRadius: 3,
              borderBottomRightRadius: 3,
              marginTop: 2,
            }}
          />
        </View>
      );

    case 'flash':
      return (
        <View style={{ width: size * 0.8, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: size * 0.25,
              borderRightWidth: size * 0.25,
              borderBottomWidth: size * 0.5,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
              transform: [{ rotate: '-15deg' }],
            }}
          />
        </View>
      );

    case 'chevron-up':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: size * 0.45,
              height: size * 0.45,
              borderTopWidth: 2,
              borderLeftWidth: 2,
              borderColor: color,
              transform: [{ rotate: '45deg' }, { translateY: size * 0.1 }],
            }}
          />
        </View>
      );

    case 'chevron-left':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: size * 0.45,
              height: size * 0.45,
              borderTopWidth: 2,
              borderLeftWidth: 2,
              borderColor: color,
              transform: [{ rotate: '-45deg' }, { translateX: size * 0.1 }],
            }}
          />
        </View>
      );

    case 'chevron-right':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: size * 0.45,
              height: size * 0.45,
              borderTopWidth: 2,
              borderRightWidth: 2,
              borderColor: color,
              transform: [{ rotate: '45deg' }, { translateX: -size * 0.1 }],
            }}
          />
        </View>
      );

    case 'minus':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: size * 0.65,
              height: 2,
              backgroundColor: color,
              borderRadius: 1,
            }}
          />
        </View>
      );

    case 'play':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: size * 0.55,
              borderTopWidth: size * 0.35,
              borderBottomWidth: size * 0.35,
              borderLeftColor: color,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              marginLeft: size * 0.1,
            }}
          />
        </View>
      );

    case 'arrow-up':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: size * 0.35,
              height: size * 0.35,
              borderTopWidth: 2,
              borderLeftWidth: 2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              position: 'absolute',
              top: size * 0.2,
            }}
          />
          <View
            style={{
              width: 2,
              height: size * 0.55,
              backgroundColor: color,
              position: 'absolute',
              bottom: size * 0.2,
            }}
          />
        </View>
      );

    case 'image':
      return (
        <View style={{ width: size, height: size * 0.8, borderWidth: 1.6, borderColor: color, borderRadius: 3, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: size * 0.25, height: size * 0.25, borderRadius: (size * 0.25) / 2, backgroundColor: color, position: 'absolute', top: size * 0.1, left: size * 0.15 }} />
          <View style={{ width: 0, height: 0, borderLeftWidth: size * 0.3, borderRightWidth: size * 0.3, borderBottomWidth: size * 0.35, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color, position: 'absolute', bottom: 0, right: size * 0.05 }} />
        </View>
      );

    case 'close':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: size * 0.7, height: 2, backgroundColor: color, transform: [{ rotate: '45deg' }], position: 'absolute' }} />
          <View style={{ width: size * 0.7, height: 2, backgroundColor: color, transform: [{ rotate: '-45deg' }], position: 'absolute' }} />
        </View>
      );

    case 'shopping-bag':
      return (
        <View style={{ width: size * 0.8, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: size * 0.35, height: size * 0.25, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: color, borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
          <View style={{ width: size * 0.75, height: size * 0.6, borderWidth: 1.5, borderColor: color, borderRadius: 3 }} />
        </View>
      );

    case 'users':
    case 'people':
      return (
        <View style={{ width: size, height: size * 0.8, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: size * 0.35, height: size * 0.35, borderRadius: (size * 0.35) / 2, borderWidth: 1.4, borderColor: color, position: 'absolute', top: 0, left: size * 0.1 }} />
          <View style={{ width: size * 0.3, height: size * 0.3, borderRadius: (size * 0.3) / 2, borderWidth: 1.4, borderColor: color, position: 'absolute', top: 0, right: size * 0.1 }} />
          <View style={{ width: size * 0.6, height: size * 0.35, borderTopWidth: 1.4, borderLeftWidth: 1.4, borderRightWidth: 1.4, borderColor: color, borderTopLeftRadius: 8, borderTopRightRadius: 8, position: 'absolute', bottom: 0, left: 0 }} />
        </View>
      );

    case 'layers':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: size * 0.65, height: size * 0.35, borderWidth: 1.4, borderColor: color, transform: [{ rotate: '45deg' }] }} />
        </View>
      );

    case 'radar':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          {/* Círculo exterior */}
          <View
            style={{
              position: 'absolute',
              width: size * 0.95,
              height: size * 0.95,
              borderRadius: (size * 0.95) / 2,
              borderWidth: 1.5,
              borderColor: color,
              borderBottomColor: 'transparent',
              transform: [{ rotate: '-45deg' }],
            }}
          />
          {/* Círculo intermedio */}
          <View
            style={{
              position: 'absolute',
              width: size * 0.62,
              height: size * 0.62,
              borderRadius: (size * 0.62) / 2,
              borderWidth: 1.5,
              borderColor: color,
              borderBottomColor: 'transparent',
              transform: [{ rotate: '-45deg' }],
            }}
          />
          {/* Punto emisor central */}
          <View
            style={{
              width: size * 0.25,
              height: size * 0.25,
              borderRadius: (size * 0.25) / 2,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'location':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: size * 0.6,
              height: size * 0.6,
              borderRadius: (size * 0.6) / 2,
              borderWidth: 1.8,
              borderColor: color,
              borderBottomRightRadius: 2,
              transform: [{ rotate: '-45deg' }],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: size * 0.2,
                height: size * 0.2,
                borderRadius: (size * 0.2) / 2,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'mic':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: size * 0.42,
              height: size * 0.58,
              borderRadius: size * 0.21,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: size * 0.18,
              width: size * 0.72,
              height: size * 0.52,
              borderBottomLeftRadius: size * 0.36,
              borderBottomRightRadius: size * 0.36,
              borderWidth: Math.max(1.8, size * 0.09),
              borderTopWidth: 0,
              borderColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: size * 0.06,
              width: Math.max(1.8, size * 0.09),
              height: size * 0.22,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'bell':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: size * 0.55,
              height: size * 0.55,
              borderTopLeftRadius: size * 0.3,
              borderTopRightRadius: size * 0.3,
              borderWidth: 1.6,
              borderColor: color,
              borderBottomWidth: 0,
            }}
          />
          <View style={{ width: size * 0.75, height: 1.8, backgroundColor: color }} />
          <View style={{ width: size * 0.2, height: size * 0.1, backgroundColor: color, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, marginTop: 1 }} />
        </View>
      );

    case 'more-vertical':
      const dotSize = Math.max(3, Math.round(size * 0.18));
      return (
        <View style={{ width: size, height: size, justifyContent: 'space-evenly', alignItems: 'center' }}>
          <View style={{ width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color }} />
          <View style={{ width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color }} />
          <View style={{ width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color }} />
        </View>
      );

    case 'logout':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          {/* Marco de puerta/salida */}
          <View
            style={{
              position: 'absolute',
              left: 2,
              top: 2,
              bottom: 2,
              width: size * 0.45,
              borderLeftWidth: 1.8,
              borderTopWidth: 1.8,
              borderBottomWidth: 1.8,
              borderColor: color,
              borderTopLeftRadius: 3,
              borderBottomLeftRadius: 3,
            }}
          />
          {/* Flecha horizontal */}
          <View
            style={{
              position: 'absolute',
              right: 2,
              width: size * 0.5,
              height: 1.8,
              backgroundColor: color,
            }}
          />
          {/* Punta de la flecha */}
          <View
            style={{
              position: 'absolute',
              right: 2,
              width: size * 0.26,
              height: size * 0.26,
              borderTopWidth: 1.8,
              borderRightWidth: 1.8,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'restaurant':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          {/* Tenedor izquierdo */}
          <View style={{ position: 'absolute', left: size * 0.18, width: 2, height: size * 0.75, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ position: 'absolute', left: size * 0.1, top: size * 0.12, width: size * 0.22, height: 2, backgroundColor: color }} />
          {/* Cuchillo derecho */}
          <View style={{ position: 'absolute', right: size * 0.18, width: 2.2, height: size * 0.75, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ position: 'absolute', right: size * 0.16, top: size * 0.12, width: size * 0.14, height: size * 0.35, borderTopRightRadius: 4, backgroundColor: color }} />
        </View>
      );

    case 'flame':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: size * 0.55,
              height: size * 0.75,
              borderTopLeftRadius: size * 0.4,
              borderBottomLeftRadius: size * 0.3,
              borderBottomRightRadius: size * 0.3,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'heart': {
      const s = Math.round(size * 0.52);
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', overflow: 'visible' }}>
          <View
            style={{
              width: s,
              height: s,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
              marginTop: Math.round(size * 0.16),
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: -s / 2,
                left: 0,
                width: s,
                height: s,
                borderRadius: s / 2,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: -s / 2,
                width: s,
                height: s,
                borderRadius: s / 2,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );
    }

    case 'heart-outline': {
      const s = Math.round(size * 0.52);
      const bg = bgColor || '#27272A';
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', overflow: 'visible' }}>
          <View
            style={{
              width: s,
              height: s,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
              marginTop: Math.round(size * 0.16),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Lóbulo superior exterior */}
            <View
              style={{
                position: 'absolute',
                top: -s / 2,
                left: 0,
                width: s,
                height: s,
                borderRadius: s / 2,
                backgroundColor: color,
              }}
            />
            {/* Lóbulo derecho exterior */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: -s / 2,
                width: s,
                height: s,
                borderRadius: s / 2,
                backgroundColor: color,
              }}
            />

            {/* Vaciado interior escalado concéntricamente para crear el trazo hueco outline */}
            <View
              style={{
                width: s,
                height: s,
                backgroundColor: bg,
                position: 'absolute',
                transform: [{ scale: 0.72 }],
                zIndex: 2,
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: -s / 2,
                  left: 0,
                  width: s,
                  height: s,
                  borderRadius: s / 2,
                  backgroundColor: bg,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  right: -s / 2,
                  width: s,
                  height: s,
                  borderRadius: s / 2,
                  backgroundColor: bg,
                }}
              />
            </View>
          </View>
        </View>
      );
    }

    case 'pencil':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: size * 0.28,
              height: size * 0.72,
              borderWidth: 1.6,
              borderColor: color,
              borderRadius: 2,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'share-social':
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          {/* Nodo derecho superior */}
          <View style={{ position: 'absolute', top: size * 0.15, right: size * 0.12, width: size * 0.24, height: size * 0.24, borderRadius: (size * 0.24) / 2, backgroundColor: color }} />
          {/* Nodo izquierdo centro */}
          <View style={{ position: 'absolute', top: size * 0.38, left: size * 0.12, width: size * 0.24, height: size * 0.24, borderRadius: (size * 0.24) / 2, backgroundColor: color }} />
          {/* Nodo derecho inferior */}
          <View style={{ position: 'absolute', bottom: size * 0.15, right: size * 0.12, width: size * 0.24, height: size * 0.24, borderRadius: (size * 0.24) / 2, backgroundColor: color }} />
          {/* Conexiones */}
          <View style={{ position: 'absolute', top: size * 0.32, left: size * 0.25, width: size * 0.5, height: 1.6, backgroundColor: color, transform: [{ rotate: '-25deg' }] }} />
          <View style={{ position: 'absolute', bottom: size * 0.32, left: size * 0.25, width: size * 0.5, height: 1.6, backgroundColor: color, transform: [{ rotate: '25deg' }] }} />
        </View>
      );

    default:
      return null;
  }
};

