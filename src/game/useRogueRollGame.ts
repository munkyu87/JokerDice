import { useMemo, useState } from 'react';

import { BOSSES, STAGES } from './data';
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
  PurgeOption,
  PurgeSource,
  RewardOption,
  ShopItem,
} from './types';

const MAX_JOKERS = 5;
const MAX_CARDS_PER_HAND = 2;
const BASE_HAND_DRAW = 3;

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
  selectedDice: number[];
  cardsPlayed: number;
  freeRerolls: number;
  drawCount: number;
  handRefreshes: number;
};

type Phase = 'playing' | 'reward' | 'shop' | 'purge' | 'victory' | 'defeat';

type GameState = {
  phase: Phase;
  deck: DeckState;
  jokers: string[];
  gold: number;
  stage: StageState;
  hand: HandState;
  rewardOptions: RewardOption[];
  shopItems: ShopItem[];
  purgeSource?: PurgeSource;
  message: string;
  lastScore?: LastScoringSummary;
};

const HANDS_PER_STAGE = 4;
const ROLLS_PER_STAGE = 3;
const STARTING_GOLD = 5;
const TOTAL_ANTES = 8;

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
  rng,
}: {
  deck: DeckState;
  jokers: string[];
  bossId?: string;
  rng: () => number;
}) => {
  const resetDeck = discardHand(deck);
  const handStartBonus = getHandStartBonus(jokers, bossId);
  const drawCount = BASE_HAND_DRAW + handStartBonus.handSizeBonus;
  const preparedDeck = drawCards(resetDeck, drawCount, rng);

  return {
    deck: preparedDeck,
    hand: {
      dice: rollDice(5, rng),
      selectedDice: [],
      cardsPlayed: 0,
      freeRerolls: handStartBonus.extraRerolls,
      drawCount,
      handRefreshes: handStartBonus.handRefreshes,
    },
    message:
      handStartBonus.notes[0] ?? '새 Hand가 시작되었습니다. 주사위를 선택해서 리롤하거나 카드를 사용하세요.',
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
    rng,
  });

  return {
    phase: 'playing',
    deck: opening.deck,
    jokers: [...startingJokers],
    gold: STARTING_GOLD,
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
    message: opening.message,
  };
};

export const useRogueRollGame = (startingJokerId: string = 'lucky_reroll') => {
  const [state, setState] = useState<GameState>(() => createInitialGameState(startingJokerId));

  const stageDefinition = getStageDefinitionForProgress(state.stage.ante, state.stage.stageIndex);
  const boss = getBoss(state.stage.bossId);

  const previewScore = useMemo(
    () =>
      scoreDice({
        dice: state.hand.dice,
        jokerIds: state.jokers,
        bossId: state.stage.bossId,
      }),
    [state.hand.dice, state.jokers, state.stage.bossId],
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

      return {
        ...currentState,
        hand: {
          ...currentState.hand,
          dice: nextDice,
          selectedDice: [],
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
            ? '무료 리롤을 사용했습니다.'
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
      if (currentState.hand.cardsPlayed >= MAX_CARDS_PER_HAND) {
        return {
          ...currentState,
          message: `Hand당 카드는 최대 ${MAX_CARDS_PER_HAND}장까지 사용할 수 있습니다.`,
        };
      }

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
      });

      if (!result.ok) {
        return {
          ...currentState,
          message: result.message,
        };
      }

      return {
        ...currentState,
        deck: movePlayedCardToDiscard(currentState.deck, handIndex),
        hand: {
          ...currentState.hand,
          dice: result.dice,
          selectedDice: [],
          cardsPlayed: currentState.hand.cardsPlayed + 1,
        },
        message: result.message,
      };
    });
  };

  const moveToNextStage = (currentState: GameState): GameState => {
    const isLastStageInAnte = currentState.stage.stageIndex === STAGES.length - 1;
    const nextStageIndex = isLastStageInAnte ? 0 : currentState.stage.stageIndex + 1;
    const nextAnte = isLastStageInAnte ? currentState.stage.ante + 1 : currentState.stage.ante;
    const bossId = getBossIdForStage(nextStageIndex, Math.random);
    const nextStageDefinition = getStageDefinitionForProgress(nextAnte, nextStageIndex);
    const opening = beginHand({
      deck: currentState.deck,
      jokers: currentState.jokers,
      bossId,
      rng: Math.random,
    });

    return {
      ...currentState,
      phase: 'playing',
      deck: opening.deck,
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
      purgeSource: undefined,
      message: `Ante ${nextAnte} ${nextStageDefinition.name} 시작. ${opening.message}`,
      lastScore: currentState.lastScore,
    };
  };

  const submitHand = () => {
    if (state.phase !== 'playing') {
      return;
    }

    setState(currentState => {
      const scoring = scoreDice({
        dice: currentState.hand.dice,
        jokerIds: currentState.jokers,
        bossId: currentState.stage.bossId,
      });

      const nextScore = currentState.stage.currentScore + scoring.finalScore;
      const remainingHands = currentState.stage.remainingHands - 1;
      const gainedGold = scoring.goldDelta;
      const rng = Math.random;

      const currentStageDefinition = getStageDefinitionForProgress(
        currentState.stage.ante,
        currentState.stage.stageIndex,
      );

      const baseProgress: Pick<GameState, 'gold' | 'lastScore'> = {
        gold: currentState.gold + gainedGold,
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
        const clearedStageState: GameState = {
          ...updatedState,
          gold: updatedState.gold + stageRewardGold,
          stage: {
            ...updatedState.stage,
            currentScore: nextScore,
            remainingHands,
          },
          message: `Ante ${currentState.stage.ante} ${currentStageDefinition.name} 클리어. 보상 골드 ${stageRewardGold}를 획득했습니다.`,
        };

        if (
          currentState.stage.ante === TOTAL_ANTES &&
          currentState.stage.stageIndex === STAGES.length - 1
        ) {
          return {
            ...clearedStageState,
            phase: 'victory',
            message: `Ante ${TOTAL_ANTES} Boss Blind까지 돌파했습니다. 이번 런을 완전히 클리어했습니다.`,
          };
        }

        return {
          ...clearedStageState,
          phase: 'reward',
          rewardOptions: createRewardOptions({ ownedJokers: currentState.jokers }),
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
      const handStartBonus = getHandStartBonus(currentState.jokers, currentState.stage.bossId);
      const drawCount = BASE_HAND_DRAW + handStartBonus.handSizeBonus;

      const { activeJokerIds } = getActiveJokerIds(currentState.jokers, currentState.stage.bossId);
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
          dice: rollDice(5, rng),
          selectedDice: [],
          cardsPlayed: 0,
          freeRerolls: handStartBonus.extraRerolls,
          drawCount,
          handRefreshes: handStartBonus.handRefreshes,
        },
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
        if (currentState.jokers.length >= MAX_JOKERS) {
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

      if (item.type === 'reroll') {
        return {
          ...currentState,
          gold: currentState.gold - item.price,
          shopItems: createShopItems({ ownedJokers: currentState.jokers }),
          message: '상점을 새로 고쳤습니다.',
        };
      }

      if (item.type === 'remove_card') {
        return {
          ...currentState,
          gold: currentState.gold - item.price,
          phase: 'purge',
          purgeSource: 'shop',
          message: '덱에서 제거할 카드를 선택하세요.',
        };
      }

      if (item.type === 'joker') {
        if (currentState.jokers.length >= MAX_JOKERS) {
          return {
            ...currentState,
            message: '조커 슬롯이 가득 찼습니다.',
          };
        }

        return {
          ...currentState,
          gold: currentState.gold - item.price,
          jokers: [...currentState.jokers, item.jokerId],
          shopItems: currentState.shopItems.filter(shopItem => shopItem.id !== item.id),
          message: `${item.title} 조커를 구매했습니다.`,
        };
      }

      return {
        ...currentState,
        gold: currentState.gold - item.price,
        deck: {
          ...currentState.deck,
          discardPile: [...currentState.deck.discardPile, item.cardId],
        },
        shopItems: currentState.shopItems.filter(shopItem => shopItem.id !== item.id),
        message: `${item.title} 카드를 구매했습니다.`,
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
          purgeSource: undefined,
          shopItems: createShopItems({ ownedJokers: currentState.jokers }),
          message: '카드 1장을 제거했습니다. 상점으로 이동합니다.',
        };
      }

      return {
        ...currentState,
        deck: nextDeck,
        phase: 'shop',
        purgeSource: undefined,
        message: '카드 1장을 제거했습니다.',
      };
    });
  };

  const continueFromShop = () => {
    if (state.phase !== 'shop') {
      return;
    }

    setState(currentState => moveToNextStage(currentState));
  };

  const restartRun = () => {
    setState(createInitialGameState(startingJokerId));
  };

  return {
    state,
    stageDefinition,
    totalAntes: TOTAL_ANTES,
    boss,
    previewScore,
    purgeOptions,
    activeJokers: getActiveJokerIds(state.jokers, state.stage.bossId),
    getActionCard,
    toggleDie,
    selectAllDice,
    rerollSelectedDice,
    refreshHandCards,
    playCard,
    submitHand,
    applyReward,
    buyShopItem,
    removeDeckCard,
    continueFromShop,
    restartRun,
  };
};
