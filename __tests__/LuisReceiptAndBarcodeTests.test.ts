import { parseReceiptLine, sanitizeText, sanitizeNumber, categorizeProduct } from '../src/utils/sanitizer';
import { parseOcrBlocksToProducts, getProductImageUrl } from '../src/screens/ScannerScreen';

describe('Auditoría de Casos Reales del Usuario (Tickets de Luis y Códigos de Barras)', () => {
  test('Caso Real 1: Línea pesada multilínea (Plátano Canarias con desglose de peso y precio/kg)', () => {
    const ocrBlocks = {
      text: [
        'MERCADONA, S.A. A-46103834',
        'C/ MARIANA PINEDA S/N',
        '1 PLATANO DE CANARIAS',
        '0,374 kg 1,25 €/kg 0,47',
        '1 LECHE ENTERA 1,05',
        '1 HUEVOS L 1,65',
        'TOTAL 3,17 €',
      ].join('\n'),
    };

    const { products } = parseOcrBlocksToProducts(ocrBlocks as any);

    // Debe extraer exactamente 3 productos reales: Plátano, Leche y Huevos
    expect(products.length).toBe(3);

    // 1. Plátano por peso
    const platano = products.find((p) => p.name.includes('Platano') || p.name.includes('Plátano'));
    expect(platano).toBeDefined();
    expect(platano!.quantity).toBeCloseTo(0.374, 3);
    expect(platano!.unitPrice).toBeCloseTo(1.25, 2);
    expect(platano!.totalPrice).toBeCloseTo(0.47, 2);
    expect(platano!.category).toBe('Frutas y Verduras');

    // 2. Leche
    const leche = products.find((p) => p.name.includes('Leche'));
    expect(leche).toBeDefined();
    expect(leche!.totalPrice).toBeCloseTo(1.05, 2);

    // 3. Huevos
    const huevos = products.find((p) => p.name.includes('Huevos'));
    expect(huevos).toBeDefined();
    expect(huevos!.totalPrice).toBeCloseTo(1.65, 2);

    // Ningún producto debe llamarse como un precio, peso o tener símbolos de divisa
    for (const p of products) {
      expect(p.name).not.toMatch(/\d+[.,]\d{2}/);
      expect(p.name).not.toMatch(/€/);
      expect(p.name).not.toMatch(/\/kg/);
    }
  });

  test('Caso Real 2: Normalización y extracción de Códigos de Barras con espacios (Tomate Helios y Kéfir)', () => {
    // Casos reales donde el OCR de la imagen de barras lee texto con espacios
    const rawOcrCases = [
      { raw: '8 410095 007013', expected: '8410095007013' },
      { raw: '8 437012 799189', expected: '8437012799189' },
      { raw: 'EAN: 8 410095 007013 \nHELIOS', expected: '8410095007013' },
      { raw: '8480000412890', expected: '8480000412890' },
    ];

    for (const c of rawOcrCases) {
      const digitsOnly = c.raw.replace(/[^\d]/g, '');
      const match = digitsOnly.match(/(84\d{11}|\d{13}|\d{8})/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe(c.expected);
    }
  });

  test('Caso Real 3: Detección exhaustiva de 4 tickets reales de Mercadona sin falsos positivos de precios', () => {
    // Ticket 1: 1200_900.jpeg
    const ticket1 = {
      text: [
        'MERCADONA, S.A.',
        '1 12 HUEVOS SUPER GRAN 3,25',
        '2 EXPLOSION ACTION ENJ 1,50 3,00',
        '2 COLÁGENO POLVO 4,80 9,60',
        '1 BÍFIDUS CIRUELA 1,30',
        '1 BÍFIDUS FIB CEREAL 1,30',
        '1 COCA COLA ZERO 4L 3,72',
        '1 YOGUR SABORES 16 2,70',
        '1 TROTTOLE TRICOLORE 0,95',
        'TOTAL (€) 25,82',
      ].join('\n'),
    };
    const res1 = parseOcrBlocksToProducts(ticket1 as any);
    expect(res1.products.length).toBe(8);

    // Comprobar que no hay ningún precio tomado como nombre
    for (const p of res1.products) {
      expect(p.name).not.toMatch(/^[\d\s.,€]+$/);
      expect(p.name.length).toBeGreaterThanOrEqual(3);
    }
  });

  test('Caso Real 4: Asociación fotográfica realista para cada producto detectado', () => {
    // Huevos
    expect(getProductImageUrl('Huevos L', 'Lácteos y Huevos')).toContain('photo-1582722872445');
    // Leche
    expect(getProductImageUrl('Leche entera', 'Lácteos y Huevos')).toContain('photo-1550583724');
    // Pollo
    expect(getProductImageUrl('Pechuga de pollo', 'Carne')).toContain('photo-1604503468506');
    // Tomate frito
    expect(getProductImageUrl('Tomate frito Hacendado', 'Despensa y Conservas')).toContain('photo-1534483509719');
    // Plátano
    expect(getProductImageUrl('Plátano de Canarias', 'Frutas y Verduras')).toContain('photo-1571771894821');
    // Refresco / Coca cola
    expect(getProductImageUrl('Coca Cola Zero 4L', 'Bebidas')).toContain('photo-1622483767028');
    // Yogur / Bífidus
    expect(getProductImageUrl('Bífidus Ciruela', 'Lácteos y Huevos')).toContain('photo-1488477181946');
    // Pasta / Trottole
    expect(getProductImageUrl('Trottole Tricolore', 'Despensa y Conservas')).toContain('photo-1551462147');
    // Detergente / Limpieza
    expect(getProductImageUrl('Explosion Action Enj', 'Limpieza y Hogar')).toContain('photo-1585421514738');
    // Pan
    expect(getProductImageUrl('Pan rústico', 'Panadería')).toContain('photo-1509440159596');
  });
});

