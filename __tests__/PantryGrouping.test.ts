import { groupInventoryByCategory, determineCategory } from '../src/utils/inventoryGrouping';
import { InventoryItem } from '../src/types';

describe('PantryGrouping: Agrupamiento estructurado por categorías de despensa', () => {
  const sampleItems: InventoryItem[] = [
    {
      id: 'item-1',
      houseId: 'house-1',
      name: 'Pechuga de pollo',
      quantity: 1,
      unit: '500 g',
      expirationDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      location: 'En la nevera',
      price: 3.60,
      purchaseDate: new Date().toISOString(),
      addedByUserId: 'Alejandro',
      urgencyLevel: 'Red',
      remainingDays: 1,
      imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200',
    },
    {
      id: 'item-2',
      houseId: 'house-1',
      name: 'Huevos L',
      quantity: 1,
      unit: 'caja 6 ud',
      expirationDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      location: 'En la nevera',
      price: 1.65,
      purchaseDate: new Date().toISOString(),
      addedByUserId: 'Alejandro',
      urgencyLevel: 'Amber',
      remainingDays: 2,
      imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200',
    },
    {
      id: 'item-3',
      houseId: 'house-1',
      name: 'Leche entera',
      quantity: 1,
      unit: '1 l',
      expirationDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      location: 'En la nevera',
      price: 1.05,
      purchaseDate: new Date().toISOString(),
      addedByUserId: 'Alejandro',
      urgencyLevel: 'Green',
      remainingDays: 7,
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200',
    },
    {
      id: 'item-4',
      houseId: 'house-1',
      name: 'Tomate frito Hacendado',
      quantity: 2,
      unit: 'ud',
      expirationDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      location: 'Despensa',
      price: 0.85,
      purchaseDate: new Date().toISOString(),
      addedByUserId: 'Alejandro',
      urgencyLevel: 'Green',
      remainingDays: 30,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200',
    },
    {
      id: 'item-5',
      houseId: 'house-1',
      name: 'Detergente lavadora',
      quantity: 1,
      unit: 'botella',
      expirationDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      location: 'Armario',
      price: 4.20,
      purchaseDate: new Date().toISOString(),
      addedByUserId: 'Alejandro',
      urgencyLevel: 'Green',
      remainingDays: 365,
    },
  ];

  test('determineCategory identifies correct food categories without emojis (Carne, Pescado, Lácteos)', () => {
    expect(determineCategory(sampleItems[0])).toBe('Carne');
    expect(determineCategory({ name: 'Merluza congelada', location: 'Congelador' })).toBe('Pescado');
    expect(determineCategory(sampleItems[1])).toBe('Lácteos y Huevos');
    expect(determineCategory(sampleItems[2])).toBe('Lácteos y Huevos');
    expect(determineCategory(sampleItems[3])).toBe('Frutas y Verduras');
    expect(determineCategory(sampleItems[4])).toBe('Limpieza y Hogar');
  });

  test('groupInventoryByCategory groups products into structured array', () => {
    const groups = groupInventoryByCategory(sampleItems);

    expect(Array.isArray(groups)).toBe(true);
    expect(groups.length).toBeGreaterThanOrEqual(3);

    const meatGroup = groups.find((g) => g.category === 'Carne');
    expect(meatGroup).toBeDefined();
    expect(meatGroup?.items.some((i) => i.name === 'Pechuga de pollo')).toBe(true);

    const dairyGroup = groups.find((g) => g.category === 'Lácteos y Huevos');
    expect(dairyGroup).toBeDefined();
    expect(dairyGroup?.items.length).toBe(2);
    expect(dairyGroup?.items.some((i) => i.name === 'Huevos L')).toBe(true);
    expect(dairyGroup?.items.some((i) => i.name === 'Leche entera')).toBe(true);

    const cleaningGroup = groups.find((g) => g.category === 'Limpieza y Hogar');
    expect(cleaningGroup).toBeDefined();
    expect(cleaningGroup?.items[0].name).toBe('Detergente lavadora');
  });

  test('groupInventoryByCategory handles empty inventory gracefully', () => {
    const groups = groupInventoryByCategory([]);
    expect(groups).toEqual([]);
  });

  test('sorts items alphabetically within each category group', () => {
    const items: InventoryItem[] = [
      {
        id: '1',
        houseId: 'h1',
        name: 'Yogur natural',
        quantity: 4,
        unit: 'ud',
        expirationDate: '',
        location: 'Nevera',
        price: 1,
        purchaseDate: '',
        addedByUserId: 'ale',
        urgencyLevel: 'Green',
        remainingDays: 5,
      },
      {
        id: '2',
        houseId: 'h1',
        name: 'Cuajada fresca',
        quantity: 2,
        unit: 'ud',
        expirationDate: '',
        location: 'Nevera',
        price: 1,
        purchaseDate: '',
        addedByUserId: 'ale',
        urgencyLevel: 'Green',
        remainingDays: 5,
      },
    ];

    const groups = groupInventoryByCategory(items);
    const dairy = groups.find((g) => g.category === 'Lácteos y Huevos' || g.category === 'Refrigerados');
    expect(dairy).toBeDefined();
    expect(dairy?.items[0].name).toBe('Cuajada fresca');
    expect(dairy?.items[1].name).toBe('Yogur natural');
  });
});

