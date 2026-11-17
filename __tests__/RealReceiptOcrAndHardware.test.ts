import { parseReceiptLine, sanitizeText, sanitizeNumber, categorizeProduct } from '../src/utils/sanitizer';

describe('Pruebas Exhaustivas de Hardware OCR y Tickets Reales de Supermercado', () => {
  test('Caso Real 1: Ticket Mercadona con líneas de doble precio (P.Unit e Importe Total)', () => {
    const rawLines = [
      'MERCADONA, S.A. A-46103834',
      'C/ MARIANA PINEDA S/N',
      '18690 ALMUÑÉCAR',
      'TELÉFONO: 958633498',
      '29/09/2023 12:32 OP: 259058',
      'FACTURA SIMPLIFICADA: 2186-013-276410',
      'Descripción P. Unit Importe',
      '1 12 HUEVOS SUPER GRAN 3,25',
      '2 EXPLOSION ACTION ENJ 1,50 3,00',
      '2 COLÁGENO POLVO 4,80 9,60',
      '1 BÍFIDUS CIRUELA 1,30',
      '1 BÍFIDUS FIB CEREAL 1,30',
      '1 COCA COLA ZERO 4L 3,72',
      '1 YOGUR SABORES 16 2,70',
      '1 TROTTOLE TRICOLORE 0,95',
      'TOTAL (€) 25,82',
      'TARJETA BANCARIA 25,82',
      'IVA BASE IMPONIBLE (€) CUOTA (€)',
      '10% 13,55 1,35',
      '21% 5,55 1,17',
      '5% 0,90 0,05',
      '0% 3,25 0,00',
      'TOTAL 23,25 2,57',
      'TARJ. BANCARIA: **** **** **** 1037',
    ];

    const parsedProducts: any[] = [];
    for (const line of rawLines) {
      const parsed = parseReceiptLine(line);
      if (parsed) {
        parsedProducts.push(parsed);
      }
    }

    // Debe extraer exactamente los 8 productos alimentarios
    expect(parsedProducts.length).toBe(8);

    // Verificaciones específicas de que no hay precios como nombres
    for (const p of parsedProducts) {
      expect(p.name).not.toMatch(/^[\d\s.,€]+$/);
      expect(p.name.length).toBeGreaterThanOrEqual(3);
      expect(p.totalPrice).toBeGreaterThan(0);
    }

    // Verificación exacta de los productos clave
    expect(parsedProducts.some((p) => p.name.includes('Huevos') && p.totalPrice === 3.25)).toBe(true);
    expect(parsedProducts.some((p) => p.name.includes('Explosion') && p.quantity === 2 && p.totalPrice === 3.00)).toBe(true);
    expect(parsedProducts.some((p) => p.name.includes('Colágeno') && p.quantity === 2 && p.totalPrice === 9.60)).toBe(true);
    expect(parsedProducts.some((p) => p.name.includes('Bífidus') && p.totalPrice === 1.30)).toBe(true);
    expect(parsedProducts.some((p) => p.name.includes('Coca Cola') && p.totalPrice === 3.72)).toBe(true);
    expect(parsedProducts.some((p) => p.name.includes('Yogur') && p.totalPrice === 2.70)).toBe(true);
    expect(parsedProducts.some((p) => p.name.includes('Trottole') && p.totalPrice === 0.95)).toBe(true);

    // Suma total calculada debe ser exactamente 25.82 €
    const sum = parsedProducts.reduce((acc, curr) => acc + curr.totalPrice, 0);
    expect(sum).toBeCloseTo(25.82, 2);
  });

  test('Caso Real 2: Ticket impreso en mesa (Imagen de prueba del usuario)', () => {
    const rawLines = [
      'MERCADONA',
      'MERCADONA, S.A. A-46103834',
      'C/ Gran Vía Parque, 18 - Córdoba',
      '2 TOMATE FRITO HACENDADO 1,70',
      '1 HUEVOS L (6 UD) 1,65',
      '1 PECHUGA POLLO 500 G 3,60',
      '1 LECHE ENTERA 1 L 1,05',
      'TOTAL 8,00 €',
    ];

    const parsedProducts: any[] = [];
    for (const line of rawLines) {
      const parsed = parseReceiptLine(line);
      if (parsed) {
        parsedProducts.push(parsed);
      }
    }

    expect(parsedProducts.length).toBe(4);

    expect(parsedProducts[0].name).toContain('Tomate Frito');
    expect(parsedProducts[0].quantity).toBe(2);
    expect(parsedProducts[0].totalPrice).toBe(1.70);

    expect(parsedProducts[1].name).toContain('Huevos L');
    expect(parsedProducts[1].totalPrice).toBe(1.65);

    expect(parsedProducts[2].name).toContain('Pechuga Pollo');
    expect(parsedProducts[2].totalPrice).toBe(3.60);

    expect(parsedProducts[3].name).toContain('Leche Entera');
    expect(parsedProducts[3].totalPrice).toBe(1.05);

    const sum = parsedProducts.reduce((acc, curr) => acc + curr.totalPrice, 0);
    expect(sum).toBeCloseTo(8.00, 2);
  });

  test('Seguridad OCR: Los números, impuestos y subtotales se descartan estrictamente sin convertirse en alimentos', () => {
    const badLines = [
      '1,50 3,00',
      '3,25',
      '25,82 €',
      '10% 13,55 1,35',
      '21% 5,55 1,17',
      'TOTAL 23,25 2,57',
      'TARJETA BANCARIA 25,82',
      'FACTURA SIMPLIFICADA',
      'TEL: 958633498',
      'IVA',
      'BASE IMPONIBLE',
    ];

    for (const bad of badLines) {
      const res = parseReceiptLine(bad);
      expect(res).toBeNull();
    }
  });
});

