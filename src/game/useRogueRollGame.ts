import { useMemo, useState } from 'react';

import { BOSSES, STAGES, STARTING_JOKERS } from './data';
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

type StageState = {
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
  const preparedDeck = drawCards(resetDeck, 3, rng);
  const handStartBonus = getHandStartBonus(jokers, bossId);

  return {
    deck: preparedDeck,
    hand: {
      dice: rollDice(5, rng),
      selectedDice: [],
      cardsPlayed: 0,
      freeRerolls: handStartBonus.extraRerolls,
    },
    message:
      handStartBonus.notes[0] ?? '새 Hand가 시작되었습니다. 주사위를 선택해서 리롤하거나 카드를 사용하세요.',
  };
};

const createInitialGameState = (rng: () => number = Math.random): GameState => {
  const bossId = getBossIdForStage(0, rng);
  const startingDeck = createStartingDeck(rng);
  const opening = beginHand({
    deck: startingDeck,
    jokers: STARTING_JOKERS,
    bossId,
    rng,
  });

  return {
    phase: 'playing',
    deck: opening.deck,
    jokers: [...STARTING_JOKERS],
    gold: STARTING_GOLD,
    stage: {
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

export const useRogueRollGame = () => {
  const [state, setState] = useState<GameState>(() => createInitialGameState());

  const stageDefinition = STAGES[state.stage.stageIndex];
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
    const nextStageIndex = currentState.stage.stageIndex + 1;
    const bossId = getBossIdForStage(nextStageIndex, Math.random);
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
      message: `${STAGES[nextStageIndex].name} 시작. ${opening.message}`,
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
      const clearedDeck = discardHand(currentState.deck);
      const updatedState: GameState = {
        ...currentState,
        deck: clearedDeck,
        gold: currentState.gold + gainedGold,
        lastScore: {
          ...scoring,
          gainedGold,
        },
      };

      if (nextScore >= STAGES[currentState.stage.stageIndex].targetScore) {
        const stageRewardGold = STAGES[currentState.stage.stageIndex].rewardGold;
        const clearedStageState: GameState = {
          ...updatedState,
          gold: updatedState.gold + stageRewardGold,
          stage: {
            ...updatedState.stage,
            currentScore: nextScore,
            remainingHands,
          },
          message: `${STAGES[currentState.stage.stageIndex].name} 클리어. 보상 골드 ${stageRewardGold}를 획득했습니다.`,
        };

        if (currentState.stage.stageIndex === STAGES.length - 1) {
          return {
            ...clearedStageState,
            phase: 'victory',
          };
        }

        return {
          ...clearedStageState,
          phase: 'reward',
          rewardOptions: createRewardOptions({ ownedJokers: currentState.jokers }),
        };
      }

      if (remainingHands <= 0) {
        return {
          ...updatedState,
          phase: 'defeat',
          stage: {
            ...updatedState.stage,
            currentScore: nextScore,
            remainingHands: 0,
          },
          message: '목표 점수를 넘기지 못해 이번 런이 종료되었습니다.',
        };
      }

      const nextHand = beginHand({
        deck: clearedDeck,
        jokers: currentState.jokers,
        bossId: currentState.stage.bossId,
        rng: Math.random,
      });

      return {
        ...updatedState,
        deck: nextHand.deck,
        stage: {
          ...updatedState.stage,
          currentScore: nextScore,
          remainingHands,
        },
        hand: nextHand.hand,
        message: `Hand 점수 ${scoring.finalScore}. ${nextHand.message}`,
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
    setState(createInitialGameState());
  };

  return {
    state,
    stageDefinition,
    boss,
    previewScore,
    purgeOptions,
    activeJokers: getActiveJokerIds(state.jokers, state.stage.bossId),
    getActionCard,
    toggleDie,
    selectAllDice,
    rerollSelectedDice,
    playCard,
    submitHand,
    applyReward,
    buyShopItem,
    removeDeckCard,
    continueFromShop,
    restartRun,
  };
};
