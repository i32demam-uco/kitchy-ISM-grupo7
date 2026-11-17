/**
 * Formatea la cantidad y unidad de los alimentos en la despensa
 * siguiendo las directrices de UX de Kitchy:
 * 
 * - Si es más de una unidad con volumen: "2x1L", "6x1L", "2x1.5L".
 * - Si es una unidad con volumen: "1L", "1.5L", "330ml".
 * - Si es yogurt o lácteos individuales: "6 ud.", "4 ud.", "1 ud." (indicando unidades restantes).
 * - Si son unidades generales o huevos: "6 ud.", "12 ud.", "1 ud."
 * - Si es peso directo (ej. 500g): "500 g".
 */
export function formatPantryQuantity(
  quantity: number,
  rawUnit?: string,
  productName?: string
): string {
  const q = Number(quantity);
  const u = (rawUnit || '').trim().toLowerCase();
  const name = (productName || '').trim().toLowerCase();

  if (isNaN(q) || q <= 0) {
    return '0 ud.';
  }

  // 1. Detección especial de Yogur / Bífidus / Postres lácteos
  if (
    name.includes('yogur') ||
    name.includes('bifidus') ||
    name.includes('bífidus') ||
    name.includes('natilla') ||
    name.includes('postre') ||
    name.includes('flan') ||
    name.includes('cuajada') ||
    name.includes('kefir') ||
    name.includes('kéfir')
  ) {
    return q === 1 ? '1 ud.' : `${q} ud.`;
  }

  // 2. Peso directo (ej: 500 g, 250 g)
  if (u === 'g' || u === 'gr' || u === 'gramos') {
    if (q >= 10) {
      return `${q} g`;
    }
    return q === 1 ? '500 g' : `${q}x500g`;
  }

  // 3. Volúmenes específicos con número (ej: "1.5l", "1.5 l", "330ml", "250cl", "2l", "1l", "1 l")
  const volumeMatch = u.match(/^(\d+(?:[.,]\d+)?)\s*(l|litros?|ml|cl)$/i);
  if (volumeMatch) {
    const volAmount = volumeMatch[1].replace(',', '.');
    const volMetric = volumeMatch[2].toLowerCase();
    const metricStr = volMetric.startsWith('l') ? 'L' : volMetric;
    const formattedVol = `${volAmount}${metricStr}`;
    if (q === 1) {
      return formattedVol;
    }
    return `${q}x${formattedVol}`;
  }

  // 4. Productos líquidos o con unidad en litros (Leche, Agua, Refresco, Aceite, Zumo, Cerveza, etc.)
  const isLiquidProduct =
    name.includes('leche') ||
    name.includes('agua') ||
    name.includes('coca') ||
    name.includes('cola') ||
    name.includes('zumo') ||
    name.includes('cerveza') ||
    name.includes('aceite') ||
    name.includes('refresco') ||
    name.includes('fanta') ||
    name.includes('sprite') ||
    name.includes('aquarius') ||
    name.includes('nestea') ||
    name.includes('vino') ||
    name.includes('caldo');

  if (
    u === 'l' ||
    u === 'litro' ||
    u === 'litros' ||
    u === '1l' ||
    u === '1 l' ||
    (isLiquidProduct && (u === 'ud' || u === 'ud.' || u === '1 ud' || !u))
  ) {
    if (q === 1) {
      return '1L';
    }
    return `${q}x1L`;
  }

  // 5. Pesos especificados en la unidad (ej: "1kg", "500g", "250g")
  const weightMatch = u.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|gr)$/i);
  if (weightMatch) {
    const wAmount = weightMatch[1].replace(',', '.');
    const wMetric = weightMatch[2].toLowerCase();
    const formattedW = `${wAmount} ${wMetric}`;
    if (q === 1) {
      return formattedW;
    }
    return `${q}x${formattedW}`;
  }

  // 6. Unidades / Conteo general (Huevos, Tomates, Latas, Conservas, etc.)
  if (
    u === 'ud' ||
    u === 'ud.' ||
    u === 'unidades' ||
    u === 'unidad' ||
    u === '1 ud' ||
    name.includes('huevo') ||
    !u
  ) {
    return q === 1 ? '1 ud.' : `${q} ud.`;
  }

  // 7. Fallback general
  if (q === 1) {
    return u;
  }
  return `${q}x${u}`;
}

