import { ImageSourcePropType } from 'react-native';

// 카드 이미지가 준비되면 아래 맵에 cardId 기준으로 연결해서 사용합니다.
// 예) precision_reroll: require('../assets/cards/precision-reroll.png')
const ACTION_CARD_PREVIEW_IMAGES: Partial<Record<string, ImageSourcePropType>> = {
  precision_reroll: require('../assets/cards/action-precision-reroll.png'),
  raise_all: require('../assets/cards/action-raise-all.png'),
  sink_all: require('../assets/cards/action-sink-all.png'),
  nudge_up: require('../assets/cards/action-nudge-up.png'),
  nudge_down: require('../assets/cards/action-nudge-down.png'),
  anchor_one: require('../assets/cards/action-anchor-one.png'),
  smallest_bump: require('../assets/cards/action-smallest-bump.png'),
  mirror_high: require('../assets/cards/action-mirror-high.png'),
  mirror_low: require('../assets/cards/action-mirror-low.png'),
  even_polish: require('../assets/cards/action-even-polish.png'),
  twin_peak: require('../assets/cards/action-twin-peak.png'),
  invert_faces: require('../assets/cards/action-invert-faces.png'),
  chaos_reroll: require('../assets/cards/action-chaos-reroll.png'),
  surge_die: require('../assets/cards/action-surge-die.png'),
  swap_pair: require('../assets/cards/action-swap-pair.png'),
  loaded_six: require('../assets/cards/action-loaded-six.png'),
  boost_spike: require('../assets/cards/action-boost-spike.png'),
  median_three: require('../assets/cards/action-median-three.png'),
  negative_ink: require('../assets/cards/action-negative-ink.png'),
  gold_burn: require('../assets/cards/action-gold-burn.png'),
  private_dealer: require('../assets/cards/action-private-dealer.png'),
  grand_raise: require('../assets/cards/action-grand-raise.png'),
  apex_unify: require('../assets/cards/action-apex-unify.png'),
};

export const getActionCardPreviewImage = (cardId: string): ImageSourcePropType | undefined =>
  ACTION_CARD_PREVIEW_IMAGES[cardId];
