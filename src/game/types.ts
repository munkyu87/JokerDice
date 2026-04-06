export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

export type DiceRoll = DiceValue[];

export type HandRank =
  | 'high_card'
  | 'pair'
  | 'two_pair'
  | 'three'
  | 'straight'
  | 'full_house'
  | 'four'
  | 'five'
  | 'six';

export type BuildTag =
  | 'high'
  | 'even'
  | 'set'
  | 'sequence'
  | 'economy'
  | 'consistency';

export type JokerTrigger = 'onHandStart' | 'beforeScore' | 'afterScore';
export type JokerRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/** 액션 카드 등급 — 조커와 동일한 4단계 */
export type ActionCardRarity = JokerRarity;

export type CardPlayResult =
  | {
      ok: true;
      dice: DiceRoll;
      message: string;
      negativeJokerId?: string;
      handSizeVoucherDelta?: number;
      interestCapVoucherDelta?: number;
      ignoreBossForCurrentAnte?: boolean;
      goldCost?: number;
      scoreBonusDelta?: number;
      multiplierDelta?: number;
      drawCards?: number;
      scoreNote?: string;
    }
  | {
      ok: false;
      message: string;
    };

export type ActionCardDefinition = {
  id: string;
  name: string;
  description: string;
  rarity: ActionCardRarity;
  tags: BuildTag[];
  pool?: 'standard' | 'voucher';
  consumable?: boolean;
  apply: (params: CardPlayParams) => CardPlayResult;
};

export type CardPlayParams = {
  dice: DiceRoll;
  selectedDice: number[];
  rollDiceAt: (dice: DiceRoll, indices: number[]) => DiceRoll;
  jokerIds: string[];
  negativeJokerIds: string[];
  currentGold: number;
  rng: () => number;
};

export type JokerProgressMap = Record<string, number>;

export type JokerEffectContext = {
  trigger: JokerTrigger;
  dice: DiceRoll;
  scoringDice: number[];
  currentGold: number;
  handRank: HandRank;
  handBase: number;
  diceBase: number;
  bonusBase: number;
  multiplier: number;
  finalScore: number;
  extraRerolls: number;
  handSizeBonus: number;
  diceCountBonus: number;
  handRefreshes: number;
  goldDelta: number;
  jokerProgress: JokerProgressMap;
  cardsPlayedThisHand: number;
  goldSpentThisHand: number;
  cardsSoldThisStage: number;
  rerollsUsedThisHand: number;
  shopPurchasesThisVisit: number;
  interestGoldLastSettlement: number;
  currentStageTarget: number;
  remainingHands: number;
  /** 비어 있는 조커 슬롯 수 (MAX 슬롯 − 실제 점유, 네거티브 조커는 슬롯 미점유로 계산) */
  emptyJokerSlots: number;
  notes: string[];
};

export type JokerDefinition = {
  id: string;
  name: string;
  description: string;
  rarity: JokerRarity;
  tags: BuildTag[];
  trigger: JokerTrigger;
  apply: (ctx: JokerEffectContext) => JokerEffectContext;
};

export type BossScoreContext = {
  scoringDice: number[];
  handRank: HandRank;
  handBase: number;
  diceBase: number;
  bonusBase: number;
  multiplier: number;
  notes: string[];
};

export type BossDefinition = {
  id: string;
  name: string;
  description: string;
  disabledJokerSlots?: number;
  applyBeforeJokers?: (ctx: BossScoreContext) => BossScoreContext;
};

export type RewardOption =
  | {
      id: string;
      type: 'joker';
      jokerId: string;
      title: string;
      description: string;
    }
  | {
      id: string;
      type: 'card';
      cardId: string;
      title: string;
      description: string;
    }
  | {
      id: string;
      type: 'gold';
      amount: number;
      title: string;
      description: string;
    }
  | {
      id: string;
      type: 'remove_card';
      title: string;
      description: string;
    };

/** 스테이지 클리어 직후 정산 팝업용 (보상 선택 전) */
export type StageSettlementSummary = {
  ante: number;
  stageIndex: number;
  stageName: string;
  targetScore: number;
  spareHands: number;
  spareRolls: number;
  efficiencyGold: number;
  interestGold: number;
  blindRewardGold: number;
  handScoreGold: number;
  goldBeforeHand: number;
  goldAfter: number;
  isRunComplete: boolean;
  pendingRewardOptions: RewardOption[];
};

export type ShopItem =
  | {
      id: string;
      type: 'joker';
      jokerId: string;
      title: string;
      description: string;
      price: number;
    }
  | {
      id: string;
      type: 'card';
      cardId: string;
      title: string;
      description: string;
      price: number;
    }
  | {
      id: string;
      type: 'remove_card';
      title: string;
      description: string;
      price: number;
    }
  | {
      id: string;
      type: 'reroll';
      title: string;
      description: string;
      price: number;
    };

export type StageDefinition = {
  id: string;
  name: string;
  targetScore: number;
  rewardGold: number;
  bossId?: string;
};

export type DeckState = {
  drawPile: string[];
  discardPile: string[];
  hand: string[];
};

export type HandEvaluation = {
  rank: HandRank;
  counts: number[];
  scoringDice: number[];
  total: number;
};

export type ScoreResult = {
  handRank: HandRank;
  handBase: number;
  diceBase: number;
  bonusBase: number;
  multiplier: number;
  finalScore: number;
  scoringDice: number[];
  notes: string[];
  goldDelta: number;
  activeJokerIds: string[];
  disabledJokerIds: string[];
};

export type PurgeSource = 'reward' | 'shop';

export type PurgeOption = {
  zone: 'drawPile' | 'discardPile';
  index: number;
  cardId: string;
};

export type LastScoringSummary = ScoreResult & {
  gainedGold: number;
};
