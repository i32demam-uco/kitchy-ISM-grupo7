/**
 * Sanitizer Utility (Módulo de Seguridad y Limpieza de Entrada de Datos)
 * 
 * Protege la aplicación contra inyecciones XSS, SQLi, caracteres de control
 * y entradas maliciosas procedentes de hardware externo (Cámara OCR, Códigos de Barras, NFC).
 */

/**
 * Sanitiza cadenas de texto libre eliminando tags HTML, caracteres de control y secuencias sospechosas.
 */
export function sanitizeText(input: unknown, maxLength: number = 200): string {
  if (typeof input !== 'string') {
    if (input === null || input === undefined) return '';
    input = String(input);
  }

  let text = input as string;

  // 1. Eliminar caracteres nulos y de control ASCII no imprimibles (excepto espacios)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 2. Eliminar etiquetas HTML/XML completas
  text = text.replace(/<[^>]*>?/gm, '');

  // 3. Reemplazar comillas peligrosas o secuencias SQL habituales
  text = text.replace(/['";\\]/g, ' ');

  // 4. Normalizar espacios múltiples
  text = text.replace(/\s+/g, ' ').trim();

  // 5. Truncar a longitud máxima segura
  if (text.length > maxLength) {
    text = text.substring(0, maxLength).trim();
  }

  return text;
}

/**
 * Sanitiza números de precio y cantidades asegurando formato flotante seguro.
 */
export function sanitizeNumber(input: unknown, fallback: number = 0, min: number = 0, max: number = 99999): number {
  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) return fallback;
    return Math.min(Math.max(input, min), max);
  }

  if (typeof input === 'string') {
    const cleaned = input.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed) || !isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
  }

  return fallback;
}

export interface ParsedReceiptItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

/**
 * Normaliza y expande abreviaturas y recortamientos típicos de tickets de supermercados españoles
 * (Mercadona, Carrefour, Día, Lidl, etc.).
 * Ejemplos:
 *  "CC Zero Zero" -> "Coca-Cola Zero Zero"
 *  "CC Zero" -> "Coca-Cola Zero"
 *  "CC Normal" -> "Coca-Cola Original"
 *  "Hvos L" -> "Huevos L"
 *  "Q. Curado" -> "Queso curado"
 *  "Pech. Pollo" -> "Pechuga de pollo"
 *  "Tom. Frito" -> "Tomate frito"
 *  "Plat. Canarias" -> "Plátano de Canarias"
 *  "Ac. Oliva" -> "Aceite de oliva"
 *  "Leche Ent" -> "Leche entera"
 *  "Leche Semi" -> "Leche semidesnatada"
 *  "Agua Frio" -> "Agua fría"
 */
export function expandReceiptAbbreviations(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let result = text.trim();

  // 1. Refrescos y Bebidas (CC, Coca Cola, Cerveza, Zumo, Agua)
  result = result.replace(/\b(?:C\.?C\.?|CC)\s*Zero\s*Zero\b/gi, 'Coca-Cola Zero Zero');
  result = result.replace(/\b(?:C\.?C\.?|CC)\s*0[,.]0\b/gi, 'Coca-Cola Zero Zero');
  result = result.replace(/\b(?:C\.?C\.?|CC)\s*Zero\b/gi, 'Coca-Cola Zero');
  result = result.replace(/\b(?:C\.?C\.?|CC)\s*Light\b/gi, 'Coca-Cola Light');
  result = result.replace(/\b(?:C\.?C\.?|CC)\s*Normal\b/gi, 'Coca-Cola Original');
  result = result.replace(/\b(?:C\.?C\.?|CC)\s*Orig(?:inal)?\b/gi, 'Coca-Cola Original');
  result = result.replace(/^CC\b/i, 'Coca-Cola');
  result = result.replace(/\bC\.C\.\b/gi, 'Coca-Cola');

  // Agua
  result = result.replace(/\bAgua\s+Frio\b/gi, 'Agua fría');
  result = result.replace(/\bAigua\s+Freda\b/gi, 'Agua fría');
  result = result.replace(/\bAgua\s+Min(?:\.|\b)/gi, 'Agua Mineral');

  // Cervezas y Zumos
  result = result.replace(/\bCerv(?:\.|\b)\s*/gi, 'Cerveza ');
  result = result.replace(/\bZumo\s+Nar(?:\.|\b|an\b)/gi, 'Zumo de naranja');
  result = result.replace(/\bZumo\s+Meloc(?:\.|\b)/gi, 'Zumo de melocotón');
  result = result.replace(/\bZumo\s+Pin(?:\.|\b|a\b)/gi, 'Zumo de piña');

  // 2. Lácteos y Huevos
  result = result.replace(/\bHvos(?:\.|\b)/gi, 'Huevos');
  result = result.replace(/\bHvo(?:\.|\b)/gi, 'Huevo');
  result = result.replace(/\bQ\.\s*Curado\b/gi, 'Queso curado');
  result = result.replace(/\bQ\.\s*Semicurado\b/gi, 'Queso semicurado');
  result = result.replace(/\bQ\.\s*Semi\b/gi, 'Queso semicurado');
  result = result.replace(/\bQ\.\s*Tierno\b/gi, 'Queso tierno');
  result = result.replace(/\bQ\.\s*Mezcla\b/gi, 'Queso de mezcla');
  result = result.replace(/\bQ\.\s*Cabra\b/gi, 'Queso de cabra');
  result = result.replace(/\bQ\.\s*Oveja\b/gi, 'Queso de oveja');
  result = result.replace(/\bQueso\s+Cur(?:\.|\b)/gi, 'Queso curado');
  result = result.replace(/\bQueso\s+Semi(?:\.|\b)/gi, 'Queso semicurado');
  result = result.replace(/\bQueso\s+Tier(?:\.|\b)/gi, 'Queso tierno');
  result = result.replace(/\bQ\.\s*Rallado\b/gi, 'Queso rallado');
  result = result.replace(/\bQ\.\s*Untar\b/gi, 'Queso de untar');
  result = result.replace(/\bLeche\s+Ent(?:\.|\b)/gi, 'Leche entera');
  result = result.replace(/\bLeche\s+Semi(?:\.|\b|des\b)/gi, 'Leche semidesnatada');
  result = result.replace(/\bLeche\s+Desn(?:\.|\b|at\b)/gi, 'Leche desnatada');
  result = result.replace(/\bYog(?:\.|\b)\s*Nat(?:\.|\b)/gi, 'Yogur natural');
  result = result.replace(/\bYog(?:\.|\b)\s*Desn(?:\.|\b)/gi, 'Yogur desnatado');
  result = result.replace(/\bYog(?:\.|\b)\s*Griego\b/gi, 'Yogur griego');
  result = result.replace(/\bYog(?:\.|\b)\s*Fresa\b/gi, 'Yogur de fresa');
  result = result.replace(/\bManteq(?:\.|\b)/gi, 'Mantequilla');

  // 3. Carnes y Pescados
  result = result.replace(/\bPech(?:\.|\b)\s*Pollo\b/gi, 'Pechuga de pollo');
  result = result.replace(/\bPech(?:\.|\b)\s*Pavo\b/gi, 'Pechuga de pavo');
  result = result.replace(/\bPech(?:\.|\b)\s*Pol(?:\.|\b)/gi, 'Pechuga de pollo');
  result = result.replace(/\bFilet(?:\.|\b)\s*Pollo\b/gi, 'Filetes de pollo');
  result = result.replace(/\bFilet(?:\.|\b)\s*Pavo\b/gi, 'Filetes de pavo');
  result = result.replace(/\bFilet(?:\.|\b)\s*Ternera\b/gi, 'Filetes de ternera');
  result = result.replace(/\bFilet(?:\.|\b)\s*Merluza\b/gi, 'Filetes de merluza');
  result = result.replace(/\bMusl(?:\.|\b)\s*Pollo\b/gi, 'Muslos de pollo');
  result = result.replace(/\bAlas\s+Pollo\b/gi, 'Alas de pollo');
  result = result.replace(/\bContramusl(?:\.|\b)/gi, 'Contramuslos');
  result = result.replace(/\bCarn(?:e)?\s+Pic(?:\.|\b|ada\b)/gi, 'Carne picada');
  result = result.replace(/\bBurg(?:er)?\s*Meat\b/gi, 'Hamburguesas');
  result = result.replace(/\bHamburg(?:\.|\b)/gi, 'Hamburguesas');
  result = result.replace(/\bSalch(?:\.|\b)\s*Pollo\b/gi, 'Salchichas de pollo');
  result = result.replace(/\bSalch(?:\.|\b)\s*Pavo\b/gi, 'Salchichas de pavo');
  result = result.replace(/\bSalch(?:\.|\b)/gi, 'Salchichas');
  result = result.replace(/\bTaq(?:\.|\b)\s*Jamon\b/gi, 'Taquitos de jamón');
  result = result.replace(/\bMini\s+Taquitos\s+Jamon\b/gi, 'Taquitos de jamón');
  result = result.replace(/\bJam(?:\.|\b)\s*Cocido\b/gi, 'Jamón cocido');
  result = result.replace(/\bJam(?:\.|\b)\s*Serrano\b/gi, 'Jamón serrano');
  result = result.replace(/\bJam(?:\.|\b)\s*Iberico\b/gi, 'Jamón ibérico');
  result = result.replace(/\bSalm(?:\.|\b)\s*Fresco\b/gi, 'Salmón fresco');
  result = result.replace(/\bMerl(?:\.|\b)\s*Fresca\b/gi, 'Merluza fresca');
  result = result.replace(/\bAtun\s+Cl(?:\.|\b|aro\b)/gi, 'Atún claro');
  result = result.replace(/\bAtun\s+Calv(?:\.|\b|o\b)/gi, 'Atún Calvo');

  // 4. Frutas, Verduras y Despensa
  result = result.replace(/\bTom(?:\.|\b)\s*Frito\b/gi, 'Tomate frito');
  result = result.replace(/\bTom(?:\.|\b)\s*Triturado\b/gi, 'Tomate triturado');
  result = result.replace(/\bPlat(?:\.|\b)\s*Canarias\b/gi, 'Plátano de Canarias');
  result = result.replace(/\bPlat(?:\.|\b)\s*Can(?:\.|\b)/gi, 'Plátano de Canarias');
  result = result.replace(/\bPatat(?:\.|\b)\s*Lavadas\b/gi, 'Patatas lavadas');
  result = result.replace(/\bCeboll(?:\.|\b)\s*Dulce\b/gi, 'Cebolla dulce');
  result = result.replace(/\bZanahor(?:\.|\b)/gi, 'Zanahorias');
  result = result.replace(/\bEsparrag(?:\.|\b)/gi, 'Espárragos');
  result = result.replace(/\bChampin(?:\.|\b|on\b|ones\b)/gi, 'Champiñones');
  result = result.replace(/\bPimient(?:\.|\b)\s*Rojo\b/gi, 'Pimiento rojo');
  result = result.replace(/\bPimient(?:\.|\b)\s*Verde\b/gi, 'Pimiento verde');
  result = result.replace(/\bAc(?:\.|\b)\s*Oliva\b/gi, 'Aceite de oliva');
  result = result.replace(/\bAceite\s+Oliv(?:\.|\b)/gi, 'Aceite de oliva');
  result = result.replace(/\bAOVE\b/g, 'Aceite de oliva virgen extra');
  result = result.replace(/\bAc(?:\.|\b)\s*Girasol\b/gi, 'Aceite de girasol');
  result = result.replace(/\bEspag(?:\.|\b)/gi, 'Espaguetis');
  result = result.replace(/\bMacarr(?:\.|\b)/gi, 'Macarrones');
  result = result.replace(/\bArroz\s+Red(?:\.|\b|ondo\b)/gi, 'Arroz redondo');
  result = result.replace(/\bPan\s+Mold(?:\.|\b|e\b)/gi, 'Pan de molde');
  result = result.replace(/\bPan\s+Vien(?:\.|\b|a\b)/gi, 'Pan de Viena');
  result = result.replace(/\bGallet(?:\.|\b)\s*Maria\b/gi, 'Galletas María');
  result = result.replace(/\bChoc(?:\.|\b)\s*Negro\b/gi, 'Chocolate negro');
  result = result.replace(/\bChoc(?:\.|\b)\s*Puro\b/gi, 'Chocolate puro');
  result = result.replace(/\bChoc(?:\.|\b)\s*Leche\b/gi, 'Chocolate con leche');

  // 5. Sufijos habituales de supermercados
  result = result.replace(/\bS\/G\b/gi, 'Sin Gluten');
  result = result.replace(/\bC\/G\b/gi, 'Con Gluten');
  result = result.replace(/\bS\/L\b/gi, 'Sin Lactosa');
  result = result.replace(/\bS\/A\b/gi, 'Sin Azúcar');
  result = result.replace(/\bP\/CA\b/gi, '');
  result = result.replace(/\bP\/PACK\b/gi, '');

  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Determina si un producto corresponde a un alimento o bebida para la despensa,
 * filtrando bolsas de compra, productos de limpieza, higiene personal y bazar.
 */
export function isFoodProduct(rawName: string, category?: string): boolean {
  if (!rawName || typeof rawName !== 'string') return false;
  if (category === 'Limpieza y Hogar' || category === 'Bazar') return false;

  const normalized = rawName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 1. Excepciones: Alimentos que se venden en bolsa (no confundir con bolsas de plástico de compra)
  const isFoodInBag =
    normalized.includes('patata') ||
    normalized.includes('ensalada') ||
    normalized.includes('zanahoria') ||
    normalized.includes('espinaca') ||
    normalized.includes('caramelo') ||
    normalized.includes('frutos secos') ||
    normalized.includes('pan');

  if (!isFoodInBag) {
    if (
      normalized === 'bolsa' ||
      normalized.startsWith('bolsa ') ||
      normalized.includes('bolsa plastico') ||
      normalized.includes('bolsa rafia') ||
      normalized.includes('bolsa papel') ||
      normalized.includes('bolsa compra') ||
      normalized.includes('bolsa reutilizable') ||
      normalized.includes('bolsa camiseta') ||
      /bolsa\s*(?:0[,.]\d+|15|10|reciclad)/.test(normalized)
    ) {
      return false;
    }
  }

  // 2. Limpieza y Droguería
  const cleaningKeywords = [
    'detergente', 'suavizante', 'lejia', 'lavavajill', 'fairy', 'mistol',
    'fregasuelo', 'limpiador', 'limpiacristal', 'desinfectante', 'estropajo',
    'bayeta', 'fregona', 'ambientador', 'insecticida', 'papel aluminio',
    'film transparente', 'papel cocina', 'rollo cocina', 'servilleta',
    'bolsa basura', 'bolsas basura', 'guante fregar', 'guantes latex'
  ];
  for (const kw of cleaningKeywords) {
    if (normalized.includes(kw)) return false;
  }

  // 3. Higiene Personal, Cosmética y Farmacia
  const hygieneKeywords = [
    'papel higienic', 'champu', 'gel ducha', 'gel bano', 'gel wc',
    'jabon mano', 'jabon de mano', 'desodorante', 'dentifric',
    'pasta dental', 'pasta diente', 'cepillo diente', 'cepillo dental',
    'hilo dental', 'enjuague bucal', 'compresa', 'tampone', 'protegeslip',
    'toallita', 'panal', 'esponja', 'maquinilla', 'cuchilla afeitar',
    'espuma afeitar', 'gel afeitar', 'crema hidratante', 'laca', 'fijador pelo',
    'gomina', 'algodon', 'desmaquillante', 'bastoncillo'
  ];
  for (const kw of hygieneKeywords) {
    if (normalized.includes(kw)) return false;
  }

  // 4. Bazar, Menaje y Metadatos de Ticket
  const bazaarKeywords = [
    'pila aaa', 'pila aa', 'pilas', 'bombilla', 'mechero', 'encendedor',
    'cerilla', 'fosforo', 'vela aromatica', 'plato plastico', 'vaso plastico',
    'cubierto plastico', 'pinzas ropa', 'donativo', 'aportacion', 'redondeo solidario'
  ];
  for (const kw of bazaarKeywords) {
    if (normalized.includes(kw)) return false;
  }

  return true;
}

/**
 * Expresiones regulares adaptadas a tickets de supermercados españoles (Mercadona, Carrefour, Día, etc.)
 */
export function parseReceiptLine(line: string): ParsedReceiptItem | null {
  const sanitized = sanitizeText(line, 120);
  if (!sanitized || sanitized.length < 4) return null;

  // Descartar encabezados habituales de tickets y líneas no alimentarias
  const lower = sanitized.toLowerCase();
  const ignoreKeywords = [
    'cif', 'nif', 'factura', 'simplificada', 'ticket', 'total', 'subtotal',
    'tarjeta', 'tarj.', 'bancaria', 'visa', 'mastercard', 'iva', 'cuota',
    'base imp', 'base imponible', 'fecha', 'hora', 'gracias', 'mercadona',
    'supermercado', 'carrefour', 'lidl', 'alcampo', 'c/ ', 'calle', 'avda',
    'telefono', 'teléfono', 'tel.', 'op:', 'operacion', 'operación', 'caja',
    'cajero', 'terminal', 'descripcion', 'descripción', 'descripció', 'p. unit', 'p.unit',
    'importe', 'precio', 'aut:', 'aid:', 'articulos', 'artículos', 'desglose',
    'pago confirmado', 'entrega', 'devolucion', 'devolución', 'centro:', 'parking'
  ];
  if (ignoreKeywords.some((kw) => lower.includes(kw))) {
    return null;
  }

  // Descartar líneas que sean únicamente números, fechas, porcentajes o símbolos
  if (/^[\d\s.,€%/*\-:()]+$/.test(sanitized)) {
    return null;
  }

  // Patrón 1: "[Cantidad] [Nombre Producto] [P.Unitario opcional] [Precio Total]"
  // Ej: "2x LECHE HACENDADO P/CA 3,26 6,52" o "1 12 HUEVOS GRANDES-L 2,20" o "1x FR + LLET CARIBE S/G 1,20"
  const regexQuantityFirst = /^(?:(\d+)\s*(?:[xX]|\*|\s)?\s*)?([A-Za-zÁÉÍÓÚáéíóúñÑàèòÀÈÒçÇïü0-9\s.,\-()/+&%]{3,50}?)\s+(?:(\d+[.,]\d{2})\s+)?(\d+[.,]\d{2})\s*€?$/;

  const match = sanitized.match(regexQuantityFirst);
  if (match) {
    const rawQuantity = match[1] ? sanitizeNumber(match[1], 1, 0.1, 100) : 1;
    const rawName = match[2].trim();
    const unitPriceOpt = match[3];
    const totalPrice = sanitizeNumber(match[4], 1.0, 0.01, 1000);
    const unitPrice = unitPriceOpt
      ? sanitizeNumber(unitPriceOpt, totalPrice, 0.01, 1000)
      : (rawQuantity > 0 ? parseFloat((totalPrice / rawQuantity).toFixed(2)) : totalPrice);

    // El nombre del producto DEBE contener al menos 3 caracteres alfabéticos
    const letterCount = (rawName.match(/[A-Za-zÁÉÍÓÚáéíóúñÑàèòÀÈÒçÇïü]/g) || []).length;
    if (letterCount < 3) return null;

    const { name, category, unit } = categorizeProduct(rawName);

    // FILTRO CRÍTICO: Excluir estrictamente artículos que no sean alimentos o bebidas para la despensa
    if (!isFoodProduct(name, category)) {
      return null;
    }

    return {
      name,
      quantity: rawQuantity,
      unit,
      unitPrice,
      totalPrice,
      category,
    };
  }

  return null;
}

/**
 * Clasifica inteligentemente el nombre del producto en categorías oficiales Kitchy
 * y detecta el peso (g/kg), volumen (l/ml) o unidades según el formato real del envase.
 */
export function categorizeProduct(rawName: string): { name: string; category: string; unit: string } {
  const cleanName = sanitizeText(rawName, 60);
  const expandedName = expandReceiptAbbreviations(cleanName);
  const lower = expandedName.toLowerCase();

  let category = 'Otros Alimentos';

  if (
    lower.includes('pollo') ||
    lower.includes('carne') ||
    lower.includes('ternera') ||
    lower.includes('lomo') ||
    lower.includes('pavo') ||
    lower.includes('cerdo') ||
    lower.includes('pechuga') ||
    lower.includes('filete') ||
    lower.includes('hamburguesa') ||
    lower.includes('jamon') ||
    lower.includes('jamón') ||
    lower.includes('salchicha')
  ) {
    category = 'Carne';
  } else if (
    lower.includes('salmon') ||
    lower.includes('salmón') ||
    lower.includes('atun') ||
    lower.includes('atún') ||
    lower.includes('merluza') ||
    lower.includes('pescado') ||
    lower.includes('bacalao') ||
    lower.includes('gamba') ||
    lower.includes('marisco') ||
    lower.includes('langostino') ||
    lower.includes('calamar') ||
    lower.includes('pulpo') ||
    lower.includes('sardina') ||
    lower.includes('dorada') ||
    lower.includes('lubina')
  ) {
    category = 'Pescado';
  } else if (
    lower.includes('leche') ||
    lower.includes('queso') ||
    lower.includes('yogur') ||
    lower.includes('mantequilla') ||
    lower.includes('huevo') ||
    lower.includes('huevos') ||
    lower.includes('nata') ||
    lower.includes('cuajada') ||
    lower.includes('kefir') ||
    lower.includes('kéfir')
  ) {
    category = 'Lácteos y Huevos';
  } else if (
    lower.includes('agua') ||
    lower.includes('refresco') ||
    lower.includes('coca') ||
    lower.includes('cola') ||
    lower.includes('fanta') ||
    lower.includes('pepsi') ||
    lower.includes('sprite') ||
    lower.includes('7up') ||
    lower.includes('nestea') ||
    lower.includes('aquarius') ||
    lower.includes('isotonica') ||
    lower.includes('isotónica') ||
    lower.includes('gaseosa') ||
    lower.includes('zumo') ||
    lower.includes('jugo') ||
    lower.includes('cerveza') ||
    lower.includes('vino') ||
    lower.includes('batido') ||
    lower.includes('horchata') ||
    lower.includes('sidra')
  ) {
    category = 'Bebidas';
  } else if (
    lower.includes('manzana') ||
    lower.includes('platano') ||
    lower.includes('plátano') ||
    lower.includes('lechuga') ||
    lower.includes('fruta') ||
    lower.includes('verdura') ||
    lower.includes('cebolla') ||
    lower.includes('patata') ||
    lower.includes('papas') ||
    lower.includes('zanahoria') ||
    lower.includes('aguacate') ||
    lower.includes('naranja') ||
    lower.includes('mandarina') ||
    lower.includes('limon') ||
    lower.includes('limón') ||
    lower.includes('espinaca') ||
    (lower.includes('tomate') &&
      !lower.includes('frito') &&
      !lower.includes('conserva') &&
      !lower.includes('triturado') &&
      !lower.includes('tamizado'))
  ) {
    category = 'Frutas y Verduras';
  } else if (
    lower.includes('arroz') ||
    lower.includes('pasta') ||
    lower.includes('macarron') ||
    lower.includes('espagueti') ||
    lower.includes('fideo') ||
    lower.includes('trottole') ||
    lower.includes('pan') ||
    lower.includes('harina') ||
    lower.includes('aceite') ||
    lower.includes('vinagre') ||
    lower.includes('sal') ||
    lower.includes('azucar') ||
    lower.includes('azúcar') ||
    lower.includes('legumbre') ||
    lower.includes('garbanzo') ||
    lower.includes('lenteja') ||
    lower.includes('alubia') ||
    lower.includes('conserva') ||
    lower.includes('frito') ||
    lower.includes('galleta') ||
    lower.includes('cafe') ||
    lower.includes('café') ||
    lower.includes('chocolate') ||
    lower.includes('cacao') ||
    (lower.includes('tomate') &&
      (lower.includes('frito') ||
        lower.includes('conserva') ||
        lower.includes('triturado') ||
        lower.includes('tamizado')))
  ) {
    category = 'Despensa y Conservas';
  } else if (
    lower.includes('detergente') ||
    lower.includes('lejia') ||
    lower.includes('lejía') ||
    lower.includes('jabon') ||
    lower.includes('jabón') ||
    lower.includes('limpiador') ||
    lower.includes('suavizante') ||
    lower.includes('lavavajilla') ||
    lower.includes('papel') ||
    lower.includes('estropajo') ||
    lower.includes('bayeta') ||
    lower.includes('higienico') ||
    lower.includes('higiénico') ||
    lower.includes('servilleta')
  ) {
    category = 'Limpieza y Hogar';
  }

  // 1. Detección de Peso explícito (ej: 500 g, 250 g, 1 kg, 0.374 kg)
  const weightMatch = cleanName.match(/\b(\d+(?:[.,]\d+)?\s*(?:kg|g|gr|gramos))\b/i);
  // 2. Detección de Volumen explícito (ej: 4L, 1.5 L, 1 L, 330 ml, 250 cl)
  const volMatch = cleanName.match(/\b(\d+(?:[.,]\d+)?\s*(?:l|litros?|ml|cl))\b/i);
  // 3. Detección de Huevos / Unidades / Packs (ej: 12 HUEVOS, 6 UD, 4 LATAS)
  const eggsMatch = cleanName.match(/\b(\d+)\s*(?:huevos|huevo)\b/i);
  const packMatch = cleanName.match(/\b(\d+)\s*(?:ud|unidades|latas|botellas)\b/i);

  let unit = '1 ud';
  if (weightMatch) {
    unit = weightMatch[1].toLowerCase();
  } else if (volMatch) {
    unit = volMatch[1].toLowerCase();
  } else if (eggsMatch) {
    unit = `${eggsMatch[1]} unidades`;
  } else if (packMatch) {
    unit = `${packMatch[1]} unidades`;
  } else if (lower.includes('leche')) {
    unit = '1 l'; // Envase tetrabrik estándar
  } else if (lower.includes('agua')) {
    unit = '1 l'; // Botella de agua estándar
  } else if (lower.includes('coca cola') || lower.includes('coca-cola') || lower.includes('refresco') || lower.includes('fanta')) {
    unit = '330 ml';
  } else if (lower.includes('yogur') || lower.includes('bifidus') || lower.includes('bífidus')) {
    unit = '6 ud.'; // Pack estándar de yogures
  } else if (lower.includes('huevo') || lower.includes('huevos')) {
    unit = '6 unidades';
  } else if (category === 'Carne') {
    unit = '500 g';
  } else if (category === 'Pescado') {
    unit = '400 g';
  }

  // Capitalización limpia respetando nombres compuestos y guiones (ej. Coca-Cola)
  const formattedName = expandedName
    .split(' ')
    .map((word) => {
      if (word.includes('-')) {
        return word
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join('-');
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  return {
    name: formattedName || 'Artículo de Compra',
    category,
    unit,
  };
}

/**
 * Sanitiza y extrae el identificador de hogar o payload de una etiqueta NFC
 */
export function sanitizeNfcPayload(payloadText: unknown): { houseId?: string; rawText: string; isVirgin: boolean } {
  const sanitized = sanitizeText(payloadText, 250);
  if (!sanitized) {
    return { isVirgin: true, rawText: '' };
  }

  // Comprobar si viene serializado en JSON (ej: {"houseId": "xxx"} o {"house_id": "xxx"})
  if (sanitized.startsWith('{') && sanitized.endsWith('}')) {
    try {
      const parsed = JSON.parse(sanitized);
      const houseId = parsed.houseId || parsed.house_id || parsed.id;
      if (houseId && typeof houseId === 'string') {
        const cleanHouseId = sanitizeText(houseId, 64);
        return { houseId: cleanHouseId, rawText: sanitized, isVirgin: false };
      }
    } catch {
      // no era json válido
    }
  }

  // Comprobar si el payload es un ID directo o URI (ej: kitchy://house/xxx o a0000000-0000-0000-0000-000000000001)
  const uriMatch = sanitized.match(/(?:house\/|house=|^)([a-zA-Z0-9-]{8,64})/);
  if (uriMatch && uriMatch[1]) {
    return { houseId: sanitizeText(uriMatch[1], 64), rawText: sanitized, isVirgin: false };
  }

  return { rawText: sanitized, isVirgin: false };
}

