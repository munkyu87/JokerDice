import { ImageSourcePropType } from 'react-native';

// 카드 이미지가 준비되면 아래 맵에 cardId 기준으로 연결해서 사용합니다.
// 예) precision_reroll: require('../assets/cards/precision-reroll.png')
const ACTION_CARD_PREVIEW_IMAGES: Partial<Record<string, ImageSourcePropType>> = {};

export const getActionCardPreviewImage = (cardId: string): ImageSourcePropType | undefined =>
  ACTION_CARD_PREVIEW_IMAGES[cardId];
