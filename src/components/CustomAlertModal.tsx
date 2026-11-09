import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Colors, Typography } from '../theme';
import { KitchyAlert, CustomAlertOptions, AlertButton } from '../services/kitchyAlert';
import { VectorIcon } from './VectorIcon';

/**
 * CustomAlertModal - Diálogo Emergente Premium con Estética Glassmorphism.
 * 
 * Reemplaza los popups blancos genéricos del sistema Android/iOS conservando
 * al 100% el modo oscuro, la tipografía Poppins/Inter y los acentos Verde UCO.
 */
export const CustomAlertModal: React.FC = () => {
  const [alertData, setAlertData] = useState<CustomAlertOptions | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    KitchyAlert.register((options) => {
      if (options) {
        setAlertData(options);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start(() => {
          setAlertData(null);
        });
      }
    });

    return () => {
      KitchyAlert.unregister();
    };
  }, [fadeAnim]);

  if (!alertData) return null;

  const handleButtonPress = (btn: AlertButton) => {
    KitchyAlert.hide();
    if (btn.onPress) {
      btn.onPress();
    }
  };

  const isSuccessType =
    alertData.title.includes('✓') ||
    alertData.title.includes('Faltantes') ||
    alertData.title.includes('guardados') ||
    alertData.title.includes('Hogar') ||
    alertData.title.includes('listo');

  return (
    <Modal
      transparent
      visible={true}
      animationType="none"
      onRequestClose={() => KitchyAlert.hide()}
    >
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <View style={styles.card}>
          {/* Cabecera con Icono de Estado */}
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconBox,
                isSuccessType ? styles.iconBoxSuccess : styles.iconBoxInfo,
              ]}
            >
              <VectorIcon
                name={isSuccessType ? 'check' : 'house'}
                size={18}
                color={isSuccessType ? Colors.primaryGreen : '#3B82F6'}
              />
            </View>
            <Text style={styles.title}>{alertData.title}</Text>
          </View>

          {/* Mensaje Descriptivo */}
          {alertData.message ? (
            <Text style={styles.message}>{alertData.message}</Text>
          ) : null}

          {/* Bloque especial para Códigos y Enlaces (ej. Invitación Multihogar RF2) */}
          {alertData.code || alertData.link ? (
            <View style={styles.specialContentCard}>
              {alertData.code ? (
                <View style={styles.codeRow}>
                  <Text style={styles.codeLabel}>CÓDIGO:</Text>
                  <View style={styles.codePill}>
                    <Text style={styles.codeValue}>{alertData.code}</Text>
                  </View>
                </View>
              ) : null}

              {alertData.link ? (
                <View style={styles.linkRow}>
                  <Text style={styles.linkLabel}>ENLACE:</Text>
                  <Text style={styles.linkValue} numberOfLines={1}>
                    {alertData.link}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Botonera de Acciones */}
          <View
            style={[
              styles.buttonRow,
              alertData.buttons && alertData.buttons.length > 1
                ? styles.buttonRowMultiple
                : styles.buttonRowSingle,
            ]}
          >
            {alertData.buttons?.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.actionButton,
                    isCancel ? styles.buttonCancel : styles.buttonConfirm,
                    alertData.buttons && alertData.buttons.length > 1
                      ? styles.actionButtonFlex
                      : styles.actionButtonFull,
                  ]}
                  onPress={() => handleButtonPress(btn)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel ? styles.buttonTextCancel : styles.buttonTextConfirm,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 999999,
  },
  card: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconBoxSuccess: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  iconBoxInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  title: {
    fontSize: 17,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
  },
  message: {
    fontSize: 13.5,
    fontFamily: Typography.body,
    color: '#D1D5DB',
    lineHeight: 20,
    marginBottom: 16,
  },
  specialContentCard: {
    backgroundColor: '#26262C',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
    marginRight: 8,
  },
  codePill: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primaryGreen,
  },
  codeValue: {
    color: Colors.primaryGreen,
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '800',
    letterSpacing: 1,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
    marginRight: 8,
  },
  linkValue: {
    fontSize: 11.5,
    color: '#60A5FA',
    fontFamily: Typography.body,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  buttonRowSingle: {
    justifyContent: 'center',
  },
  buttonRowMultiple: {
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonFull: {
    width: '100%',
  },
  actionButtonFlex: {
    flex: 1,
  },
  buttonConfirm: {
    backgroundColor: Colors.primaryGreen,
    shadowColor: Colors.primaryGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonCancel: {
    backgroundColor: '#2A2A32',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  buttonText: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
  },
  buttonTextConfirm: {
    color: '#000000',
  },
  buttonTextCancel: {
    color: '#D1D5DB',
  },
});

