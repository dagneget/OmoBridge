import type { ProductResponse } from '../../types/api';

/**
 * Resolves high-resolution cultural & artisanal product images for South Omo products.
 */
export function getProductImage(product?: ProductResponse | { name?: string; category?: string }): string {
  const text = `${product?.name || ''} ${product?.category || ''}`.toLowerCase();

  // 1. Terracotta / Clay / Pottery
  if (text.includes('pot') || text.includes('clay') || text.includes('terracotta') || text.includes('pottery') || text.includes('earthenware')) {
    return '/pottery_product.jpg';
  }

  // 2. Woven Crafts / Baskets / Shawls / Textiles
  if (
    text.includes('basket') ||
    text.includes('agelgil') ||
    text.includes('shawl') ||
    text.includes('netela') ||
    text.includes('gabi') ||
    text.includes('craft') ||
    text.includes('cotton') ||
    text.includes('handwoven')
  ) {
    return '/artisan_crafts.jpg';
  }

  // 3. Honey / Coffee / Grains
  if (text.includes('honey') || text.includes('coffee') || text.includes('bean') || text.includes('sesame') || text.includes('grain')) {
    return '/honey_coffee_product.jpg';
  }

  // Default fallback to honey & coffee showcase asset
  return '/honey_coffee_product.jpg';
}
