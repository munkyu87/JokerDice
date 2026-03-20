import { ACTION_CARDS, BOSSES, JOKERS, STARTING_DECK } from './data';
import {
  ActionCardDefinition,
  DeckState,
  DiceRoll,
  DiceValue,
  HandEvaluation,
  HandRank,
  JokerDefinition,
  JokerEffectContext,
  PurgeOption,
  RewardOption,
  ScoreResult,
  ShopItem,
} from './types';

const HAND_BASE_SCORES: Record<HandRank, number> = {
  high_card: 0,
  pair: 10,
  two_pair: 20,
  three: 30,
  straight: 40,
  full_house: 60,
  four: 80,
  five: 100,
};

const MAX_HAND_CARDS = 3;

export const rollDie = (rng: () => number = Math.random): DiceValue =>
  (Math.floor(rng() * 6) + 1) as DiceValue;

export const rollDice = (count = 5, rng: () => number = Math.random): DiceRoll =>
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

  sortedDice.forEach(value => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  const groupedCounts = [...counts.values()].sort((left, right) => right - left);
  const isStraight =
    counts.size === 5 &&
    sortedDice.every((value, index) => index === 0 || value - sortedDice[index - 1] === 1);

  if (groupedCounts[0] === 5) {
    return { rank: 'five', counts: groupedCounts, total: sortedDice.reduce((sum, value) => sum + value, 0) };
  }

  if (groupedCounts[0] === 4) {
    return { rank: 'four', counts: groupedCounts, total: sortedDice.reduce((sum, value) => sum + value, 0) };
  }

  if (groupedCounts[0] === 3 && groupedCounts[1] === 2) {
    return { rank: 'full_house', counts: groupedCounts, total: sortedDice.reduce((sum, value) => sum + value, 0) };
  }

  if (isStraight) {
    return { rank: 'straight', counts: groupedCounts, total: sortedDice.reduce((sum, value) => sum + value, 0) };
  }

  if (groupedCounts[0] === 3) {
    return { rank: 'three', counts: groupedCounts, total: sortedDice.reduce((sum, value) => sum + value, 0) };
  }

  if (groupedCounts[0] === 2 && groupedCounts[1] === 2) {
    return { rank: 'two_pair', counts: groupedCounts, total: sortedDice.reduce((sum, value) => sum + value, 0) };
  }

  if (groupedCounts[0] === 2) {
    return { rank: 'pair', counts: groupedCounts, total: sortedDice.reduce((sum, value) => sum + value, 0) };
  }

  return { rank: 'high_card', counts: groupedCounts, total: sortedDice.reduce((sum, value) => sum + value, 0) };
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

export const getHandStartBonus = (jokerIds: string[], bossId?: string) => {
  const { activeJokerIds } = getActiveJokerIds(jokerIds, bossId);
  let context: JokerEffectContext = {
    trigger: 'onHandStart',
    dice: [] as DiceRoll,
    scoringDice: [],
    handRank: 'high_card',
    handBase: 0,
    diceBase: 0,
    bonusBase: 0,
    multiplier: 1,
    finalScore: 0,
    extraRerolls: 0,
    handSizeBonus: 0,
    handRefreshes: 0,
    goldDelta: 0,
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

const createBaseScoreContext = (dice: DiceRoll) => {
  const evaluation = evaluateHand(dice);

  return {
    scoringDice: [...dice],
    handRank: evaluation.rank,
    handBase: HAND_BASE_SCORES[evaluation.rank],
    diceBase: evaluation.total,
    bonusBase: 0,
    multiplier: 1,
    notes: [],
  };
};

const normalizeBossContext = (ctx: ReturnType<typeof createBaseScoreContext>) => {
  const evaluation = evaluateHand(ctx.scoringDice);

  return {
    ...ctx,
    handRank: evaluation.rank,
    handBase: HAND_BASE_SCORES[evaluation.rank],
    diceBase: ctx.scoringDice.reduce((sum, value) => sum + value, 0),
  };
};

export const scoreDice = ({
  dice,
  jokerIds,
  bossId,
}: {
  dice: DiceRoll;
  jokerIds: string[];
  bossId?: string;
}): ScoreResult => {
  const boss = getBoss(bossId);
  let scoreContext = createBaseScoreContext(dice);

  if (boss?.applyBeforeJokers) {
    scoreContext = normalizeBossContext(boss.applyBeforeJokers(scoreContext));
  }

  const { activeJokerIds, disabledJokerIds } = getActiveJokerIds(jokerIds, bossId);

  let beforeScoreContext: JokerEffectContext = {
    trigger: 'beforeScore',
    dice,
    scoringDice: scoreContext.scoringDice,
    handRank: scoreContext.handRank,
    handBase: scoreContext.handBase,
    diceBase: scoreContext.diceBase,
    bonusBase: scoreContext.bonusBase,
    multiplier: scoreContext.multiplier,
    finalScore: 0,
    extraRerolls: 0,
    goldDelta: 0,
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
  const cardPool = shuffle(ACTION_CARDS, rng);
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

  if (cardPool[0]) {
    options.push({
      id: `reward-card-${cardPool[0].id}`,
      type: 'card',
      cardId: cardPool[0].id,
      title: cardPool[0].name,
      description: cardPool[0].description,
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
  rng = Math.random,
}: {
  ownedJokers: string[];
  rng?: () => number;
}): ShopItem[] => {
  const jokerPool = shuffle(
    JOKERS.filter(joker => !ownedJokers.includes(joker.id)),
    rng,
  );
  const cardPool = shuffle(ACTION_CARDS, rng);
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
        price: 2,
      },
    ],
    rng,
  );

  const items: ShopItem[] = [];

  if (jokerPool[0]) {
    items.push({
      id: `shop-joker-${jokerPool[0].id}`,
      type: 'joker',
      jokerId: jokerPool[0].id,
      title: jokerPool[0].name,
      description: jokerPool[0].description,
      price: 6,
    });
  }

  if (cardPool[0]) {
    items.push({
      id: `shop-card-${cardPool[0].id}`,
      type: 'card',
      cardId: cardPool[0].id,
      title: cardPool[0].name,
      description: cardPool[0].description,
      price: 3,
    });
  }

  items.push(utilityItems[0]);

  return items;
};
