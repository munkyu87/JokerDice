import { ImageSourcePropType } from 'react-native';

export type DieMode = 'white' | 'black' | 'blue' | 'gold';

const DICE_PREVIEW_IMAGES: Partial<Record<DieMode, ImageSourcePropType>> = {
  white: require('../assets/dice/white-dice.png'),
  black: require('../assets/dice/black-dice.png'),
  gold: require('../assets/dice/gold-dice.png'),
  blue: require('../assets/dice/blue-dice.png'),
};

export const getDiceModeImage = (modeId: DieMode): ImageSourcePropType | undefined =>
  DICE_PREVIEW_IMAGES[modeId];
