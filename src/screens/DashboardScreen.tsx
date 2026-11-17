import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  Image,
} from 'react-native';
import { Colors, Typography } from '../theme';
import { useAppDispatch, useAppSelector } from '../store';
import { setActiveHouse } from '../store/authSlice';
import {
  setInventory,
  updateInventoryItemQuantity,
  updateInventoryItemDetails,
  removeInventoryItem,
  setSelectedPantryItemId,
  confirmItemExpiration,
} from '../store/inventorySlice';
import { markHouseAsRead } from '../store/houseSocialSlice';
import { addShoppingItem } from '../store/shoppingListSlice';
import { setCurrentTab, setNfcModalVisible, setPagerScrollEnabled } from '../store/hardwareSlice';
import { InventoryItem } from '../types';
import { VectorIcon } from '../components/VectorIcon';
import { ProductDetailSheet } from '../components/ProductDetailSheet';
import { ProductDepletedModal } from '../components/ProductDepletedModal';
import { ApiService } from '../services/api';
import { KitchyApiClient } from '../services/kitchyApi';
import { HapticFeedback } from '../services/haptics';
import { determineCategory } from '../utils/inventoryGrouping';
import { formatPantryQuantity } from '../utils/quantityFormatter';
import { getProductImageUrl } from './ScannerScreen';
import { SocialCollaborationService } from '../services/socialCollaborationService';

export const DashboardScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const inventoryItems = useAppSelector((state) => state.inventory.items);
  const houseSocial = useAppSelector((state) => state.houseSocial);
  const currentUserId = auth.userId || 'aleja';

  const [housePickerVisible, setHousePickerVisible] = useState(false);
  const [selectedPantryItem, setSelectedPantryItem] = useState<InventoryItem | null>(null);
  const [depletedItem, setDepletedItem] = useState<InventoryItem | null>(null);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);

  const confirmedExpirationItemIds = useAppSelector(
    (state) => state.inventory.confirmedExpirationItemIds || []
  );

  // Notificaciones de caducidad de alimentos (para productos urgentes o que requieren fecha de caducidad)
  const expiringNotificationItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      // Si el usuario ya actualizó o confirmó la fecha de caducidad, se excluye de las notificaciones
      if (
        item.hasUserSetExpiration ||
        item.expirationConfirmed ||
        confirmedExpirationItemIds.includes(item.id)
      ) {
        return false;
      }
      return (
        item.urgencyLevel === 'Red' ||
        item.urgencyLevel === 'Amber' ||
        (typeof item.remainingDays === 'number' && item.remainingDays <= 2)
      );
    });
  }, [inventoryItems, confirmedExpirationItemIds]);

  // Notificaciones compactas de mensajes de chat agrupadas por cada hogar
  const compactChatNotifications = useMemo(() => {
    const list: Array<{
      houseId: string;
      houseName: string;
      unreadCount: number;
      lastSenderName: string;
      lastMessageText: string;
    }> = [];

    auth.availableHouses.forEach((house) => {
      const houseMsgs = houseSocial.messages.filter((m) => m.houseId === house.id);
      const lastRead = houseSocial.lastReadTimestamps[house.id];

      const unread = houseMsgs.filter((m) => {
        if (m.senderId === currentUserId) return false;
        if (!lastRead) return true;
        return new Date(m.createdAt) > new Date(lastRead);
      });

      if (unread.length > 0) {
        const latestMsg = unread[unread.length - 1];
        list.push({
          houseId: house.id,
          houseName: house.name,
          unreadCount: unread.length,
          lastSenderName: latestMsg.senderName || 'Compañero',
          lastMessageText: latestMsg.content || 'Nuevo mensaje en el chat',
        });
      }
    });

    return list;
  }, [auth.availableHouses, houseSocial.messages, houseSocial.lastReadTimestamps, currentUserId]);

  const totalNotificationsCount =
    expiringNotificationItems.length + compactChatNotifications.length;

  const handleGoToSetExpiration = (item: InventoryItem) => {
    HapticFeedback.selectionAsync();
    setIsNotificationsModalOpen(false);
    dispatch(setSelectedPantryItemId(item.id));
    dispatch(setCurrentTab('pantry'));
  };

  const handleConfirmExpiration = (item: InventoryItem) => {
    HapticFeedback.selectionAsync();
    dispatch(confirmItemExpiration(item.id));
  };

  const handleGoToChat = (houseId: string) => {
    HapticFeedback.selectionAsync();
    setIsNotificationsModalOpen(false);
    dispatch(setActiveHouse(houseId));
    dispatch(markHouseAsRead(houseId));
    dispatch(setCurrentTab('social'));
  };

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

  const handlePressPantryItem = (item: InventoryItem) => {
    HapticFeedback.selectionAsync();
    setSelectedPantryItem(item);
  };

  const handleUpdateQuantity = (item: InventoryItem, newQuantity: number) => {
    dispatch(updateInventoryItemQuantity({ id: item.id, quantity: newQuantity }));
    if (selectedPantryItem && selectedPantryItem.id === item.id) {
      setSelectedPantryItem({ ...selectedPantryItem, quantity: newQuantity });
    }
    if (auth.activeHouse?.id) {
      KitchyApiClient.updateInventoryItem(auth.activeHouse.id, item.id, {
        quantity: newQuantity,
      });
    }
  };

  const handleUpdateExpiration = (item: InventoryItem, newDate: string) => {
    dispatch(
      updateInventoryItemDetails({
        id: item.id,
        changes: {
          expirationDate: newDate,
          hasUserSetExpiration: true,
          expirationConfirmed: true,
        },
      })
    );
    dispatch(confirmItemExpiration(item.id));
    if (selectedPantryItem && selectedPantryItem.id === item.id) {
      setSelectedPantryItem({
        ...selectedPantryItem,
        expirationDate: newDate,
        hasUserSetExpiration: true,
        expirationConfirmed: true,
      });
    }
    if (auth.activeHouse?.id) {
      KitchyApiClient.updateInventoryItem(auth.activeHouse.id, item.id, {
        expirationDate: newDate,
      });
    }
  };

  const handleUpdateCategory = (item: InventoryItem, newCategory: string) => {
    dispatch(updateInventoryItemDetails({ id: item.id, changes: { category: newCategory } }));
    if (selectedPantryItem && selectedPantryItem.id === item.id) {
      setSelectedPantryItem({ ...selectedPantryItem, category: newCategory });
    }
    if (auth.activeHouse?.id) {
      KitchyApiClient.updateInventoryItem(auth.activeHouse.id, item.id, {
        category: newCategory,
      });
    }
  };

  const handleDepleted = (item: InventoryItem) => {
    setSelectedPantryItem(null);
    setDepletedItem(item);
  };

  const handleConfirmDepletedAddShopping = (item: InventoryItem) => {
    dispatch(removeInventoryItem(item.id));
    dispatch(
      addShoppingItem({
        id: `depleted-${Date.now()}`,
        houseId: auth.activeHouse?.id || 'a0000000-0000-0000-0000-000000000001',
        name: item.name,
        category: item.category || determineCategory(item),
        quantity: 1,
        unit: item.unit || 'ud',
        isChecked: false,
        source: 'Manual',
        addedByUserId: auth.fullName || 'Usuario',
        createdAt: new Date().toISOString(),
      })
    );
    setDepletedItem(null);
    HapticFeedback.impactAsync();
  };

  const handleDismissDepleted = () => {
    if (depletedItem) {
      dispatch(removeInventoryItem(depletedItem.id));
    }
    setDepletedItem(null);
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

        {/* Acciones Superiores Derechas: Campanita de Notificaciones y Avatar */}
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.notificationBellBtn}
            onPress={() => {
              HapticFeedback.selectionAsync();
              setIsNotificationsModalOpen(true);
            }}
            activeOpacity={0.8}
            testID="btn-dashboard-notifications"
          >
            <VectorIcon name="bell" size={20} color="#FFFFFF" />
            {totalNotificationsCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {totalNotificationsCount > 99 ? '99+' : totalNotificationsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Avatar del usuario logueado -> Acceso directo a Mi Perfil */}
          <TouchableOpacity
            style={styles.userAvatarBtn}
            onPress={() => dispatch(setCurrentTab('profile'))}
            activeOpacity={0.8}
            testID="btn-dashboard-profile"
          >
            {auth.avatarUrl ? (
              <Image
                source={{ uri: auth.avatarUrl }}
                style={styles.userAvatarImg}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.userAvatarInitial}>
                {auth.fullName ? auth.fullName.charAt(0).toUpperCase() : 'U'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        directionalLockEnabled={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
      >
        {/* 2. Sección Urgente (Carrusel Ámbar / Semáforo de Caducidad) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Urgente</Text>
          <Text style={styles.sectionSubtitle}>
            {urgentItems.length} alimentos • 24-48 h
          </Text>
        </View>

        <ScrollView
          testID="urgent-scroll-view"
          horizontal
          nestedScrollEnabled={true}
          directionalLockEnabled={true}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          style={styles.urgentScroll}
          contentContainerStyle={styles.urgentScrollContent}
          onStartShouldSetResponderCapture={() => {
            dispatch(setPagerScrollEnabled(false));
            return false;
          }}
          onMoveShouldSetResponderCapture={() => {
            dispatch(setPagerScrollEnabled(false));
            return false;
          }}
          onTouchStart={() => dispatch(setPagerScrollEnabled(false))}
          onTouchEnd={() => dispatch(setPagerScrollEnabled(true))}
          onTouchCancel={() => dispatch(setPagerScrollEnabled(true))}
          onScrollBeginDrag={() => dispatch(setPagerScrollEnabled(false))}
          onScrollEndDrag={() => dispatch(setPagerScrollEnabled(true))}
          onMomentumScrollEnd={() => dispatch(setPagerScrollEnabled(true))}
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
                        item.imageUrl && !item.imageUrl.includes('photo-1546069901-ba9599a7e63c')
                          ? item.imageUrl
                          : getProductImageUrl(item.name, item.category),
                    }}
                    style={styles.foodRealImage}
                    resizeMode="cover"
                  />
                  <View style={styles.foodInfoTextContainer}>
                    <Text style={styles.urgentFoodTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.urgentFoodDetails}>
                      {formatPantryQuantity(item.quantity, item.unit, item.name)} • {item.location}
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
              <TouchableOpacity
                key={`${item.id}-${index}`}
                style={[styles.pantryRow, !isLast && styles.pantryRowBorder]}
                onPress={() => handlePressPantryItem(item)}
                activeOpacity={0.7}
                testID={`pantry-item-${item.id}`}
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
                        item.imageUrl && !item.imageUrl.includes('photo-1546069901-ba9599a7e63c')
                          ? item.imageUrl
                          : getProductImageUrl(item.name, item.category),
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

                {/* Cantidad y Acceso a Ficha Detallada */}
                <View style={styles.pantryActionsWrap}>
                  <View style={styles.pantryQuantityBadge}>
                    <Text style={styles.pantryQuantityText}>
                      {formatPantryQuantity(item.quantity, item.unit, item.name)}
                    </Text>
                  </View>
                  <Text style={styles.pantryRowChevron}>›</Text>
                </View>
              </TouchableOpacity>
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

      {/* Modal Ficha de Producto Detallada (Bottom Sheet con Glassmorphism) */}
      {selectedPantryItem && (
        <ProductDetailSheet
          visible={!!selectedPantryItem}
          item={selectedPantryItem}
          onClose={() => setSelectedPantryItem(null)}
          onUpdateQuantity={handleUpdateQuantity}
          onUpdateExpiration={handleUpdateExpiration}
          onDepleted={handleDepleted}
          onUpdateCategory={handleUpdateCategory}
        />
      )}

      {/* Modal de Alimento Agotado (Prompt para Lista de la Compra) */}
      {depletedItem && (
        <ProductDepletedModal
          visible={!!depletedItem}
          item={depletedItem}
          onConfirmAddToList={handleConfirmDepletedAddShopping}
          onDismiss={handleDismissDepleted}
        />
      )}

      {/* Modal de Notificaciones (Avisos de Caducidad y Chat Compacto de Hogares) */}
      <Modal
        visible={isNotificationsModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNotificationsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsNotificationsModalOpen(false)}
            testID="backdrop-notifications-modal"
          />
          <View style={styles.notificationsModalContent}>
            {/* Header del Modal */}
            <View style={styles.notifModalHeader}>
              <View style={styles.notifModalHeaderLeft}>
                <View style={styles.notifModalIconBadge}>
                  <VectorIcon name="bell" size={18} color={Colors.primaryGreen} />
                </View>
                <View>
                  <Text style={styles.notifModalTitle}>Notificaciones</Text>
                  <Text style={styles.notifModalSubtitle}>
                    Avisos de despensa y mensajes de hogar
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsNotificationsModalOpen(false)}
                style={styles.notifModalCloseBtn}
                activeOpacity={0.7}
                testID="btn-close-notifications-modal"
              >
                <Text style={styles.notifModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              testID="notifications-modal-scroll"
              style={styles.notifModalScroll}
              contentContainerStyle={styles.notifModalScrollInner}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              bounces={true}
              overScrollMode="always"
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={true}
            >
              {totalNotificationsCount === 0 ? (
                <View style={styles.notifEmptyState}>
                  <View style={styles.notifEmptyIconBadge}>
                    <VectorIcon name="check" size={28} color={Colors.primaryGreen} />
                  </View>
                  <Text style={styles.notifEmptyTitle}>Todo al día</Text>
                  <Text style={styles.notifEmptySubtitle}>
                    No tienes alimentos por caducar ni mensajes pendientes en tus hogares.
                  </Text>
                </View>
              ) : (
                <>
                  {/* SECCIÓN 1: AVISOS DE CADUCIDAD */}
                  {expiringNotificationItems.length > 0 && (
                    <View style={styles.notifSection}>
                      <View style={styles.notifSectionHeaderRow}>
                        <VectorIcon name="clock" size={13} color={Colors.urgencyAmber} />
                        <Text style={styles.notifSectionTitle}>AVISOS DE CADUCIDAD</Text>
                        <View style={styles.notifCountBadge}>
                          <Text style={styles.notifCountBadgeText}>
                            {expiringNotificationItems.length}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.notifSectionHint}>
                        Indica la fecha exacta para organizar tu consumo y evitar desperdicio.
                      </Text>

                      {expiringNotificationItems.map((item) => {
                        const isRed = item.urgencyLevel === 'Red' || item.remainingDays <= 1;
                        return (
                          <View key={`exp-${item.id}`} style={styles.notifItemCard}>
                            <View style={styles.notifItemMainRow}>
                              {item.imageUrl ? (
                                <Image
                                  source={{ uri: item.imageUrl }}
                                  style={styles.notifItemImg}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.notifItemImgPlaceholder}>
                                  <VectorIcon name="image" size={16} color="#9CA3AF" />
                                </View>
                              )}
                              <View style={styles.notifItemTextWrap}>
                                <Text style={styles.notifItemName} numberOfLines={1}>
                                  {item.name}
                                </Text>
                                <Text style={styles.notifItemLoc}>
                                  {item.location || 'En la despensa'} • {formatPantryQuantity(item.quantity, item.unit, item.name)}
                                </Text>
                                <View
                                  style={[
                                    styles.notifUrgencyPill,
                                    isRed ? styles.notifUrgencyPillRed : styles.notifUrgencyPillAmber,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.notifUrgencyText,
                                      isRed ? styles.notifUrgencyTextRed : styles.notifUrgencyTextAmber,
                                    ]}
                                  >
                                    {isRed ? 'Caduca en 24 h' : 'Caduca en 48 h'}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            <View style={styles.notifItemActionsRow}>
                              <TouchableOpacity
                                style={styles.notifConfirmBtn}
                                onPress={() => handleConfirmExpiration(item)}
                                activeOpacity={0.8}
                                testID={`btn-notif-confirm-${item.id}`}
                              >
                                <VectorIcon name="check" size={13} color={Colors.primaryGreen} />
                                <Text style={styles.notifConfirmBtnText}>Confirmar</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.notifSetDateBtn}
                                onPress={() => handleGoToSetExpiration(item)}
                                activeOpacity={0.8}
                                testID={`btn-notif-set-expiration-${item.id}`}
                              >
                                <VectorIcon name="calendar" size={13} color="#000000" />
                                <Text style={styles.notifSetDateBtnText}>
                                  Poner fecha de caducidad
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* SECCIÓN 2: MENSAJES DE HOGARES (COMPACTO) */}
                  {compactChatNotifications.length > 0 && (
                    <View style={styles.notifSection}>
                      <View style={styles.notifSectionHeaderRow}>
                        <VectorIcon name="users" size={13} color={Colors.primaryGreen} />
                        <Text style={styles.notifSectionTitle}>MENSAJES EN TUS HOGARES</Text>
                        <View style={styles.notifCountBadge}>
                          <Text style={styles.notifCountBadgeText}>
                            {compactChatNotifications.length}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.notifSectionHint}>
                        Notificaciones compactas agrupadas para no saturar tu bandeja.
                      </Text>

                      {compactChatNotifications.map((chatNotif) => (
                        <View key={`chat-${chatNotif.houseId}`} style={styles.notifChatCard}>
                          <View style={styles.notifChatTopRow}>
                            <View style={styles.notifChatHouseInfo}>
                              <VectorIcon name="house" size={15} color={Colors.primaryGreen} />
                              <Text style={styles.notifChatHouseName}>
                                {chatNotif.houseName}
                              </Text>
                            </View>
                            <View style={styles.notifChatBadge}>
                              <Text style={styles.notifChatBadgeText}>
                                {chatNotif.unreadCount}{' '}
                                {chatNotif.unreadCount === 1 ? 'nuevo' : 'nuevos'}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.notifChatSnippet} numberOfLines={2}>
                            <Text style={styles.notifChatSender}>{chatNotif.lastSenderName}: </Text>
                            {chatNotif.lastMessageText}
                          </Text>

                          <TouchableOpacity
                            style={styles.notifChatActionBtn}
                            onPress={() => handleGoToChat(chatNotif.houseId)}
                            activeOpacity={0.8}
                            testID={`btn-notif-chat-${chatNotif.houseId}`}
                          >
                            <VectorIcon name="users" size={13} color={Colors.primaryGreen} />
                            <Text style={styles.notifChatActionBtnText}>Ver conversación</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  notificationBellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E1E24',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.primaryGreen,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#121214',
  },
  bellBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Typography.bodySemiBold,
  },
  userAvatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    overflow: 'hidden',
  },
  userAvatarImg: {
    width: '100%',
    height: '100%',
  },
  userAvatarInitial: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Typography.headingSemiBold,
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
  },
  urgentScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
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
  pantryActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pantryRowChevron: {
    color: '#6B7280',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 4,
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
  notificationsModalContent: {
    width: '100%',
    maxHeight: '82%',
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  notifModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  notifModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  notifModalIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifModalTitle: {
    fontSize: 18,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  notifModalSubtitle: {
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: '#9CA3AF',
    marginTop: 2,
  },
  notifModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifModalCloseText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '700',
  },
  notifModalScroll: {
    marginTop: 12,
    flexGrow: 0,
    flexShrink: 1,
  },
  notifModalScrollInner: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  notifEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  notifEmptyIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  notifEmptyTitle: {
    fontSize: 17,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  notifEmptySubtitle: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  notifSection: {
    marginBottom: 20,
  },
  notifSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  notifSectionTitle: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '800',
    color: '#E5E7EB',
    letterSpacing: 0.5,
  },
  notifCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  notifCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  notifSectionHint: {
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  notifItemCard: {
    backgroundColor: '#26262E',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  notifItemMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notifItemImg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1E1E24',
    marginRight: 12,
  },
  notifItemImgPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1E1E24',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifItemTextWrap: {
    flex: 1,
  },
  notifItemName: {
    fontSize: 14.5,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notifItemLoc: {
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: '#9CA3AF',
    marginTop: 2,
    marginBottom: 4,
  },
  notifUrgencyPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  notifUrgencyPillRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
  },
  notifUrgencyPillAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
  },
  notifUrgencyText: {
    fontSize: 10.5,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
  },
  notifUrgencyTextRed: {
    color: '#EF4444',
  },
  notifUrgencyTextAmber: {
    color: '#F59E0B',
  },
  notifItemActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  notifConfirmBtnText: {
    color: Colors.primaryGreen,
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
  },
  notifSetDateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryGreen,
    paddingVertical: 9,
    borderRadius: 10,
  },
  notifSetDateBtnText: {
    color: '#000000',
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '800',
  },
  notifChatCard: {
    backgroundColor: '#26262E',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  notifChatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notifChatHouseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  notifChatHouseName: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notifChatBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.18)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.35)',
  },
  notifChatBadgeText: {
    color: Colors.primaryGreen,
    fontSize: 10.5,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '800',
  },
  notifChatSnippet: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: '#9CA3AF',
    lineHeight: 17,
    marginBottom: 12,
  },
  notifChatSender: {
    color: '#D1D5DB',
    fontWeight: '700',
  },
  notifChatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  notifChatActionBtnText: {
    color: Colors.primaryGreen,
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '700',
  },
});

