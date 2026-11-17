import { InventoryItem } from '../types';

export interface CategoryGroup {
  category: string;
  items: InventoryItem[];
}

/**
 * Determina la categoría de un alimento según su nombre o ubicación.
 * Cumple con la directiva de cero emojis y taxonomía de supermercado española.
 */
export function determineCategory(item: { name: string; location?: string; category?: string }): string {
  if (item.category) {
    const c = item.category.trim();
    if (c === 'Carnicería' || c === 'Aves' || c === 'Carnicería y Aves' || c === 'Carne') return 'Carne';
    if (c === 'Pescado') return 'Pescado';
    if (c === 'Lácteos') return 'Lácteos y Huevos';
    if (c === 'Conservas') return 'Despensa y Conservas';
    return c;
  }

  const name = (item.name || '').toLowerCase();
  const location = (item.location || '').toLowerCase();

  if (
    name.includes('pollo') ||
    name.includes('carne') ||
    name.includes('ternera') ||
    name.includes('cerdo') ||
    name.includes('jamón') ||
    name.includes('pavo') ||
    name.includes('salchicha') ||
    name.includes('lomo') ||
    name.includes('pechuga') ||
    name.includes('filete') ||
    name.includes('hamburguesa')
  ) {
    return 'Carne';
  }

  if (
    name.includes('pescado') ||
    name.includes('atún') ||
    name.includes('salmón') ||
    name.includes('merluza') ||
    name.includes('bacalao') ||
    name.includes('gamba') ||
    name.includes('langostino') ||
    name.includes('calamar') ||
    name.includes('pulpo') ||
    name.includes('sardina') ||
    name.includes('dorada') ||
    name.includes('lubina') ||
    name.includes('marisco')
  ) {
    return 'Pescado';
  }

  if (
    name.includes('leche') ||
    name.includes('huevo') ||
    name.includes('queso') ||
    name.includes('yogur') ||
    name.includes('mantequilla') ||
    name.includes('nata') ||
    name.includes('cuajada')
  ) {
    return 'Lácteos y Huevos';
  }

  if (
    name.includes('agua') ||
    name.includes('refresco') ||
    name.includes('coca') ||
    name.includes('cola') ||
    name.includes('fanta') ||
    name.includes('pepsi') ||
    name.includes('sprite') ||
    name.includes('7up') ||
    name.includes('nestea') ||
    name.includes('aquarius') ||
    name.includes('isotonica') ||
    name.includes('isotónica') ||
    name.includes('gaseosa') ||
    name.includes('zumo') ||
    name.includes('jugo') ||
    name.includes('cerveza') ||
    name.includes('vino') ||
    name.includes('batido') ||
    name.includes('horchata') ||
    name.includes('sidra')
  ) {
    return 'Bebidas';
  }

  if (
    name.includes('tomate') ||
    name.includes('lechuga') ||
    name.includes('cebolla') ||
    name.includes('patata') ||
    name.includes('fruta') ||
    name.includes('manzana') ||
    name.includes('plátano') ||
    name.includes('zanahoria') ||
    name.includes('aguacate')
  ) {
    return 'Frutas y Verduras';
  }

  if (
    name.includes('arroz') ||
    name.includes('pasta') ||
    name.includes('pan') ||
    name.includes('aceite') ||
    name.includes('conserva') ||
    name.includes('harina') ||
    name.includes('frito') ||
    name.includes('legumbre') ||
    name.includes('garbanzo')
  ) {
    return 'Despensa y Conservas';
  }

  if (
    name.includes('detergente') ||
    name.includes('lejía') ||
    name.includes('fregasuelos') ||
    name.includes('jabón') ||
    name.includes('limpiador') ||
    name.includes('bayeta') ||
    name.includes('estropajo') ||
    name.includes('lavavajillas')
  ) {
    return 'Limpieza y Hogar';
  }

  if (location.includes('nevera')) {
    return 'Refrigerados';
  }

  if (location.includes('congelador')) {
    return 'Congelados';
  }

  return 'Otros Alimentos';
}

/**
 * Agrupa una lista de alimentos de inventario por categoría
 * devolviendo un array ordenado para renderizado en listas de alta gama.
 */
export function groupInventoryByCategory(items: InventoryItem[]): CategoryGroup[] {
  const map: Record<string, InventoryItem[]> = {};

  for (const item of items) {
    const cat = determineCategory(item);
    if (!map[cat]) {
      map[cat] = [];
    }
    map[cat].push(item);
  }

  // Orden preferente para una experiencia visual de alta gastronomía
  const preferredOrder = [
    'Carne',
    'Pescado',
    'Lácteos y Huevos',
    'Frutas y Verduras',
    'Bebidas',
    'Despensa y Conservas',
    'Refrigerados',
    'Congelados',
    'Limpieza y Hogar',
    'Otros Alimentos',
  ];

  const result: CategoryGroup[] = [];

  for (const cat of preferredOrder) {
    if (map[cat] && map[cat].length > 0) {
      result.push({
        category: cat,
        items: [...map[cat]].sort((a, b) => a.name.localeCompare(b.name, 'es')),
      });
      delete map[cat];
    }
  }

  // Cualquier categoría adicional no listada en el orden preferente
  for (const [category, groupItems] of Object.entries(map)) {
    if (groupItems.length > 0) {
      result.push({
        category,
        items: [...groupItems].sort((a, b) => a.name.localeCompare(b.name, 'es')),
      });
    }
  }

  return result;
}
