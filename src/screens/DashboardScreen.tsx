import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { Colors } from '../theme';
import { useAppDispatch, useAppSelector } from '../store';
import { setActiveHouse } from '../store/authSlice';
import { setInventory } from '../store/inventorySlice';
import { setCurrentTab, setNfcModalVisible } from '../store/hardwareSlice';
import { InventoryItem } from '../types';
import { VectorIcon } from '../components/VectorIcon';
import { ApiService } from '../services/api';

export const DashboardScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const inventoryItems = useAppSelector((state) => state.inventory.items);
  const [housePickerVisible, setHousePickerVisible] = useState(false);

  // Requisito: Solo mostrar los 3 o 4 productos más recientemente añadidos (orden descendente)
  const recentPantryItems = useMemo(() => {
    return [...inventoryItems]
      .sort((a, b) => {
        const timeA = new Date(a.purchaseDate || a.expirationDate || 0).getTime();
        const timeB = new Date(b.purchaseDate || b.expirationDate || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 4);
  }, [inventoryItems]);

  const urgentItems = inventoryItems.filter(
    (item) => item.urgencyLevel === 'Red' || item.urgencyLevel === 'Amber'
  );

  const handleHouseSelect = async (houseId: string) => {
    dispatch(setActiveHouse(houseId));
    setHousePickerVisible(false);

    // Forzar recarga inmediata de inventario para este hogar (Aislamiento de datos)
    try {
      const items = await ApiService.getInventory(houseId);
      if (items && items.length > 0) {
        dispatch(setInventory(items));
      }
    } catch {
      // Fallback tolerante
    }
  };

  const handleCookWithExpiring = (item: InventoryItem) => {
    dispatch(setCurrentTab('cook'));
  };

  const handleOpenScanner = () => {
    dispatch(setCurrentTab('scan'));
  };

  const handleOpenNfc = () => {
    dispatch(setNfcModalVisible(true));
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Superior */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>kitchy</Text>
          <Text style={styles.welcomeText}>Tu cocina, {auth.fullName}.</Text>

          {/* Selector Multihogar con Vector Icon y Hogar Secundario (Figma Screen 1) */}
          <TouchableOpacity
            style={styles.houseSelector}
            onPress={() => setHousePickerVisible(true)}
            activeOpacity={0.7}
          >
            <VectorIcon name="house" size={17} color={Colors.primaryGreen} />
            <Text style={styles.houseName}>{auth.activeHouse.name}</Text>
            <VectorIcon name="chevron-down" size={12} color="#9CA3AF" />
            {auth.availableHouses.length > 1 && (
              <Text style={styles.secondaryHouseHint}>
                {auth.availableHouses.length === 2
                  ? `+ ${auth.availableHouses.find((h) => h.id !== auth.activeHouse.id)?.name}`
                  : `+ ${auth.availableHouses.length - 1} más`}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Avatares de miembros del hogar -> Acceso directo a Perfil */}
        <TouchableOpacity
          style={styles.avatarGroup}
          onPress={() => dispatch(setCurrentTab('profile'))}
          activeOpacity={0.8}
        >
          {auth.membersInActiveHouse.map((m, idx) => (
            <View
              key={m.id}
              style={[
                styles.avatarCircle,
                { marginLeft: idx === 0 ? 0 : -8, zIndex: 10 - idx },
                m.id === auth.userId && styles.avatarCurrent,
              ]}
            >
              <Text style={styles.avatarText}>{m.avatar}</Text>
            </View>
          ))}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Sección Urgente (Carrusel Ámbar / Semáforo de Caducidad) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Urgente</Text>
          <Text style={styles.sectionSubtitle}>
            {urgentItems.length} alimentos • 24-48 h
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.urgentScroll}
        >
          {urgentItems.map((item) => {
            const isRed = item.urgencyLevel === 'Red';
            return (
              <View
                key={item.id}
                style={[
                  styles.urgentCard,
                  isRed ? styles.urgentCardRed : styles.urgentCardAmber,
                ]}
              >
                {/* Chip Superior con Vector Icon de Reloj */}
                <View style={styles.urgentCardTop}>
                  <View
                    style={[
                      styles.urgencyBadge,
                      isRed ? styles.urgencyBadgeRed : styles.urgencyBadgeAmber,
                    ]}
                  >
                    <VectorIcon
                      name="clock"
                      size={12}
                      color={isRed ? Colors.urgencyRed : Colors.urgencyAmber}
                    />
                    <Text
                      style={[
                        styles.urgencyBadgeText,
                        isRed ? styles.urgencyTextRed : styles.urgencyTextAmber,
                      ]}
                    >
                      {isRed ? 'Caduca en 24 h' : 'Caducan en 48 h'}
                    </Text>
                  </View>

                  {isRed && (
                    <TouchableOpacity
                      onPress={() => handleCookWithExpiring(item)}
                      style={styles.aprovecharButton}
                    >
                      <Text style={styles.aprovecharText}>Aprovechar ↗</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Info Alimento con Fotografía Real (Fotorrealismo de Alta Gama) */}
                <View style={styles.urgentCardBody}>
                  <Image
                    source={{
                      uri:
                        item.imageUrl ||
                        'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200',
                    }}
                    style={styles.foodRealImage}
                    resizeMode="cover"
                  />
                  <View style={styles.foodInfoTextContainer}>
                    <Text style={styles.urgentFoodTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.urgentFoodDetails}>
                      {item.quantity} {item.unit} • {item.location}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* 3. Sección "Tu Despensa" */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Tu Despensa</Text>
          <TouchableOpacity
            onPress={() => dispatch(setCurrentTab('pantry'))}
            activeOpacity={0.7}
          >
            <Text style={styles.verTodoText}>Ver todo &gt;</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.pantryListCard}>
          {recentPantryItems.map((item, index) => {
            const isLast = index === recentPantryItems.length - 1;
            return (
              <View
                key={`${item.id}-${index}`}
                style={[styles.pantryRow, !isLast && styles.pantryRowBorder]}
              >
                <View style={styles.pantryRowLeft}>
                  {/* Semáforo indicador de color */}
                  <View
                    style={[
                      styles.trafficDot,
                      item.urgencyLevel === 'Red'
                        ? styles.dotRed
                        : item.urgencyLevel === 'Amber'
                        ? styles.dotAmber
                        : styles.dotGreen,
                    ]}
                  />
                  {/* Fotografía Real del Producto (Cero Emojis) */}
                  <Image
                    source={{
                      uri:
                        item.imageUrl ||
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200',
                    }}
                    style={styles.pantryRealImage}
                    resizeMode="cover"
                  />
                  <View style={styles.pantryDetails}>
                    <Text style={styles.pantryName}>{item.name}</Text>
                    <Text style={styles.pantrySubText}>
                      Añadido por {item.addedByUserId} • {item.location}
                    </Text>
                  </View>
                </View>

                {/* Cantidad */}
                <View style={styles.pantryQuantityBadge}>
                  <Text style={styles.pantryQuantityText}>
                    {item.quantity} {item.unit}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* 4. Banner "¡Escanea tu primer ticket o usa NFC!" */}
        <TouchableOpacity
          style={styles.bannerContainer}
          onPress={handleOpenScanner}
          activeOpacity={0.88}
        >
          <View style={styles.bannerIconBox}>
            <VectorIcon name="camera" size={24} color={Colors.primaryGreen} />
          </View>
          <View style={styles.bannerTextBox}>
            <Text style={styles.bannerTitle}>
              ¡Escanea tu primer ticket o usa NFC!
            </Text>
            <Text style={styles.bannerSubtitle}>
              JP y David ya han llenado la despensa. ¡Ahora te toca a ti!
            </Text>
            <View style={styles.bannerActionRow}>
              <Text style={styles.bannerActionLink}>
                Toca para cámara o NFC &gt;
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Selector de Hogar (Multihogar RF1) */}
      <Modal
        visible={housePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHousePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setHousePickerVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Tus Hogares</Text>
                <Text style={styles.modalSubtitle}>
                  Selecciona el hogar activo para sincronizar su despensa
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setHousePickerVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {auth.availableHouses.map((h) => {
              const isActive = h.id === auth.activeHouse.id;
              return (
                <TouchableOpacity
                  key={h.id}
                  style={[
                    styles.houseOption,
                    isActive && styles.houseOptionActive,
                  ]}
                  onPress={() => handleHouseSelect(h.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.houseOptionLeft}>
                    <View
                      style={[
                        styles.houseIconCircle,
                        isActive && styles.houseIconCircleActive,
                      ]}
                    >
                      <VectorIcon
                        name="house"
                        size={18}
                        color={isActive ? Colors.primaryGreen : '#9CA3AF'}
                      />
                    </View>
                    <View style={styles.houseOptionTextWrap}>
                      <Text
                        style={[
                          styles.houseOptionName,
                          isActive && styles.houseOptionNameActive,
                        ]}
                      >
                        {h.name}
                      </Text>
                      <Text style={styles.houseOptionDetails}>
                        {h.address || 'Córdoba, España'} • {h.memberCount} miembros
                      </Text>
                    </View>
                  </View>

                  {isActive ? (
                    <View style={styles.activeHouseBadge}>
                      <Text style={styles.activeHouseBadgeText}>Activo</Text>
                    </View>
                  ) : (
                    <Text style={styles.switchHouseActionText}>Cambiar</Text>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Acceso directo para gestionar o unirse a un nuevo hogar */}
            <TouchableOpacity
              style={styles.manageHousesLinkBtn}
              onPress={() => {
                setHousePickerVisible(false);
                dispatch(setCurrentTab('houses'));
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.manageHousesLinkText}>
                + Administrar Hogares (Crear / Unirse con QR)
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  welcomeText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  houseSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E24',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  houseName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
    marginRight: 4,
  },
  secondaryHouseHint: {
    color: '#6B7280',
    fontSize: 11,
    marginLeft: 8,
    fontWeight: '500',
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A2A32',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  avatarCurrent: {
    borderColor: Colors.primaryGreen,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingBottom: 95,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 18,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  verTodoText: {
    fontSize: 13,
    color: Colors.primaryGreen,
    fontWeight: '600',
  },
  urgentScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  urgentCard: {
    width: 250,
    borderRadius: 22,
    padding: 18,
    marginRight: 14,
    backgroundColor: '#1C1C1E',
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  urgentCardAmber: {
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  urgentCardRed: {
    borderColor: 'rgba(239, 68, 68, 0.45)',
    backgroundColor: '#22181A',
  },
  urgentCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  urgencyBadgeAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  urgencyBadgeRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  urgencyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  urgencyTextAmber: {
    color: '#F59E0B',
  },
  urgencyTextRed: {
    color: '#EF4444',
  },
  aprovecharButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aprovecharText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  urgentCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodRealImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#262626',
    marginRight: 12,
  },
  foodInfoTextContainer: {
    flex: 1,
  },
  urgentFoodTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  urgentFoodDetails: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  pantryListCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  pantryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  pantryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  pantryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trafficDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 10,
  },
  dotRed: {
    backgroundColor: Colors.urgencyRed,
  },
  dotAmber: {
    backgroundColor: Colors.urgencyAmber,
  },
  dotGreen: {
    backgroundColor: Colors.urgencyGreen,
  },
  pantryRealImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#26262E',
    marginRight: 12,
  },
  pantryDetails: {
    flex: 1,
  },
  pantryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pantrySubText: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  pantryQuantityBadge: {
    backgroundColor: '#23232A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pantryQuantityText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13231B',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 230, 118, 0.35)',
    padding: 18,
    marginTop: 22,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  bannerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  bannerEmoji: {
    fontSize: 24,
  },
  bannerTextBox: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bannerSubtitle: {
    fontSize: 11.5,
    color: '#A7F3D0',
    marginTop: 3,
    lineHeight: 16,
  },
  bannerActionRow: {
    marginTop: 6,
  },
  bannerActionLink: {
    color: Colors.primaryGreen,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 3,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '700',
  },
  houseOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: '#26262E',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  houseOptionActive: {
    borderColor: Colors.primaryGreen,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
  },
  houseOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  houseIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#32323A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  houseIconCircleActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.18)',
  },
  houseOptionTextWrap: {
    flex: 1,
  },
  houseOptionName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  houseOptionNameActive: {
    color: Colors.primaryGreen,
  },
  houseOptionDetails: {
    color: '#9CA3AF',
    fontSize: 11.5,
    marginTop: 2,
  },
  activeHouseBadge: {
    backgroundColor: Colors.primaryGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeHouseBadgeText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
  },
  switchHouseActionText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  manageHousesLinkBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageHousesLinkText: {
    color: Colors.primaryGreen,
    fontSize: 13,
    fontWeight: '700',
  },
  checkmark: {
    color: Colors.primaryGreen,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

