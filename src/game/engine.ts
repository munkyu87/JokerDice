import { ACTION_CARDS, BOSSES, JOKERS, STARTING_DECK } from './data';
import {
  ActionCardDefinition,
  ActionCardRarity,
  DeckState,
  DiceRoll,
  DiceValue,
  HandEvaluation,
  HandRank,
  JokerDefinition,
  JokerEffectContext,
  JokerProgressMap,
  JokerRarity,
  PurgeOption,
  RewardOption,
  ScoreResult,
  ShopItem,
} from './types';

/** 일반 등급 핸드 카드 상점가 (참고용) */
export const SHOP_HAND_CARD_PRICE = 3;
export const SHOP_REROLL_BASE_PRICE = 2;
export const SHOP_VOUCHER_PRICE = 20;
const SHOP_VOUCHER_CHANCE = 0.32;

export const getShopJokerPrice = (rarity: JokerRarity): number => {
  const byRarity: Record<JokerRarity, number> = {
    common: 6,
    uncommon: 8,
    rare: 10,
    legendary: 12,
  };
  return byRarity[rarity];
};

const ACTION_CARD_RARITY_WEIGHT: Record<ActionCardRarity, number> = {
  common: 48,
  uncommon: 28,
  rare: 14,
  legendary: 4,
};

/** 등급별 상점 구매가 */
export const getShopHandCardPrice = (rarity: ActionCardRarity): number => {
  const byRarity: Record<ActionCardRarity, number> = {
    common: 3,
    uncommon: 4,
    rare: 6,
    legendary: 9,
  };
  return byRarity[rarity];
};

export const getShopActionCardPrice = (card: ActionCardDefinition): number =>
  card.pool === 'voucher' ? SHOP_VOUCHER_PRICE : getShopHandCardPrice(card.rarity);

/** 핸드 카드 1장 판매가 — 등급 반영, 해당 등급 상점가 미만 */
export const getSellPriceHandCard = (rarity: ActionCardRarity): number => {
  const byRarity: Record<ActionCardRarity, number> = {
    common: 1,
    uncommon: 2,
    rare: 3,
    legendary: 4,
  };
  return Math.min(byRarity[rarity], getShopHandCardPrice(rarity) - 1);
};

/** 보상·상점에서 중복 없이, 등급 가중치로 액션 카드를 고릅니다. */
export const pickDistinctActionCards = (count: number, rng: () => number): ActionCardDefinition[] => {
  const pool = ACTION_CARDS.filter(card => (card.pool ?? 'standard') === 'standard');
  const result: ActionCardDefinition[] = [];

  while (result.length < count && pool.length > 0) {
    const totalWeight = pool.reduce((sum, card) => sum + ACTION_CARD_RARITY_WEIGHT[card.rarity], 0);
    let roll = rng() * totalWeight;
    let pickedIndex = pool.length - 1;

    for (let i = 0; i < pool.length; i += 1) {
      roll -= ACTION_CARD_RARITY_WEIGHT[pool[i].rarity];
      if (roll <= 0) {
        pickedIndex = i;
        break;
      }
    }

    result.push(pool[pickedIndex]);
    pool.splice(pickedIndex, 1);
  }

  return result;
};

export const pickDistinctVoucherCards = (count: number, rng: () => number): ActionCardDefinition[] => {
  const pool = shuffle(
    ACTION_CARDS.filter(card => (card.pool ?? 'standard') === 'voucher'),
    rng,
  );
  return pool.slice(0, count);
};

/** 조커 1장 판매가 — 등급 반영, 상점 구매가(6G) 미만 */
export const getSellPriceJoker = (rarity: JokerRarity): number => {
  const byRarity: Record<JokerRarity, number> = {
    common: 2,
    uncommon: 3,
    rare: 4,
    legendary: 5,
  };
  return Math.min(byRarity[rarity], getShopJokerPrice(rarity) - 1);
};

const HAND_BASE_SCORES: Record<HandRank, number> = {
  high_card: 0,
  pair: 10,
  two_pair: 20,
  three: 30,
  straight: 40,
  full_house: 60,
  four: 80,
  five: 100,
  six: 120,
};

const MAX_HAND_CARDS = 3;
const BASE_DICE_COUNT = 5;

export const rollDie = (rng: () => number = Math.random): DiceValue =>
  (Math.floor(rng() * 6) + 1) as DiceValue;

export const rollDice = (count = BASE_DICE_COUNT, rng: () => number = Math.random): DiceRoll =>
  Array.from({ length: count }, () => rollDie(rng)) as DiceRoll;

export const rerollDiceAt = (
  dice: DiceRoll,
  indices: number[],
  rng: () => number = Math.random,
): DiceRoll => {
  const indexSet =
    indices.length > 0
      ? new Set(indices)
      : new Set(dice.map((_, index) => index));

  return dice.map((value, index) => (indexSet.has(index) ? rollDie(rng) : value)) as DiceRoll;
};

export const shuffle = <T,>(items: T[], rng: () => number = Math.random): T[] => {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const temp = nextItems[index];
    nextItems[index] = nextItems[swapIndex];
    nextItems[swapIndex] = temp;
  }

  return nextItems;
};

export const createStartingDeck = (rng: () => number = Math.random): DeckState => ({
  drawPile: shuffle(STARTING_DECK, rng),
  discardPile: [],
  hand: [],
});

export const discardHand = (deck: DeckState): DeckState => ({
  drawPile: [...deck.drawPile],
  discardPile: [...deck.discardPile, ...deck.hand],
  hand: [],
});

export const drawCards = (
  deck: DeckState,
  count = MAX_HAND_CARDS,
  rng: () => number = Math.random,
): DeckState => {
  let drawPile = [...deck.drawPile];
  let discardPile = [...deck.discardPile];
  const hand = [...deck.hand];

  while (hand.length < count) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) {
        break;
      }

      drawPile = shuffle(discardPile, rng);
      discardPile = [];
    }

    const nextCard = drawPile.shift();
    if (!nextCard) {
      break;
    }

    hand.push(nextCard);
  }

  return {
    drawPile,
    discardPile,
    hand,
  };
};

export const movePlayedCardToDiscard = (deck: DeckState, handIndex: number): DeckState => {
  const hand = [...deck.hand];
  const [playedCard] = hand.splice(handIndex, 1);

  if (!playedCard) {
    return deck;
  }

  return {
    drawPile: [...deck.drawPile],
    discardPile: [...deck.discardPile, playedCard],
    hand,
  };
};

export const removeCardFromDeck = (deck: DeckState, option: PurgeOption): DeckState => {
  const targetPile = option.zone === 'drawPile' ? [...deck.drawPile] : [...deck.discardPile];
  targetPile.splice(option.index, 1);

  return option.zone === 'drawPile'
    ? {
        drawPile: targetPile,
        discardPile: [...deck.discardPile],
        hand: [...deck.hand],
      }
    : {
        drawPile: [...deck.drawPile],
        discardPile: targetPile,
        hand: [...deck.hand],
      };
};

export const getPurgeableCards = (deck: DeckState): PurgeOption[] => [
  ...deck.drawPile.map((cardId, index) => ({
    zone: 'drawPile' as const,
    index,
    cardId,
  })),
  ...deck.discardPile.map((cardId, index) => ({
    zone: 'discardPile' as const,
    index,
    cardId,
  })),
];

export const evaluateHand = (dice: number[]): HandEvaluation => {
  const counts = new Map<number, number>();
  const sortedDice = [...dice].sort((left, right) => left - right);
  const uniqueSortedDice = [...new Set(sortedDice)];
  const total = sortedDice.reduce((sum, value) => sum + value, 0);

  sortedDice.forEach(value => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  const groupedCounts = [...counts.values()].sort((left, right) => right - left);
  let bestStraight: number[] | null = null;
  for (let startIndex = 0; startIndex <= uniqueSortedDice.length - 5; startIndex += 1) {
    const candidate = uniqueSortedDice.slice(startIndex, startIndex + 5);
    const isConsecutive = candidate.every(
      (value, index) => index === 0 || value - candidate[index - 1] === 1,
    );
    if (isConsecutive) {
      bestStraight = candidate;
    }
  }

  // 숨겨진 족보: 추가 주사위까지 포함해 전부 6이면 Six
  if (sortedDice.length === 6 && sortedDice.every(value => value === 6)) {
    return { rank: 'six', counts: groupedCounts, scoringDice: sortedDice, total };
  }

  if (groupedCounts[0] === 5) {
    return { rank: 'five', counts: groupedCounts, scoringDice: sortedDice, total };
  }

  if (groupedCounts[0] === 4) {
    return { rank: 'four', counts: groupedCounts, scoringDice: sortedDice, total };
  }

  if (
    groupedCounts[0] === 3 &&
    (groupedCounts[1] === 2 || groupedCounts[1] === 3)
  ) {
    return { rank: 'full_house', counts: groupedCounts, scoringDice: sortedDice, total };
  }

  if (bestStraight) {
    return {
      rank: 'straight',
      counts: groupedCounts,
      scoringDice: bestStraight,
      total: bestStraight.reduce((sum, value) => sum + value, 0),
    };
  }

  if (groupedCounts[0] === 3) {
    return { rank: 'three', counts: groupedCounts, scoringDice: sortedDice, total };
  }

  if (groupedCounts[0] === 2 && groupedCounts[1] === 2) {
    return { rank: 'two_pair', counts: groupedCounts, scoringDice: sortedDice, total };
  }

  if (groupedCounts[0] === 2) {
    return { rank: 'pair', counts: groupedCounts, scoringDice: sortedDice, total };
  }

  return { rank: 'high_card', counts: groupedCounts, scoringDice: sortedDice, total };
};

export const getActionCard = (cardId: string): ActionCardDefinition | undefined =>
  ACTION_CARDS.find(card => card.id === cardId);

export const getJoker = (jokerId: string): JokerDefinition | undefined =>
  JOKERS.find(joker => joker.id === jokerId);

export const getBoss = (bossId?: string) => BOSSES.find(boss => boss.id === bossId);

export const getActiveJokerIds = (jokerIds: string[], bossId?: string) => {
  const disabledSlots = getBoss(bossId)?.disabledJokerSlots ?? 0;
  const activeCount = Math.max(0, jokerIds.length - disabledSlots);

  return {
    activeJokerIds: jokerIds.slice(0, activeCount),
    disabledJokerIds: jokerIds.slice(activeCount),
  };
};

export const getHandStartBonus = (
  jokerIds: string[],
  bossId?: string,
  jokerProgress: JokerProgressMap = {},
  currentGold = 0,
) => {
  const { activeJokerIds } = getActiveJokerIds(jokerIds, bossId);
  let context: JokerEffectContext = {
    trigger: 'onHandStart',
    dice: [] as DiceRoll,
    scoringDice: [],
    currentGold,
    handRank: 'high_card',
    handBase: 0,
    diceBase: 0,
    bonusBase: 0,
    multiplier: 1,
    finalScore: 0,
    extraRerolls: 0,
    handSizeBonus: 0,
    diceCountBonus: 0,
    handRefreshes: 0,
    goldDelta: 0,
    jokerProgress,
    cardsPlayedThisHand: 0,
    goldSpentThisHand: 0,
    cardsSoldThisStage: 0,
    rerollsUsedThisHand: 0,
    shopPurchasesThisVisit: 0,
    interestGoldLastSettlement: 0,
    currentStageTarget: 0,
    remainingHands: 0,
    notes: [],
  };

  activeJokerIds.forEach(jokerId => {
    const joker = getJoker(jokerId);
    if (joker?.trigger === 'onHandStart') {
      context = joker.apply(context);
    }
  });

  return context;
};

const createBaseScoreContext = (
  dice: DiceRoll,
  handBonusBase = 0,
  handMultiplierBonus = 0,
  handNotes: string[] = [],
) => {
  const evaluation = evaluateHand(dice);

  return {
    // BossScoreContext/JokerEffectContext의 scoringDice는 number[] 기준이라 타입을 맞춰줍니다.
    scoringDice: [...evaluation.scoringDice],
    handRank: evaluation.rank,
    handBase: HAND_BASE_SCORES[evaluation.rank],
    diceBase: evaluation.total,
    bonusBase: handBonusBase,
    multiplier: 1 + handMultiplierBonus,
    notes: [...handNotes] as string[],
  };
};

const normalizeBossContext = (ctx: ReturnType<typeof createBaseScoreContext>) => {
  const evaluation = evaluateHand(ctx.scoringDice);

  return {
    ...ctx,
    scoringDice: [...evaluation.scoringDice],
    handRank: evaluation.rank,
    handBase: HAND_BASE_SCORES[evaluation.rank],
    diceBase: evaluation.total,
  };
};

export const scoreDice = ({
  dice,
  jokerIds,
  bossId,
  jokerProgress = {},
  currentGold = 0,
  cardsPlayedThisHand = 0,
  goldSpentThisHand = 0,
  cardsSoldThisStage = 0,
  rerollsUsedThisHand = 0,
  shopPurchasesThisVisit = 0,
  interestGoldLastSettlement = 0,
  currentStageTarget = 0,
  remainingHands = 0,
  handBonusBase = 0,
  handMultiplierBonus = 0,
  handNotes = [],
}: {
  dice: DiceRoll;
  jokerIds: string[];
  bossId?: string;
  jokerProgress?: JokerProgressMap;
  currentGold?: number;
  cardsPlayedThisHand?: number;
  goldSpentThisHand?: number;
  cardsSoldThisStage?: number;
  rerollsUsedThisHand?: number;
  shopPurchasesThisVisit?: number;
  interestGoldLastSettlement?: number;
  currentStageTarget?: number;
  remainingHands?: number;
  handBonusBase?: number;
  handMultiplierBonus?: number;
  handNotes?: string[];
}): ScoreResult => {
  const boss = getBoss(bossId);
  let scoreContext = createBaseScoreContext(dice, handBonusBase, handMultiplierBonus, handNotes);

  if (boss?.applyBeforeJokers) {
    scoreContext = normalizeBossContext(boss.applyBeforeJokers(scoreContext));
  }

  const { activeJokerIds, disabledJokerIds } = getActiveJokerIds(jokerIds, bossId);

  let beforeScoreContext: JokerEffectContext = {
    trigger: 'beforeScore',
    dice,
    scoringDice: scoreContext.scoringDice,
    currentGold,
    handRank: scoreContext.handRank,
    handBase: scoreContext.handBase,
    diceBase: scoreContext.diceBase,
    bonusBase: scoreContext.bonusBase,
    multiplier: scoreContext.multiplier,
    finalScore: 0,
    extraRerolls: 0,
    handSizeBonus: 0,
    diceCountBonus: 0,
    handRefreshes: 0,
    goldDelta: 0,
    jokerProgress,
    cardsPlayedThisHand,
    goldSpentThisHand,
    cardsSoldThisStage,
    rerollsUsedThisHand,
    shopPurchasesThisVisit,
    interestGoldLastSettlement,
    currentStageTarget,
    remainingHands,
    notes: scoreContext.notes,
  };

  activeJokerIds.forEach(jokerId => {
    const joker = getJoker(jokerId);
    if (joker?.trigger === 'beforeScore') {
      beforeScoreContext = joker.apply(beforeScoreContext);
    }
  });

  const finalScore = Math.max(
    0,
    (beforeScoreContext.handBase + beforeScoreContext.diceBase + beforeScoreContext.bonusBase) *
      beforeScoreContext.multiplier,
  );

  let afterScoreContext: JokerEffectContext = {
    ...beforeScoreContext,
    trigger: 'afterScore',
    finalScore,
  };

  activeJokerIds.forEach(jokerId => {
    const joker = getJoker(jokerId);
    if (joker?.trigger === 'afterScore') {
      afterScoreContext = joker.apply(afterScoreContext);
    }
  });

  return {
    handRank: afterScoreContext.handRank,
    handBase: afterScoreContext.handBase,
    diceBase: afterScoreContext.diceBase,
    bonusBase: afterScoreContext.bonusBase,
    multiplier: afterScoreContext.multiplier,
    finalScore,
    scoringDice: afterScoreContext.scoringDice,
    notes: afterScoreContext.notes,
    goldDelta: afterScoreContext.goldDelta,
    activeJokerIds,
    disabledJokerIds,
  };
};

export const createRewardOptions = ({
  ownedJokers,
  rng = Math.random,
}: {
  ownedJokers: string[];
  rng?: () => number;
}): RewardOption[] => {
  const jokerPool = shuffle(
    JOKERS.filter(joker => !ownedJokers.includes(joker.id)),
    rng,
  );
  const pickedCards = pickDistinctActionCards(1, rng);
  const options: RewardOption[] = [];

  if (jokerPool[0]) {
    options.push({
      id: `reward-joker-${jokerPool[0].id}`,
      type: 'joker',
      jokerId: jokerPool[0].id,
      title: jokerPool[0].name,
      description: jokerPool[0].description,
    });
  }

  if (pickedCards[0]) {
    options.push({
      id: `reward-card-${pickedCards[0].id}`,
      type: 'card',
      cardId: pickedCards[0].id,
      title: pickedCards[0].name,
      description: pickedCards[0].description,
    });
  }

  const utilityOptions = shuffle<RewardOption>(
    [
      {
        id: 'reward-gold-4',
        type: 'gold',
        amount: 4,
        title: 'Golden Cache',
        description: '즉시 골드 4를 획득합니다.',
      },
      {
        id: 'reward-remove',
        type: 'remove_card',
        title: 'Deck Trim',
        description: '덱에서 카드 1장을 제거합니다.',
      },
    ],
    rng,
  );

  options.push(...utilityOptions);

  return options.slice(0, 3);
};

export const createShopItems = ({
  ownedJokers,
  rerollPrice = SHOP_REROLL_BASE_PRICE,
  rng = Math.random,
}: {
  ownedJokers: string[];
  rerollPrice?: number;
  rng?: () => number;
}): ShopItem[] => {
  const hasMarketExpansion = ownedJokers.includes('shop_6_slot');
  const desiredCount = hasMarketExpansion ? 6 : 3;

  const jokerPool = shuffle(
    JOKERS.filter(joker => !ownedJokers.includes(joker.id)),
    rng,
  );
  const utilityItems = shuffle<ShopItem>(
    [
      {
        id: 'shop-remove',
        type: 'remove_card',
        title: 'Deck Trim',
        description: '덱에서 카드 1장을 제거합니다.',
        price: 4,
      },
      {
        id: 'shop-reroll',
        type: 'reroll',
        title: 'Shop Reroll',
        description: '상점 진열을 새로 섞습니다.',
        price: rerollPrice,
      },
    ],
    rng,
  );

  const items: ShopItem[] = [];

  // 기본 3칸: (조커 1) + (핸드카드 1) + (유틸 1)
  // Golden Touch 보유: (조커 2) + (핸드카드 3) + (유틸 1) = 6
  const maxJokers = hasMarketExpansion ? 2 : 1;
  const maxCards = hasMarketExpansion ? 3 : 1;

  for (let i = 0; i < maxJokers; i += 1) {
    const joker = jokerPool[i];
    if (!joker) break;
    items.push({
      id: `shop-joker-${joker.id}`,
      type: 'joker',
      jokerId: joker.id,
      title: joker.name,
      description: joker.description,
      price: getShopJokerPrice(joker.rarity),
    });
  }

  const shopCards = pickDistinctActionCards(maxCards, rng);
  shopCards.forEach(card => {
    items.push({
      id: `shop-card-${card.id}`,
      type: 'card',
      cardId: card.id,
      title: card.name,
      description: card.description,
      price: getShopActionCardPrice(card),
    });
  });

  if (rng() < SHOP_VOUCHER_CHANCE) {
    const voucherCards = pickDistinctVoucherCards(1, rng);
    voucherCards.forEach(card => {
      if (items.length >= desiredCount) {
        return;
      }
      items.push({
        id: `shop-card-${card.id}`,
        type: 'card',
        cardId: card.id,
        title: card.name,
        description: card.description,
        price: getShopActionCardPrice(card),
      });
    });
  }

  for (let i = 0; i < utilityItems.length && items.length < desiredCount; i += 1) {
    items.push(utilityItems[i]);
  }

  // UI는 row 기준으로 렌더링하므로 구매/선택 로직을 해치지 않는 범위에서 섞기만 합니다.
  return shuffle(items, rng).slice(0, desiredCount);
};
