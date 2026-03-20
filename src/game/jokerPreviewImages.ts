import { ImageSourcePropType } from 'react-native';

const JOKER_PREVIEW_IMAGES: Record<string, ImageSourcePropType> = {
  lucky_reroll: require('../assets/jokers/lucky-reroll.png'),
  golden_touch: require('../assets/jokers/golden-touch.png'),
  even_power: require('../assets/jokers/even-power.png'),
  odd_power: require('../assets/jokers/even-polish.png'),
  triple_boost: require('../assets/jokers/triple-boost.png'),
  straight_spark: require('../assets/jokers/straight-spark.png'),
  full_grip: require('../assets/jokers/full-grip.png'),
};

export const getJokerPreviewImage = (jokerId: string): ImageSourcePropType | undefined =>
  JOKER_PREVIEW_IMAGES[jokerId];
