import { ImageSourcePropType } from 'react-native';

import { RewardOption, ShopItem } from './types';

const UTILITY_PREVIEW_IMAGES: Record<string, ImageSourcePropType> = {
  'reward-gold-4': require('../assets/etc/reward-golden-cache.png'),
  'reward-remove': require('../assets/etc/utility-deck-trim.png'),
  'shop-remove': require('../assets/etc/utility-deck-trim.png'),
  'shop-reroll': require('../assets/etc/shop-reroll.png'),
};

export const getRewardUtilityPreviewImage = (option: RewardOption): ImageSourcePropType | undefined => {
  if (option.type === 'joker' || option.type === 'card') {
    return undefined;
  }
  return UTILITY_PREVIEW_IMAGES[option.id];
};

export const getShopUtilityPreviewImage = (item: ShopItem): ImageSourcePropType | undefined => {
  if (item.type === 'joker' || item.type === 'card') {
    return undefined;
  }
  return UTILITY_PREVIEW_IMAGES[item.id];
};
