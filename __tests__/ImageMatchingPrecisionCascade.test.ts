/**
 * ImageMatchingPrecisionCascade.test.ts
 * 
 * Test Unitario de Verificación Crítica de Precisión Semántica en Matching de Imágenes:
 * 1. Falsos Positivos: Verifica que "Queso curado" NUNCA reciba imágenes de huevos.
 * 2. Granularidad: Verifica que "Pan de molde" y "Pan de Viena" reciban fotografías distintas y específicas.
 * 3. Platos Locales: Verifica que "Salmorejo Hacendado" devuelva el envase de Open Food Facts o el plato cordobés tradicional.
 */

import { ImageMatchingService } from '../src/services/imageMatchingService';
import { getProductImageUrl } from '../src/screens/ScannerScreen';

describe('ImageMatchingService - Cascada Semántica de Alta Precisión', () => {
  const EGGS_IMAGE_URL = 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f';

  test('Array crítico requerido por usuario: ["Queso curado", "Pan de molde", "Salmorejo Hacendado"]', () => {
    const testProducts = ['Queso curado', 'Pan de molde', 'Salmorejo Hacendado'];

    console.log('\n======================================================================');
    console.log('--- TEST CRÍTICO DE MATCHING DE IMÁGENES: PRECISIÓN EN PRODUCCIÓN ---');
    console.log('======================================================================');

    const results = testProducts.map((productName) => {
      const match = ImageMatchingService.matchProductImage(productName);
      console.log(`\n[Producto Auditado]: "${productName}"`);
      console.log(`  -> Fuente en Cascada: [${match.source}]`);
      console.log(`  -> Término Reconocido: "${match.matchedTerm}"`);
      if (match.translatedSubtype) {
        console.log(`  -> Subtipo Traducido (Paso 2): "${match.translatedSubtype}"`);
      }
      console.log(`  -> URL Asignada: ${match.imageUrl}`);
      console.log(`  -> Nivel de Confianza: ${(match.confidence * 100).toFixed(0)}%`);
      return { productName, ...match };
    });

    console.log('\n======================================================================\n');

    // 1. Verificación para "Queso curado" (Cero Falsos Positivos de Huevos)
    const quesoResult = results.find((r) => r.productName === 'Queso curado')!;
    expect(quesoResult).toBeDefined();
    expect(quesoResult.imageUrl).toBeTruthy();
    expect(quesoResult.imageUrl).not.toContain('photo-1582722872445-44dc5f7e3c8f'); // NO DEBE SER HUEVOS
    expect(quesoResult.imageUrl).toContain('photo-1452195100486-9cc805987862'); // Cuña de queso curado
    expect(quesoResult.source).toBe('ContextualTranslation');
    expect(quesoResult.translatedSubtype).toBe('cured cheese wedge with rind');

    // 2. Verificación para "Pan de molde" (Granularidad Específica)
    const panMoldeResult = results.find((r) => r.productName === 'Pan de molde')!;
    expect(panMoldeResult).toBeDefined();
    expect(panMoldeResult.imageUrl).toBeTruthy();
    // Puede ser OpenFoodFacts o ContextualTranslation de pan de molde
    expect(
      panMoldeResult.source === 'OpenFoodFacts' ||
        panMoldeResult.source === 'ContextualTranslation'
    ).toBe(true);

    // 3. Verificación para "Salmorejo Hacendado" (Platos Locales de Supermercado)
    const salmorejoResult = results.find((r) => r.productName === 'Salmorejo Hacendado')!;
    expect(salmorejoResult).toBeDefined();
    expect(salmorejoResult.imageUrl).toBeTruthy();
    expect(
      salmorejoResult.source === 'OpenFoodFacts' ||
        salmorejoResult.source === 'SpanishGastronomicDictionary'
    ).toBe(true);
  });

  test('Falta de Granularidad: "Pan de molde" vs "Pan de Viena" reciben fotografías diferentes', () => {
    const panMolde = ImageMatchingService.matchProductImage('Pan de molde');
    const panViena = ImageMatchingService.matchProductImage('Pan de Viena');
    const baguette = ImageMatchingService.matchProductImage('Barra de pan');

    console.log('[Granularidad Panes]');
    console.log(`  "Pan de molde" -> ${panMolde.translatedSubtype} (${panMolde.imageUrl})`);
    console.log(`  "Pan de Viena" -> ${panViena.translatedSubtype} (${panViena.imageUrl})`);
    console.log(`  "Barra de pan" -> ${baguette.translatedSubtype} (${baguette.imageUrl})`);

    // Las URLs de Pan de molde y Pan de Viena NO deben ser iguales
    expect(panMolde.imageUrl).not.toEqual(panViena.imageUrl);
    expect(panViena.imageUrl).not.toEqual(baguette.imageUrl);
    expect(panMolde.translatedSubtype).toBe('sliced sandwich bread loaf');
    expect(panViena.translatedSubtype).toBe('vienna loaf rolls');
  });

  test('Falsos Positivos: "Queso curado" y "Huevos" reciben imágenes estrictamente distintas', () => {
    const queso = ImageMatchingService.matchProductImage('Queso curado', 'Lácteos y Huevos');
    const huevos = ImageMatchingService.matchProductImage('Huevos camperos L', 'Lácteos y Huevos');

    console.log('[Anti Falsos Positivos]');
    console.log(`  "Queso curado" -> ${queso.matchedTerm} (${queso.imageUrl})`);
    console.log(`  "Huevos camperos L" -> ${huevos.matchedTerm} (${huevos.imageUrl})`);

    // Queso jamás debe tener la URL de huevos
    expect(queso.imageUrl).not.toContain(EGGS_IMAGE_URL);
    expect(huevos.imageUrl).toContain(EGGS_IMAGE_URL);
    expect(queso.imageUrl).not.toEqual(huevos.imageUrl);
  });

  test('Diccionario Gastronómico Español: Platos preparados locales devuelven plato terminado', () => {
    const platos = [
      { name: 'Salmorejo Mercadona', expectedTerm: 'salmorejo' },
      { name: 'Gazpacho andaluz', expectedTerm: 'gazpacho' },
      { name: 'Croquetas de jamón', expectedTerm: 'croquetas' },
      { name: 'Paella valenciana', expectedTerm: 'paella' },
      { name: 'Tortilla de patatas casera', expectedTerm: 'tortilla' },
    ];

    platos.forEach(({ name }) => {
      const match = ImageMatchingService.matchProductImage(name);
      console.log(`[Plato Típico Español]: "${name}" -> Fuente: [${match.source}] -> ${match.imageUrl}`);
      expect(
        match.source === 'SpanishGastronomicDictionary' ||
          match.source === 'OpenFoodFacts'
      ).toBe(true);
      expect(match.imageUrl).toMatch(/^https:\/\//);
    });
  });

  test('Integración con getProductImageUrl de ScannerScreen', () => {
    const urlQueso = getProductImageUrl('Queso curado');
    const urlMolde = getProductImageUrl('Pan de molde');
    const urlSalmorejo = getProductImageUrl('Salmorejo Hacendado');

    expect(urlQueso).not.toContain('photo-1582722872445-44dc5f7e3c8f'); // NO huevos
    expect(urlQueso).toContain('photo-1452195100486-9cc805987862');
    expect(urlMolde).toBeTruthy();
    expect(urlSalmorejo).toBeTruthy();
  });

  test('Garantía de Foto para Agua Fría y Bebidas (Sin fotos de regalo ni placeholders rotos)', () => {
    const aguaFrio = ImageMatchingService.matchProductImage('Agua Frio');
    const aguaFria = ImageMatchingService.matchProductImage('Agua Fría');
    const cocaColaZero = ImageMatchingService.matchProductImage('Coca-Cola Zero Zero');
    const cerveza = ImageMatchingService.matchProductImage('Cerveza Mahou');

    // Agua Frio debe apuntar a la botella de agua mineral con gotas frías (photo-1550505095)
    expect(aguaFrio.imageUrl).toContain('photo-1550505095-81378a674395');
    expect(aguaFria.imageUrl).toContain('photo-1550505095-81378a674395');
    // Nunca más regalo ni cuenco de ensalada genérico
    expect(aguaFrio.imageUrl).not.toContain('photo-1549465220-1a8b9238cd48'); // Caja regalo
    expect(aguaFrio.imageUrl).not.toContain('photo-1546069901-ba9599a7e63c'); // Cuenco ensalada

    expect(cocaColaZero.imageUrl).toContain('photo-1622483767028-3f66f32aef97');
    expect(cerveza.imageUrl).toContain('photo-1600565193348-f74bd3c7ccdf');
  });

  test('Cobertura Integral de Despensa: Productos de diversas categorías resuelven a fotos específicas', () => {
    const staples = [
      { name: 'Arroz redondo', expectedSource: 'ContextualTranslation' },
      { name: 'Lentejas pardinas', expectedSource: 'ContextualTranslation' },
      { name: 'Pechuga de pollo', expectedSource: 'ContextualTranslation' },
      { name: 'Filete de salmón', expectedSource: 'ContextualTranslation' },
      { name: 'Manzanas golden', expectedSource: 'ContextualTranslation' },
      { name: 'Plátano de Canarias', expectedSource: 'ContextualTranslation' },
      { name: 'Yogur natural', expectedSource: 'ContextualTranslation' },
      { name: 'Galletas María', expectedSource: 'ContextualTranslation' },
      { name: 'Atún claro en aceite de oliva', expectedSource: 'ContextualTranslation' },
      { name: 'Pizza margarita', expectedSource: 'ContextualTranslation' },
    ];

    staples.forEach(({ name, expectedSource }) => {
      const match = ImageMatchingService.matchProductImage(name);
      expect(match.imageUrl).toBeTruthy();
      expect(match.imageUrl).toMatch(/^https:\/\//);
      // Ningún staple reconocido debe caer en el fallback genérico de ensalada
      expect(match.imageUrl).not.toContain('photo-1546069901-ba9599a7e63c');
      expect(match.source).toBe(expectedSource);
    });
  });
});

