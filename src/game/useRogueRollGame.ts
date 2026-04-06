import { useEffect, useMemo, useState } from 'react';

import {
  BOSSES,
  MULTIPLIER_GROWTH_STEP,
  STAGES,
  getGrowthJokerValue,
  stepMultiplierGrowthProgress,
} from './data';
import {
  createRewardOptions,
  createShopItems,
  createStartingDeck,
  discardHand,
  drawCards,
  getActionCard,
  getActiveJokerIds,
  getBoss,
  getHandStartBonus,
  getPurgeableCards,
  getJoker,
  getSellPriceHandCard,
  getSellPriceJoker,
  movePlayedCardToDiscard,
  removeCardFromDeck,
  rerollDiceAt,
  rollDice,
  scoreDice,
  shuffle,
} from './engine';
import {
  DeckState,
  DiceRoll,
  LastScoringSummary,
  JokerProgressMap,
  PurgeOption,
  PurgeSource,
  RewardOption,
  ShopItem,
  StageSettlementSummary,
} from './types';

const MAX_JOKERS = 5;
const BASE_HAND_DRAW = 3;
const BASE_DICE_COUNT = 5;
const INTEREST_GOLD_STEP = 5;
const BASE_MAX_INTEREST_GOLD = 5;

const getStageClearInterest = (savedGold: number, maxInterestBonus = 0) =>
  Math.min(
    Math.floor(savedGold / INTEREST_GOLD_STEP),
    BASE_MAX_INTEREST_GOLD + maxInterestBonus,
  );

const getEffectiveBossId = (state: GameState) =>
  state.ignoredBossAnte === state.stage.ante && state.stage.stageIndex === STAGES.length - 1
    ? undefined
    : state.stage.bossId;

const getOwnedNegativeJokerIds = (jokerIds: string[], negativeJokerIds: string[]) =>
  negativeJokerIds.filter(jokerId => jokerIds.includes(jokerId));

const getOccupiedJokerSlots = (jokerIds: string[], negativeJokerIds: string[]) =>
  Math.max(0, jokerIds.length - getOwnedNegativeJokerIds(jokerIds, negativeJokerIds).length);

type StageState = {
  ante: number;
  stageIndex: number;
  currentScore: number;
  remainingHands: number;
  remainingRolls: number;
  bossId?: string;
};

type HandState = {
  dice: DiceRoll;
  diceAnimation: 'all' | number[];
  selectedDice: number[];
  cardsPlayed: number;
  goldSpent: number;
  rerollsUsed: number;
  freeRerolls: number;
  drawCount: number;
  handRefreshes: number;
  scoreBonusFromCards: number;
  multiplierBonusFromCards: number;
  scoreNotes: string[];
};

type Phase = 'playing' | 'settlement' | 'reward' | 'shop' | 'purge' | 'victory' | 'defeat';

type GameState = {
  phase: Phase;
  deck: DeckState;
  jokers: string[];
  negativeJokerIds: string[];
  gold: number;
  permanentHandSizeVoucherBonus: number;
  interestCapVoucherBonus: number;
  ignoredBossAnte?: number;
  stage: StageState;
  hand: HandState;
  rewardOptions: RewardOption[];
  shopItems: ShopItem[];
  jokerProgress: JokerProgressMap;
  shopRerollCount: number;
  shopPurchasesThisVisit: number;
  cardsSoldThisStage: number;
  interestGoldLastSettlement: number;
  shopReplaceItemId?: string;
  purgeSource?: PurgeSource;
  message: string;
  lastScore?: LastScoringSummary;
  settlement?: StageSettlementSummary;
};

export type RogueRollGameState = GameState;

const HANDS_PER_STAGE = 4;
const ROLLS_PER_STAGE = 3;
const STARTING_GOLD = 5;
const TOTAL_ANTES = 8;

const updateJokerProgressValue = (
  progress: JokerProgressMap,
  jokerId: string,
  updater: (current: number) => number,
): JokerProgressMap => ({
  ...progress,
  [jokerId]: updater(getGrowthJokerValue(jokerId, progress)),
});

const hydrateGameState = (
  startingJokerId: string,
  savedState?: RogueRollGameState,
): GameState => {
  if (!savedState) {
    return createInitialGameState(startingJokerId);
  }

  return {
    ...savedState,
    jokers: savedState.jokers ?? [startingJokerId],
    negativeJokerIds: savedState.negativeJokerIds ?? [],
    permanentHandSizeVoucherBonus: savedState.permanentHandSizeVoucherBonus ?? 0,
    interestCapVoucherBonus: savedState.interestCapVoucherBonus ?? 0,
    ignoredBossAnte: savedState.ignoredBossAnte,
    rewardOptions: savedState.rewardOptions ?? [],
    shopItems: savedState.shopItems ?? [],
    jokerProgress: savedState.jokerProgress ?? {},
    shopRerollCount: savedState.shopRerollCount ?? 0,
    shopPurchasesThisVisit: savedState.shopPurchasesThisVisit ?? 0,
    hand: {
      ...savedState.hand,
      cardsPlayed: savedState.hand?.cardsPlayed ?? 0,
      goldSpent: savedState.hand?.goldSpent ?? 0,
      rerollsUsed: savedState.hand?.rerollsUsed ?? 0,
      freeRerolls: savedState.hand?.freeRerolls ?? 0,
      drawCount: savedState.hand?.drawCount ?? BASE_HAND_DRAW,
      handRefreshes: savedState.hand?.handRefreshes ?? 0,
      scoreBonusFromCards: savedState.hand?.scoreBonusFromCards ?? 0,
      multiplierBonusFromCards: savedState.hand?.multiplierBonusFromCards ?? 0,
      scoreNotes: savedState.hand?.scoreNotes ?? [],
    },
    cardsSoldThisStage: savedState.cardsSoldThisStage ?? 0,
    interestGoldLastSettlement: savedState.interestGoldLastSettlement ?? 0,
  };
};

const applyEndOfHandGrowth = ({
  currentState,
  scoring,
  stageTarget,
  nextScore,
}: {
  currentState: GameState;
  scoring: ReturnType<typeof scoreDice>;
  stageTarget: number;
  nextScore: number;
}) => {
  const activeJokerIds = new Set(
    getActiveJokerIds(currentState.jokers, getEffectiveBossId(currentState)).activeJokerIds,
  );
  let nextProgress = currentState.jokerProgress;

  if (activeJokerIds.has('pair_savings') && scoring.handRank === 'pair') {
    nextProgress = updateJokerProgressValue(nextProgress, 'pair_savings', current => current + 3);
  }
  if (activeJokerIds.has('twin_engine') && scoring.handRank === 'two_pair') {
    nextProgress = updateJokerProgressValue(nextProgress, 'twin_engine', current =>
      stepMultiplierGrowthProgress(current, 1),
    );
  }
  if (activeJokerIds.has('house_keeper') && scoring.handRank === 'full_house') {
    nextProgress = updateJokerProgressValue(nextProgress, 'house_keeper', current => current + 10);
  }
  if (activeJokerIds.has('straight_scholar') && scoring.handRank === 'straight') {
    nextProgress = updateJokerProgressValue(nextProgress, 'straight_scholar', current => current + 15);
  }
  if (activeJokerIds.has('six_cult') && scoring.scoringDice.includes(6)) {
    nextProgress = updateJokerProgressValue(nextProgress, 'six_cult', current => current + 4);
  }
  if (activeJokerIds.has('burn_count') && currentState.hand.cardsPlayed >= 2) {
    nextProgress = updateJokerProgressValue(nextProgress, 'burn_count', current => current + 1);
  }
  if (
    activeJokerIds.has('perfect_grip') &&
    currentState.hand.cardsPlayed === 0 &&
    currentState.hand.rerollsUsed === 0
  ) {
    nextProgress = updateJokerProgressValue(nextProgress, 'perfect_grip', current => current + 6);
  }
  if (activeJokerIds.has('all_in')) {
    const overkill = scoring.finalScore - stageTarget;
    if (overkill >= 100) {
      nextProgress = updateJokerProgressValue(
        nextProgress,
        'all_in',
        current => current + Math.floor(overkill / 100) * 4,
      );
    }
  }
  if (activeJokerIds.has('glass_joker')) {
    nextProgress = updateJokerProgressValue(nextProgress, 'glass_joker', current =>
      scoring.finalScore >= 60 ? stepMultiplierGrowthProgress(current, 2) : MULTIPLIER_GROWTH_STEP,
    );
  }
  if (
    activeJokerIds.has('last_chance') &&
    currentState.stage.remainingHands <= 1 &&
    nextScore >= stageTarget
  ) {
    nextProgress = updateJokerProgressValue(nextProgress, 'last_chance', current => current + 12);
  }

  return nextProgress;
};

const applyStageClearGrowth = (currentState: GameState, interestGold: number) => {
  const activeJokerIds = new Set(
    getActiveJokerIds(currentState.jokers, getEffectiveBossId(currentState)).activeJokerIds,
  );
  if (!activeJokerIds.has('piggy_bank') || interestGold <= 0) {
    return currentState.jokerProgress;
  }

  return updateJokerProgressValue(currentState.jokerProgress, 'piggy_bank', current => current + 5);
};

const applyShopPurchaseGrowth = (currentState: GameState) => {
  const activeJokerIds = new Set(
    getActiveJokerIds(currentState.jokers, getEffectiveBossId(currentState)).activeJokerIds,
  );
  if (!activeJokerIds.has('golden_habit')) {
    return currentState.jokerProgress;
  }

  return updateJokerProgressValue(currentState.jokerProgress, 'golden_habit', current =>
    stepMultiplierGrowthProgress(current, 1),
  );
};

const applySkipShopGrowth = (currentState: GameState) => {
  const activeJokerIds = new Set(
    getActiveJokerIds(currentState.jokers, getEffectiveBossId(currentState)).activeJokerIds,
  );
  if (!activeJokerIds.has('frugal_mask') || currentState.shopPurchasesThisVisit > 0) {
    return currentState.jokerProgress;
  }

  return updateJokerProgressValue(currentState.jokerProgress, 'frugal_mask', current => current + 6);
};


const getStageDefinitionForProgress = (ante: number, stageIndex: number) => {
  const baseStage = STAGES[stageIndex];
  const anteGrowth =
    1 +
    (ante - 1) * 0.48 +
    Math.max(0, ante - 3) * 0.08 +
    Math.max(0, ante - 6) * 0.12;
  const rewardBonus = Math.floor((ante - 1) / 2) + (stageIndex === STAGES.length - 1 ? 1 : 0);

  return {
    ...baseStage,
    targetScore: Math.round(baseStage.targetScore * anteGrowth),
    rewardGold: baseStage.rewardGold + rewardBonus,
  };
};

const getBossIdForStage = (stageIndex: number, rng: () => number) => {
  if (stageIndex !== STAGES.length - 1) {
    return undefined;
  }

  return shuffle(BOSSES, rng)[0]?.id;
};

const beginHand = ({
  deck,
  jokers,
  bossId,
  permanentHandSizeVoucherBonus,
  jokerProgress,
  currentGold,
  rng,
}: {
  deck: DeckState;
  jokers: string[];
  bossId?: string;
  permanentHandSizeVoucherBonus: number;
  jokerProgress: JokerProgressMap;
  currentGold: number;
  rng: () => number;
}) => {
  const resetDeck = discardHand(deck);
  const handStartBonus = getHandStartBonus(jokers, bossId, jokerProgress, currentGold);
  const drawCount = BASE_HAND_DRAW + permanentHandSizeVoucherBonus + handStartBonus.handSizeBonus;
  const preparedDeck = drawCards(resetDeck, drawCount, rng);
  const diceCount = BASE_DICE_COUNT + handStartBonus.diceCountBonus;

  return {
    deck: preparedDeck,
    hand: {
      dice: rollDice(diceCount, rng),
      diceAnimation: 'all' as const,
      selectedDice: [],
      cardsPlayed: 0,
      goldSpent: 0,
      rerollsUsed: 0,
      freeRerolls: handStartBonus.extraRerolls,
      drawCount,
      handRefreshes: handStartBonus.handRefreshes,
      scoreBonusFromCards: 0,
      multiplierBonusFromCards: 0,
      scoreNotes: [],
    },
    message:
      handStartBonus.notes[0] ?? '새 Hand가 시작되었습니다. 주사위를 선택해서 리롤하거나 카드를 사용하세요.',
    goldDelta: handStartBonus.goldDelta,
  };
};

const createInitialGameState = (
  startingJokerId: string = 'lucky_reroll',
  rng: () => number = Math.random,
): GameState => {
  const startingJokers = [startingJokerId];
  const bossId = getBossIdForStage(0, rng);
  const startingDeck = createStartingDeck(rng);
  const opening = beginHand({
    deck: startingDeck,
    jokers: startingJokers,
    bossId,
    permanentHandSizeVoucherBonus: 0,
    jokerProgress: {},
    currentGold: STARTING_GOLD,
    rng,
  });

  return {
    phase: 'playing',
    deck: opening.deck,
    jokers: [...startingJokers],
    negativeJokerIds: [],
    permanentHandSizeVoucherBonus: 0,
    interestCapVoucherBonus: 0,
    ignoredBossAnte: undefined,
    stage: {
      ante: 1,
      stageIndex: 0,
      currentScore: 0,
      remainingHands: HANDS_PER_STAGE,
      remainingRolls: ROLLS_PER_STAGE,
      bossId,
    },
    hand: opening.hand,
    rewardOptions: [],
    shopItems: [],
    jokerProgress: {},
    shopRerollCount: 0,
    shopPurchasesThisVisit: 0,
    cardsSoldThisStage: 0,
    interestGoldLastSettlement: 0,
    gold: STARTING_GOLD + opening.goldDelta,
    message: opening.message,
  };
};

export const useRogueRollGame = (
  startingJokerId: string = 'lucky_reroll',
  options?: {
    initialState?: RogueRollGameState;
    onStateChange?: (state: RogueRollGameState) => void;
  },
) => {
  const initialState = options?.initialState;
  const onStateChange = options?.onStateChange;
  const [state, setState] = useState<GameState>(() =>
    hydrateGameState(startingJokerId, initialState),
  );

  const stageDefinition = getStageDefinitionForProgress(state.stage.ante, state.stage.stageIndex);
  const effectiveBossId = getEffectiveBossId(state);
  const boss = getBoss(state.stage.bossId);

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  const previewScore = useMemo(
    () =>
      scoreDice({
        dice: state.hand.dice,
        jokerIds: state.jokers,
        bossId: effectiveBossId,
        jokerProgress: state.jokerProgress,
        currentGold: state.gold,
        cardsPlayedThisHand: state.hand.cardsPlayed,
        goldSpentThisHand: state.hand.goldSpent,
        cardsSoldThisStage: state.cardsSoldThisStage,
        rerollsUsedThisHand: state.hand.rerollsUsed,
        shopPurchasesThisVisit: state.shopPurchasesThisVisit,
        interestGoldLastSettlement: state.interestGoldLastSettlement,
        currentStageTarget: stageDefinition.targetScore,
        remainingHands: state.stage.remainingHands,
        handBonusBase: state.hand.scoreBonusFromCards,
        handMultiplierBonus: state.hand.multiplierBonusFromCards,
        handNotes: state.hand.scoreNotes,
      }),
    [
      stageDefinition.targetScore,
      state.hand.cardsPlayed,
      state.hand.dice,
      state.hand.goldSpent,
      state.hand.multiplierBonusFromCards,
      state.hand.rerollsUsed,
      state.hand.scoreBonusFromCards,
      state.hand.scoreNotes,
      state.cardsSoldThisStage,
      state.gold,
      state.interestGoldLastSettlement,
      state.jokerProgress,
      state.jokers,
      state.shopPurchasesThisVisit,
      effectiveBossId,
      state.stage.remainingHands,
    ],
  );

  const purgeOptions = useMemo(() => getPurgeableCards(state.deck), [state.deck]);

  const toggleDie = (index: number) => {
    if (state.phase !== 'playing') {
      return;
    }

    setState(currentState => {
      const isSelected = currentState.hand.selectedDice.includes(index);

      return {
        ...currentState,
        hand: {
          ...currentState.hand,
          selectedDice: isSelected
            ? currentState.hand.selectedDice.filter(value => value !== index)
            : [...currentState.hand.selectedDice, index].sort((left, right) => left - right),
        },
      };
    });
  };

  const selectAllDice = () => {
    if (state.phase !== 'playing') {
      return;
    }

    setState(currentState => ({
      ...currentState,
      hand: {
        ...currentState.hand,
        selectedDice: currentState.hand.dice.map((_, index) => index),
      },
    }));
  };

  const rerollSelectedDice = () => {
    if (state.phase !== 'playing') {
      return;
    }

    setState(currentState => {
      if (currentState.hand.freeRerolls === 0 && currentState.stage.remainingRolls === 0) {
        return {
          ...currentState,
          message: '남은 리롤이 없습니다.',
        };
      }

      const selectedDice =
        currentState.hand.selectedDice.length > 0
          ? currentState.hand.selectedDice
          : currentState.hand.dice.map((_, index) => index);
      const nextDice = rerollDiceAt(currentState.hand.dice, selectedDice);
      const activeJokerIds = getActiveJokerIds(
        currentState.jokers,
        getEffectiveBossId(currentState),
      ).activeJokerIds;
      const nextJokerProgress = activeJokerIds.includes('reroll_ledger')
        ? updateJokerProgressValue(currentState.jokerProgress, 'reroll_ledger', current =>
            stepMultiplierGrowthProgress(current, 1),
          )
        : currentState.jokerProgress;
      const rerollGold = activeJokerIds.includes('loose_change') ? 1 : 0;

      return {
        ...currentState,
        gold: currentState.gold + rerollGold,
        jokerProgress: nextJokerProgress,
        hand: {
          ...currentState.hand,
          dice: nextDice,
          diceAnimation: selectedDice.length === currentState.hand.dice.length ? 'all' : selectedDice,
          selectedDice: [],
          rerollsUsed: currentState.hand.rerollsUsed + 1,
          freeRerolls: Math.max(0, currentState.hand.freeRerolls - 1),
        },
        stage: {
          ...currentState.stage,
          remainingRolls:
            currentState.hand.freeRerolls > 0
              ? currentState.stage.remainingRolls
              : Math.max(0, currentState.stage.remainingRolls - 1),
        },
        message:
          currentState.hand.freeRerolls > 0
            ? rerollGold > 0
              ? '무료 리롤을 사용했습니다. Loose Change로 1G를 획득했습니다.'
              : '무료 리롤을 사용했습니다.'
            : rerollGold > 0
              ? '선택한 주사위를 다시 굴렸습니다. Loose Change로 1G를 획득했습니다.'
              : '선택한 주사위를 다시 굴렸습니다.',
      };
    });
  };

  const refreshHandCards = () => {
    if (state.phase !== 'playing') {
      return;
    }

    setState(currentState => {
      if (currentState.hand.handRefreshes <= 0) {
        return {
          ...currentState,
          message: '남은 손패 교체가 없습니다.',
        };
      }

      const discardedHandDeck = discardHand(currentState.deck);
      const nextDeck = drawCards(discardedHandDeck, currentState.hand.drawCount, Math.random);

      return {
        ...currentState,
        deck: nextDeck,
        hand: {
          ...currentState.hand,
          handRefreshes: currentState.hand.handRefreshes - 1,
        },
        message: '손패를 새로 교체했습니다.',
      };
    });
  };

  const playCard = (handIndex: number) => {
    if (state.phase !== 'playing') {
      return;
    }

    setState(currentState => {
      const cardId = currentState.deck.hand[handIndex];
      const card = getActionCard(cardId);
      if (!card) {
        return {
          ...currentState,
          message: '카드 정보를 찾지 못했습니다.',
        };
      }

      const result = card.apply({
        dice: currentState.hand.dice,
        selectedDice: currentState.hand.selectedDice,
        rollDiceAt: (dice, indices) => rerollDiceAt(dice, indices),
        jokerIds: currentState.jokers,
        negativeJokerIds: currentState.negativeJokerIds,
        currentGold: currentState.gold,
        rng: Math.random,
      });

      if (!result.ok) {
        return {
          ...currentState,
          message: result.message,
        };
      }

      const changedIndices = result.dice.reduce<number[]>((indices, value, index) => {
        if (currentState.hand.dice[index] !== value) {
          indices.push(index);
        }
        return indices;
      }, []);

      const nextNegativeJokerIds = result.negativeJokerId
        ? Array.from(
            new Set(
              getOwnedNegativeJokerIds(currentState.jokers, [
                ...currentState.negativeJokerIds,
                result.negativeJokerId,
              ]),
            ),
          )
        : currentState.negativeJokerIds;
      const negativeJokerName = result.negativeJokerId ? getJoker(result.negativeJokerId)?.name : undefined;
      const nextJokerProgress = getActiveJokerIds(
        currentState.jokers,
        getEffectiveBossId(currentState),
      ).activeJokerIds.includes('card_sharp')
        ? updateJokerProgressValue(currentState.jokerProgress, 'card_sharp', current => current + 2)
        : currentState.jokerProgress;
      const spentGold = result.goldCost ?? 0;
      const baseDeck = card.consumable
        ? {
            ...currentState.deck,
            hand: currentState.deck.hand.filter((_, index) => index !== handIndex),
          }
        : movePlayedCardToDiscard(currentState.deck, handIndex);
      const nextDeck =
        result.drawCards && result.drawCards > 0
          ? drawCards(baseDeck, baseDeck.hand.length + result.drawCards, Math.random)
          : baseDeck;

      return {
        ...currentState,
        deck: nextDeck,
        gold: currentState.gold - spentGold,
        negativeJokerIds: nextNegativeJokerIds,
        jokerProgress: nextJokerProgress,
        permanentHandSizeVoucherBonus:
          currentState.permanentHandSizeVoucherBonus + (result.handSizeVoucherDelta ?? 0),
        interestCapVoucherBonus:
          currentState.interestCapVoucherBonus + (result.interestCapVoucherDelta ?? 0),
        ignoredBossAnte: result.ignoreBossForCurrentAnte ? currentState.stage.ante : currentState.ignoredBossAnte,
        hand: {
          ...currentState.hand,
          dice: result.dice,
          diceAnimation: changedIndices,
          selectedDice: [],
          cardsPlayed: currentState.hand.cardsPlayed + 1,
          goldSpent: currentState.hand.goldSpent + spentGold,
          scoreBonusFromCards: currentState.hand.scoreBonusFromCards + (result.scoreBonusDelta ?? 0),
          multiplierBonusFromCards:
            currentState.hand.multiplierBonusFromCards + (result.multiplierDelta ?? 0),
          scoreNotes: result.scoreNote
            ? [...currentState.hand.scoreNotes, result.scoreNote]
            : currentState.hand.scoreNotes,
        },
        message: negativeJokerName
          ? `${negativeJokerName} 조커가 네거티브가 되어 슬롯을 차지하지 않게 되었습니다.`
          : result.message,
      };
    });
  };

  const moveToNextStage = (currentState: GameState): GameState => {
    const isLastStageInAnte = currentState.stage.stageIndex === STAGES.length - 1;
    const nextStageIndex = isLastStageInAnte ? 0 : currentState.stage.stageIndex + 1;
    const nextAnte = isLastStageInAnte ? currentState.stage.ante + 1 : currentState.stage.ante;
    const bossId = getBossIdForStage(nextStageIndex, Math.random);
    const effectiveNextBossId =
      currentState.ignoredBossAnte === nextAnte && nextStageIndex === STAGES.length - 1
        ? undefined
        : bossId;
    const nextStageDefinition = getStageDefinitionForProgress(nextAnte, nextStageIndex);
    const opening = beginHand({
      deck: currentState.deck,
      jokers: currentState.jokers,
      bossId: effectiveNextBossId,
      permanentHandSizeVoucherBonus: currentState.permanentHandSizeVoucherBonus,
      jokerProgress: currentState.jokerProgress,
      currentGold: currentState.gold,
      rng: Math.random,
    });

    return {
      ...currentState,
      phase: 'playing',
      deck: opening.deck,
      ignoredBossAnte: isLastStageInAnte ? undefined : currentState.ignoredBossAnte,
      shopReplaceItemId: undefined,
      stage: {
        ante: nextAnte,
        stageIndex: nextStageIndex,
        currentScore: 0,
        remainingHands: HANDS_PER_STAGE,
        remainingRolls: ROLLS_PER_STAGE,
        bossId,
      },
      hand: opening.hand,
      rewardOptions: [],
      shopItems: [],
      shopPurchasesThisVisit: 0,
      cardsSoldThisStage: 0,
      shopRerollCount: 0,
      purgeSource: undefined,
      interestGoldLastSettlement: currentState.interestGoldLastSettlement,
      gold: currentState.gold + opening.goldDelta,
      message: `Ante ${nextAnte} ${nextStageDefinition.name} 시작. ${opening.message}`,
      lastScore: currentState.lastScore,
    };
  };

  const submitHand = () => {
    if (state.phase !== 'playing') {
      return;
    }

    setState(currentState => {
      const currentStageDefinition = getStageDefinitionForProgress(
        currentState.stage.ante,
        currentState.stage.stageIndex,
      );
      const scoring = scoreDice({
        dice: currentState.hand.dice,
        jokerIds: currentState.jokers,
        bossId: getEffectiveBossId(currentState),
        jokerProgress: currentState.jokerProgress,
        currentGold: currentState.gold,
        cardsPlayedThisHand: currentState.hand.cardsPlayed,
        goldSpentThisHand: currentState.hand.goldSpent,
        cardsSoldThisStage: currentState.cardsSoldThisStage,
        rerollsUsedThisHand: currentState.hand.rerollsUsed,
        shopPurchasesThisVisit: currentState.shopPurchasesThisVisit,
        interestGoldLastSettlement: currentState.interestGoldLastSettlement,
        currentStageTarget: currentStageDefinition.targetScore,
        remainingHands: currentState.stage.remainingHands,
        handBonusBase: currentState.hand.scoreBonusFromCards,
        handMultiplierBonus: currentState.hand.multiplierBonusFromCards,
        handNotes: currentState.hand.scoreNotes,
      });

      const nextScore = currentState.stage.currentScore + scoring.finalScore;
      const remainingHands = currentState.stage.remainingHands - 1;
      const gainedGold = scoring.goldDelta;
      const rng = Math.random;
      const nextJokerProgress = applyEndOfHandGrowth({
        currentState,
        scoring,
        stageTarget: currentStageDefinition.targetScore,
        nextScore,
      });

      const baseProgress: Pick<GameState, 'gold' | 'lastScore' | 'jokerProgress'> = {
        gold: currentState.gold + gainedGold,
        jokerProgress: nextJokerProgress,
        lastScore: {
          ...scoring,
          gainedGold,
        },
      };

      if (nextScore >= currentStageDefinition.targetScore) {
        const clearedDeck = discardHand(currentState.deck);
        const updatedState: GameState = {
          ...currentState,
          deck: clearedDeck,
          ...baseProgress,
        };
        const stageRewardGold = currentStageDefinition.rewardGold;
        const spareHands = remainingHands;
        const spareRolls = currentState.stage.remainingRolls;
        const efficiencyBonusGold = spareHands + spareRolls;
        const goldBeforeHand = currentState.gold;
        const interestGold = getStageClearInterest(
          goldBeforeHand,
          currentState.interestCapVoucherBonus,
        );
        const stageClearGrowth = applyStageClearGrowth(
          {
            ...currentState,
            jokerProgress: nextJokerProgress,
          },
          interestGold,
        );
        const goldAfter =
          updatedState.gold + stageRewardGold + efficiencyBonusGold + interestGold;
        const isRunComplete =
          currentState.stage.ante === TOTAL_ANTES &&
          currentState.stage.stageIndex === STAGES.length - 1;
        const isBossStageClear = currentState.stage.stageIndex === STAGES.length - 1;

        const pendingRewardOptions = isRunComplete || !isBossStageClear
          ? []
          : createRewardOptions({ ownedJokers: currentState.jokers });

        const settlement: StageSettlementSummary = {
          ante: currentState.stage.ante,
          stageIndex: currentState.stage.stageIndex,
          stageName: currentStageDefinition.name,
          targetScore: currentStageDefinition.targetScore,
          spareHands,
          spareRolls,
          efficiencyGold: efficiencyBonusGold,
          interestGold,
          blindRewardGold: stageRewardGold,
          handScoreGold: gainedGold,
          goldBeforeHand,
          goldAfter,
          isRunComplete,
          pendingRewardOptions,
        };

        const clearedStageState: GameState = {
          ...updatedState,
          jokerProgress: stageClearGrowth,
          gold: goldAfter,
          stage: {
            ...updatedState.stage,
            currentScore: nextScore,
            remainingHands,
          },
          interestGoldLastSettlement: interestGold,
          settlement,
          rewardOptions: [],
          message: isRunComplete
            ? `Ante ${TOTAL_ANTES} Boss Blind 클리어. 정산을 확인한 뒤 런 완료 화면으로 이동합니다.`
            : isBossStageClear
              ? `${currentStageDefinition.name} 클리어. 정산을 확인한 뒤 보상을 선택하세요.`
              : `${currentStageDefinition.name} 클리어. 정산을 확인한 뒤 상점으로 이동합니다.`,
        };

        return {
          ...clearedStageState,
          phase: 'settlement',
        };
      }

      if (remainingHands <= 0) {
        const clearedDeck = discardHand(currentState.deck);
        return {
          ...currentState,
          deck: clearedDeck,
          ...baseProgress,
          phase: 'defeat',
          stage: {
            ...currentState.stage,
            currentScore: nextScore,
            remainingHands: 0,
          },
          message: '목표 점수를 넘기지 못해 이번 런이 종료되었습니다.',
        };
      }

      // 같은 스테이지 내 다음 Hand: 손패(덱의 hand)는 유지하고 주사위만 새로 굴림. 덱 셔플·추가 드로우는 스테이지 클리어 후 다음 스테이지에서만.
      const handStartBonus = getHandStartBonus(
        currentState.jokers,
        getEffectiveBossId(currentState),
        nextJokerProgress,
        currentState.gold,
      );
      const drawCount = BASE_HAND_DRAW + handStartBonus.handSizeBonus;
      const diceCount = BASE_DICE_COUNT + handStartBonus.diceCountBonus;

      const { activeJokerIds } = getActiveJokerIds(
        currentState.jokers,
        getEffectiveBossId(currentState),
      );
      let deckAfterGapFill = currentState.deck;
      let gapFillNote = '';
      if (
        activeJokerIds.includes('gap_draw') &&
        deckAfterGapFill.hand.length < drawCount
      ) {
        deckAfterGapFill = drawCards(
          deckAfterGapFill,
          Math.min(deckAfterGapFill.hand.length + 1, drawCount),
          rng,
        );
        if (deckAfterGapFill.hand.length > currentState.deck.hand.length) {
          gapFillNote = ' Gap Fill: 빈 슬롯을 덱에서 1장 채웠습니다.';
        }
      }

      return {
        ...currentState,
        ...baseProgress,
        deck: deckAfterGapFill,
        stage: {
          ...currentState.stage,
          currentScore: nextScore,
          remainingHands,
        },
        hand: {
          dice: rollDice(diceCount, rng),
          diceAnimation: 'all' as const,
          selectedDice: [],
          cardsPlayed: 0,
          goldSpent: 0,
          rerollsUsed: 0,
          freeRerolls: handStartBonus.extraRerolls,
          drawCount,
          handRefreshes: handStartBonus.handRefreshes,
          scoreBonusFromCards: 0,
          multiplierBonusFromCards: 0,
          scoreNotes: [],
        },
        gold: currentState.gold + gainedGold + handStartBonus.goldDelta,
        message: `Hand 점수 ${scoring.finalScore}. 같은 손패로 다음 라운드를 진행합니다.${gapFillNote}`,
      };
    });
  };

  const applyReward = (reward: RewardOption) => {
    if (state.phase !== 'reward') {
      return;
    }

    setState(currentState => {
      let nextState: GameState = {
        ...currentState,
        rewardOptions: [],
      };

      if (reward.type === 'joker') {
        if (getOccupiedJokerSlots(currentState.jokers, currentState.negativeJokerIds) >= MAX_JOKERS) {
          nextState = {
            ...nextState,
            message: '조커 슬롯이 가득 차서 이번 보상은 골드로 대체됩니다.',
            gold: currentState.gold + 3,
          };
        } else {
          nextState = {
            ...nextState,
            jokers: [...currentState.jokers, reward.jokerId],
            message: `${reward.title} 조커를 획득했습니다.`,
          };
        }
      }

      if (reward.type === 'card') {
        nextState = {
          ...nextState,
          deck: {
            ...currentState.deck,
            discardPile: [...currentState.deck.discardPile, reward.cardId],
          },
          message: `${reward.title} 카드를 덱에 추가했습니다.`,
        };
      }

      if (reward.type === 'gold') {
        nextState = {
          ...nextState,
          gold: currentState.gold + reward.amount,
          message: `골드 ${reward.amount}를 획득했습니다.`,
        };
      }

      if (reward.type === 'remove_card') {
        return {
          ...nextState,
          phase: 'purge',
          purgeSource: 'reward',
          message: '덱에서 제거할 카드를 선택하세요.',
        };
      }

      return {
        ...nextState,
        phase: 'shop',
        shopItems: createShopItems({ ownedJokers: nextState.jokers }),
        shopRerollCount: 0,
        shopPurchasesThisVisit: 0,
        shopReplaceItemId: undefined,
      };
    });
  };

  const buyShopItem = (item: ShopItem) => {
    if (state.phase !== 'shop') {
      return;
    }

    setState(currentState => {
      if (currentState.gold < item.price) {
        return {
          ...currentState,
          message: '골드가 부족합니다.',
        };
      }

      const nextJokerProgress = applyShopPurchaseGrowth(currentState);
      const nextShopPurchaseCount = currentState.shopPurchasesThisVisit + 1;

      if (item.type === 'reroll') {
        return {
          ...currentState,
          gold: currentState.gold - item.price,
          jokerProgress: nextJokerProgress,
          shopItems: createShopItems({
            ownedJokers: currentState.jokers,
            rerollPrice: item.price + 1,
          }),
          shopRerollCount: currentState.shopRerollCount + 1,
          shopPurchasesThisVisit: nextShopPurchaseCount,
          shopReplaceItemId: undefined,
          message: '상점을 새로 고쳤습니다.',
        };
      }

      if (item.type === 'remove_card') {
        return {
          ...currentState,
          gold: currentState.gold - item.price,
          jokerProgress: nextJokerProgress,
          phase: 'purge',
          shopItems: currentState.shopItems.filter(shopItem => shopItem.id !== item.id),
          shopPurchasesThisVisit: nextShopPurchaseCount,
          shopReplaceItemId: undefined,
          purgeSource: 'shop',
          message: '덱에서 제거할 카드를 선택하세요.',
        };
      }

      if (item.type === 'joker') {
        if (getOccupiedJokerSlots(currentState.jokers, currentState.negativeJokerIds) >= MAX_JOKERS) {
          return {
            ...currentState,
            shopReplaceItemId: item.id,
            message: `${item.title} 구매를 위해 교체할 조커를 선택하세요.`,
          };
        }

        return {
          ...currentState,
          gold: currentState.gold - item.price,
          jokerProgress: nextJokerProgress,
          jokers: [...currentState.jokers, item.jokerId],
          shopItems: currentState.shopItems.filter(shopItem => shopItem.id !== item.id),
          shopPurchasesThisVisit: nextShopPurchaseCount,
          shopReplaceItemId: undefined,
          message: `${item.title} 조커를 구매했습니다.`,
        };
      }

      return {
        ...currentState,
        gold: currentState.gold - item.price,
        jokerProgress: nextJokerProgress,
        deck: {
          ...currentState.deck,
          discardPile: [...currentState.deck.discardPile, item.cardId],
        },
        shopItems: currentState.shopItems.filter(shopItem => shopItem.id !== item.id),
        shopPurchasesThisVisit: nextShopPurchaseCount,
        shopReplaceItemId: undefined,
        message: `${item.title} 카드를 구매했습니다.`,
      };
    });
  };

  const replaceShopJoker = (slotIndex: number) => {
    if (state.phase !== 'shop') {
      return;
    }

    setState(currentState => {
      if (currentState.phase !== 'shop' || !currentState.shopReplaceItemId) {
        return currentState;
      }

      const item = currentState.shopItems.find(shopItem => shopItem.id === currentState.shopReplaceItemId);
      if (!item || item.type !== 'joker') {
        return {
          ...currentState,
          shopReplaceItemId: undefined,
          message: '교체할 상점 조커를 찾지 못했습니다.',
        };
      }

      if (currentState.gold < item.price) {
        return {
          ...currentState,
          shopReplaceItemId: undefined,
          message: '골드가 부족합니다.',
        };
      }

      const replacedJokerId = currentState.jokers[slotIndex];
      if (!replacedJokerId) {
        return {
          ...currentState,
          message: '교체할 조커를 선택하세요.',
        };
      }

      const nextJokers = [...currentState.jokers];
      nextJokers[slotIndex] = item.jokerId;
      const replacedJokerName = getJoker(replacedJokerId)?.name ?? '기존 조커';
      const purchasedGrowth = applyShopPurchaseGrowth(currentState);
      const { [replacedJokerId]: _removedProgress, ...nextJokerProgress } = purchasedGrowth;

      return {
        ...currentState,
        gold: currentState.gold - item.price,
        jokerProgress: nextJokerProgress,
        jokers: nextJokers,
        negativeJokerIds: currentState.negativeJokerIds.filter(id => id !== replacedJokerId),
        shopItems: currentState.shopItems.filter(shopItem => shopItem.id !== item.id),
        shopPurchasesThisVisit: currentState.shopPurchasesThisVisit + 1,
        shopReplaceItemId: undefined,
        message: `${replacedJokerName} 대신 ${item.title} 조커를 구매했습니다.`,
      };
    });
  };

  const cancelShopJokerReplace = () => {
    setState(currentState => {
      if (currentState.phase !== 'shop' || !currentState.shopReplaceItemId) {
        return currentState;
      }

      return {
        ...currentState,
        shopReplaceItemId: undefined,
        message: '조커 교체를 취소했습니다.',
      };
    });
  };

  const removeDeckCard = (option: PurgeOption) => {
    if (state.phase !== 'purge') {
      return;
    }

    setState(currentState => {
      const nextDeck = removeCardFromDeck(currentState.deck, option);

      if (currentState.purgeSource === 'reward') {
        return {
          ...currentState,
          deck: nextDeck,
          phase: 'shop',
          shopRerollCount: 0,
          shopPurchasesThisVisit: 0,
          shopReplaceItemId: undefined,
          purgeSource: undefined,
          shopItems: createShopItems({ ownedJokers: currentState.jokers }),
          message: '카드 1장을 제거했습니다. 상점으로 이동합니다.',
        };
      }

      return {
        ...currentState,
        deck: nextDeck,
        phase: 'shop',
        shopReplaceItemId: undefined,
        purgeSource: undefined,
        message: '카드 1장을 제거했습니다.',
      };
    });
  };

  const continueFromShop = () => {
    if (state.phase !== 'shop') {
      return;
    }

    setState(currentState => moveToNextStage({
      ...currentState,
      jokerProgress: applySkipShopGrowth(currentState),
    }));
  };

  const continueFromSettlement = () => {
    if (state.phase !== 'settlement' || !state.settlement) {
      return;
    }

    setState(currentState => {
      if (currentState.phase !== 'settlement' || !currentState.settlement) {
        return currentState;
      }

      const { isRunComplete, pendingRewardOptions } = currentState.settlement;

      if (isRunComplete) {
        return {
          ...currentState,
          phase: 'victory',
          settlement: undefined,
          message: `런 완료! 최종 골드 ${currentState.gold}G`,
        };
      }

      if (pendingRewardOptions.length === 0) {
        return {
          ...currentState,
          phase: 'shop',
          settlement: undefined,
          rewardOptions: [],
          shopItems: createShopItems({ ownedJokers: currentState.jokers }),
          shopRerollCount: 0,
          shopPurchasesThisVisit: 0,
          message: '보스 외 스테이지 클리어로 보상 없이 상점으로 이동합니다.',
        };
      }

      return {
        ...currentState,
        phase: 'reward',
        settlement: undefined,
        rewardOptions: pendingRewardOptions,
        message: '보상을 선택하세요.',
      };
    });
  };

  const restartRun = (nextStartingJokerId?: string) => {
    setState(createInitialGameState(nextStartingJokerId ?? startingJokerId));
  };

  const sellHandCard = (handIndex: number) => {
    if (state.phase !== 'playing') {
      return;
    }

    setState(currentState => {
      if (currentState.phase !== 'playing') {
        return currentState;
      }

      const cardId = currentState.deck.hand[handIndex];
      if (!cardId) {
        return currentState;
      }

      const card = getActionCard(cardId);
      const sellPrice = getSellPriceHandCard(card?.rarity ?? 'common');
      const pawnBrokerBonus = getActiveJokerIds(
        currentState.jokers,
        getEffectiveBossId(currentState),
      ).activeJokerIds.includes('pawn_broker')
        ? 1
        : 0;
      const nextHand = [...currentState.deck.hand];
      nextHand.splice(handIndex, 1);

      return {
        ...currentState,
        deck: {
          ...currentState.deck,
          hand: nextHand,
        },
        gold: currentState.gold + sellPrice + pawnBrokerBonus,
        cardsSoldThisStage: currentState.cardsSoldThisStage + 1,
        message: `${card?.name ?? '카드'} 판매: +${sellPrice + pawnBrokerBonus}G`,
      };
    });
  };

  const reorderArray = <T,>(items: T[], fromIndex: number, toIndex: number): T[] => {
    if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= items.length) {
      return items;
    }
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    const insertAt = Math.max(0, Math.min(toIndex, next.length));
    next.splice(insertAt, 0, moved);
    return next;
  };

  const reorderHandCards = (fromIndex: number, toIndex: number) => {
    if (state.phase !== 'playing') {
      return;
    }

    setState(currentState => {
      if (currentState.phase !== 'playing') {
        return currentState;
      }

      const hand = currentState.deck.hand;
      if (fromIndex < 0 || fromIndex >= hand.length || hand.length < 2) {
        return currentState;
      }

      const nextHand = reorderArray(hand, fromIndex, toIndex);

      return {
        ...currentState,
        deck: {
          ...currentState.deck,
          hand: nextHand,
        },
        message: '손패 순서를 바꿨습니다.',
      };
    });
  };

  const reorderJokers = (fromIndex: number, toIndex: number) => {
    if (state.phase !== 'playing') {
      return;
    }

    setState(currentState => {
      if (currentState.phase !== 'playing') {
        return currentState;
      }

      const ids = currentState.jokers;
      if (fromIndex < 0 || fromIndex >= ids.length || ids.length < 2) {
        return currentState;
      }

      const nextJokers = reorderArray(ids, fromIndex, toIndex);

      return {
        ...currentState,
        jokers: nextJokers,
        message: '조커 순서를 바꿨습니다.',
      };
    });
  };

  const sellJoker = (slotIndex: number) => {
    if (state.phase !== 'playing') {
      return;
    }

    setState(currentState => {
      if (currentState.phase !== 'playing') {
        return currentState;
      }

      const jokerId = currentState.jokers[slotIndex];
      if (!jokerId) {
        return currentState;
      }

      const jokerDef = getJoker(jokerId);
      const price = jokerDef ? getSellPriceJoker(jokerDef.rarity) : getSellPriceHandCard('common');
      const pawnBrokerBonus = getActiveJokerIds(
        currentState.jokers,
        getEffectiveBossId(currentState),
      ).activeJokerIds.includes('pawn_broker')
        ? 1
        : 0;
      const nextJokers = [...currentState.jokers];
      nextJokers.splice(slotIndex, 1);
      const { [jokerId]: _removedProgress, ...nextJokerProgress } = currentState.jokerProgress;

      return {
        ...currentState,
        jokers: nextJokers,
        jokerProgress: nextJokerProgress,
        negativeJokerIds: currentState.negativeJokerIds.filter(id => id !== jokerId),
        gold: currentState.gold + price + pawnBrokerBonus,
        cardsSoldThisStage: currentState.cardsSoldThisStage + 1,
        message: `${jokerDef?.name ?? '조커'} 판매: +${price + pawnBrokerBonus}G`,
      };
    });
  };

  return {
    state,
    stageDefinition,
    totalAntes: TOTAL_ANTES,
    boss,
    previewScore,
    purgeOptions,
    activeJokers: getActiveJokerIds(state.jokers, effectiveBossId),
    getActionCard,
    toggleDie,
    selectAllDice,
    rerollSelectedDice,
    refreshHandCards,
    playCard,
    sellHandCard,
    reorderHandCards,
    reorderJokers,
    sellJoker,
    submitHand,
    applyReward,
    buyShopItem,
    replaceShopJoker,
    cancelShopJokerReplace,
    removeDeckCard,
    continueFromShop,
    continueFromSettlement,
    restartRun,
  };
};
