import React from 'react';
import { View, StyleSheet } from 'react-native';

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
    | 'hand-wave'
    | 'check'
    | 'zap'
    | 'sparkle'
    | 'plus'
    | 'qr-code'
    | 'barcode'
    | 'shopping-cart'
    | 'calendar'
    | 'trash'
    | 'flash';
  size?: number;
  color?: string;
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

    default:
      return null;
  }
};

