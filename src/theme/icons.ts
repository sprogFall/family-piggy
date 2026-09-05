/** 分类图标映射：数据库存 key，这里负责映射为 Ionicons 图标与配色 */

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface CategoryVisual {
  icon: IoniconName;
  color: string;
}

export const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  restaurant: { icon: 'restaurant', color: '#FF7043' },
  car: { icon: 'car', color: '#42A5F5' },
  cart: { icon: 'cart', color: '#AB47BC' },
  home: { icon: 'home', color: '#26A69A' },
  cube: { icon: 'cube', color: '#8D6E63' },
  'game-controller': { icon: 'game-controller', color: '#EC407A' },
  medkit: { icon: 'medkit', color: '#EF5350' },
  call: { icon: 'call', color: '#5C6BC0' },
  cash: { icon: 'cash', color: '#00B578' },
  gift: { icon: 'gift', color: '#FFA726' },
  briefcase: { icon: 'briefcase', color: '#66BB6A' },
  'trending-up': { icon: 'trending-up', color: '#29B6F6' },
  wallet: { icon: 'wallet', color: '#FF6B81' },
  receipt: { icon: 'receipt', color: '#26C6DA' },
  heart: { icon: 'heart', color: '#EC407A' },
  people: { icon: 'people', color: '#FF8A65' },
  star: { icon: 'star', color: '#F5A623' },
  pricetag: { icon: 'pricetag', color: '#7E57C2' },
  'ellipsis-horizontal': { icon: 'ellipsis-horizontal', color: '#9E9E9E' },
};

/** 图标选择器可选列表 */
export const ICON_CHOICES: string[] = [
  'restaurant',
  'car',
  'cart',
  'home',
  'cube',
  'game-controller',
  'medkit',
  'call',
  'cash',
  'gift',
  'briefcase',
  'trending-up',
  'wallet',
  'receipt',
  'heart',
  'people',
  'star',
  'pricetag',
  'ellipsis-horizontal',
];

export const categoryVisual = (key: string, fallbackColor: string): CategoryVisual =>
  CATEGORY_VISUALS[key] ?? { icon: 'ellipse', color: fallbackColor };
