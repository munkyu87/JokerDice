import { ImageSourcePropType } from 'react-native';

const JOKER_PREVIEW_IMAGES: Record<string, ImageSourcePropType> = {
  six_master: require('../assets/jokers/joker-six-master-character.png'),
  steady_pair: require('../assets/jokers/joker-steady-pair-character.png'),
  lucky_reroll: require('../assets/jokers/joker-lucky-reroll-character.png'),
  golden_touch: require('../assets/jokers/joker-golden-touch-character.png'),
  even_power: require('../assets/jokers/joker-even-power-character.png'),
  even_polish: require('../assets/jokers/joker-even-polish-character.png'),
  odd_power: require('../assets/jokers/joker-odd-power-character.png'),
  triple_boost: require('../assets/jokers/joker-triple-boost-character.png'),
  straight_spark: require('../assets/jokers/joker-straight-spark-character.png'),
  full_grip: require('../assets/jokers/joker-full-grip-character.png'),
  fresh_deal: require('../assets/jokers/joker-fresh-deal-character.png'),
  shop_6_slot: require('../assets/jokers/joker-market-expansion-character.png'),
  gap_draw: require('../assets/jokers/joker-gap-fill-character.png'),
  sixth_sense: require('../assets/jokers/joker-sixth-sense-character.png'),
};

export const getJokerPreviewImage = (jokerId: string): ImageSourcePropType | undefined =>
  JOKER_PREVIEW_IMAGES[jokerId];
