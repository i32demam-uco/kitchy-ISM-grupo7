import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { HouseMessageActionMetadata } from '../types';
import { Colors } from '../theme';
import { VectorIcon } from './VectorIcon';
import { useAppDispatch } from '../store';
import { setCurrentTab } from '../store/hardwareSlice';

interface SystemActivityCardProps {
  metadata?: HouseMessageActionMetadata;
  content: string;
  createdAt: string;
  onViewPantry?: () => void;
}

export const SystemActivityCard: React.FC<SystemActivityCardProps> = ({
  metadata,
  content,
  createdAt,
  onViewPantry,
}) => {
  const dispatch = useAppDispatch();
  const [isExpanded, setIsExpanded] = useState(true);

  const actionType = metadata?.actionType || 'CONSUMED';
  const isConsumed = actionType === 'CONSUMED';
  const isScanOrAdded = actionType === 'SCANNED_TICKET' || actionType === 'ADDED_MANUAL';

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleNavigatePantry = () => {
    if (onViewPantry) {
      onViewPantry();
    } else {
      dispatch(setCurrentTab('pantry'));
    }
  };

  // 1. Tarjeta de Gasto de Despensa (Consumo de Alimentos)
  if (isConsumed) {
    const primaryProduct = metadata?.affectedProducts?.[0];
    const fallbackImage =
      primaryProduct?.imageUrl ||
      'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200'; // Huevos / general

    return (
      <View style={styles.cardContainer} testID="system-activity-card-consumed">
        <View style={styles.headerRow}>
          <View style={styles.iconBadgeConsumed}>
            <VectorIcon name="trash" size={14} color="#FF5252" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.actionCategoryText}>Gasto de Despensa</Text>
            <Text style={styles.timestampText}>{formatTime(createdAt)}</Text>
          </View>
        </View>

        <View style={styles.consumedContentRow}>
          <Image
            source={{ uri: fallbackImage }}
            style={styles.foodThumbnail}
            resizeMode="cover"
          />
          <View style={styles.consumedDetails}>
            <Text style={styles.summaryTitle} numberOfLines={2}>
              {content}
            </Text>
            {metadata?.stockRemaining !== undefined && (
              <View style={styles.stockBadge}>
                <VectorIcon name="layers" size={11} color={Colors.primaryGreen} />
                <Text style={styles.stockBadgeText}>
                  {`Stock restante: ${metadata.stockRemaining} ${primaryProduct?.unit || 'ud'}`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  // 2. Tarjeta de Compra / Escaneo OCR o Barcode
  const products = metadata?.affectedProducts || [];
  const storeLabel = metadata?.storeName ? ` (${metadata.storeName})` : '';

  return (
    <View style={styles.cardContainer} testID="system-activity-card-scan">
      <View style={styles.headerRow}>
        <View style={styles.iconBadgeScan}>
          <VectorIcon name="shopping-bag" size={14} color={Colors.primaryGreen} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.actionCategoryText}>
            {`Nueva Compra Añadida${storeLabel}`}
          </Text>
          <Text style={styles.timestampText}>{formatTime(createdAt)}</Text>
        </View>
        <TouchableOpacity
          style={styles.collapseToggle}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <VectorIcon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#9CA3AF"
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.summaryTitle}>{content}</Text>

      {/* Miniaturas de productos detectados y añadidos */}
      {isExpanded && products.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productsScrollRow}
        >
          {products.map((item, idx) => (
            <View key={idx} style={styles.productPillCard}>
              <Image
                source={{
                  uri:
                    item.imageUrl ||
                    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200',
                }}
                style={styles.productSmallThumb}
                resizeMode="cover"
              />
              <Text style={styles.productPillName} numberOfLines={1}>
                {item.productName}
              </Text>
              <Text style={styles.productPillQty}>
                {`+${item.quantity} ${item.unit}`}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Botón de acceso rápido a la despensa */}
      <TouchableOpacity
        style={styles.viewPantryBtn}
        onPress={handleNavigatePantry}
        activeOpacity={0.8}
        testID="btn-view-in-pantry"
      >
        <Text style={styles.viewPantryBtnText}>Ver en Despensa</Text>
        <VectorIcon name="chevron-right" size={13} color={Colors.primaryGreen} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBadgeConsumed: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconBadgeScan: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  actionCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E0E0E0',
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timestampText: {
    fontSize: 10,
    color: '#8E8E93',
    fontFamily: 'Inter-Regular',
    marginTop: 1,
  },
  collapseToggle: {
    padding: 4,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: 'Inter-Medium',
    lineHeight: 20,
    marginBottom: 8,
  },
  consumedContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  foodThumbnail: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    marginRight: 12,
  },
  consumedDetails: {
    flex: 1,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryGreen,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  productsScrollRow: {
    paddingVertical: 8,
    gap: 8,
  },
  productPillCard: {
    width: 104,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  productSmallThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    marginBottom: 6,
  },
  productPillName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 2,
  },
  productPillQty: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primaryGreen,
    fontFamily: 'Inter-SemiBold',
  },
  viewPantryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 6,
    marginTop: 4,
  },
  viewPantryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryGreen,
    fontFamily: 'Poppins-SemiBold',
    marginRight: 4,
  },
});
