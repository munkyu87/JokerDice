import {
  ActionCardDefinition,
  BossDefinition,
  BossScoreContext,
  JokerDefinition,
  JokerProgressMap,
  JokerRarity,
  StageDefinition,
} from './types';

const withNote = (ctx: BossScoreContext, note: string): BossScoreContext => ({
  ...ctx,
  notes: [...ctx.notes, note],
});

export const ACTION_CARDS: ActionCardDefinition[] = [
  {
    id: 'precision_reroll',
    name: 'Precision Reroll',
    description: '선택한 주사위를 무료로 다시 굴립니다.',
    rarity: 'common',
    tags: ['consistency'],
    apply: ({ dice, selectedDice, rollDiceAt }) => {
      if (selectedDice.length === 0) {
        return { ok: false, message: '무료 리롤 카드는 최소 1개의 주사위를 선택해야 합니다.' };
      }

      return {
        ok: true,
        dice: rollDiceAt(dice, selectedDice),
        message: '선택한 주사위를 무료로 다시 굴렸습니다.',
      };
    },
  },
  {
    id: 'raise_all',
    name: 'Raise All',
    description: '모든 주사위를 +1 올립니다. 최대값은 6입니다.',
    rarity: 'common',
    tags: ['high', 'consistency'],
    apply: ({ dice }) => ({
      ok: true,
      dice: dice.map(value => Math.min(6, value + 1)) as typeof dice,
      message: '모든 주사위가 1씩 증가했습니다.',
    }),
  },
  {
    id: 'sink_all',
    name: 'Sink All',
    description: '모든 주사위를 -1 내립니다. 최소값은 1입니다.',
    rarity: 'common',
    tags: ['consistency'],
    apply: ({ dice }) => ({
      ok: true,
      dice: dice.map(value => Math.max(1, value - 1)) as typeof dice,
      message: '모든 주사위가 1씩 감소했습니다.',
    }),
  },
  {
    id: 'nudge_up',
    name: 'Nudge Up',
    description: '선택한 주사위 1개를 +1 올립니다. 최대값은 6입니다.',
    rarity: 'common',
    tags: ['high'],
    apply: ({ dice, selectedDice }) => {
      if (selectedDice.length !== 1) {
        return { ok: false, message: '주사위 1개를 정확히 선택해야 합니다.' };
      }
      const nextDice = [...dice];
      const i = selectedDice[0];
      nextDice[i] = Math.min(6, nextDice[i] + 1) as (typeof nextDice)[number];
      return {
        ok: true,
        dice: nextDice as typeof dice,
        message: '선택한 주사위를 1 올렸습니다.',
      };
    },
  },
  {
    id: 'nudge_down',
    name: 'Nudge Down',
    description: '선택한 주사위 1개를 -1 내립니다. 최소값은 1입니다.',
    rarity: 'common',
    tags: ['consistency'],
    apply: ({ dice, selectedDice }) => {
      if (selectedDice.length !== 1) {
        return { ok: false, message: '주사위 1개를 정확히 선택해야 합니다.' };
      }
      const nextDice = [...dice];
      const i = selectedDice[0];
      nextDice[i] = Math.max(1, nextDice[i] - 1) as (typeof nextDice)[number];
      return {
        ok: true,
        dice: nextDice as typeof dice,
        message: '선택한 주사위를 1 내렸습니다.',
      };
    },
  },
  {
    id: 'lift_selected',
    name: 'Lift Selected',
    description: '선택한 주사위마다 +1 올립니다. 최대값은 6입니다.',
    rarity: 'uncommon',
    tags: ['high', 'consistency'],
    apply: ({ dice, selectedDice }) => {
      if (selectedDice.length === 0) {
        return { ok: false, message: 'Lift Selected는 최소 1개의 주사위를 선택해야 합니다.' };
      }

      const nextDice = [...dice];
      selectedDice.forEach(index => {
        nextDice[index] = Math.min(6, nextDice[index] + 1) as (typeof nextDice)[number];
      });

      return {
        ok: true,
        dice: nextDice as typeof dice,
        message: '선택한 주사위를 전부 1씩 올렸습니다.',
      };
    },
  },
  {
    id: 'anchor_one',
    name: 'Anchor One',
    description: '선택한 주사위 1개를 1로 고정합니다.',
    rarity: 'common',
    tags: ['sequence'],
    apply: ({ dice, selectedDice }) => {
      if (selectedDice.length !== 1) {
        return { ok: false, message: '주사위 1개를 정확히 선택해야 합니다.' };
      }
      const nextDice = [...dice];
      nextDice[selectedDice[0]] = 1;
      return {
        ok: true,
        dice: nextDice as typeof dice,
        message: '선택한 주사위를 1로 고정했습니다.',
      };
    },
  },
  {
    id: 'smallest_bump',
    name: 'Smallest Bump',
    description: '가장 낮은 숫자 주사위 1개를 +1 올립니다. 동률이면 앞쪽 슬롯이 우선입니다.',
    rarity: 'common',
    tags: ['consistency'],
    apply: ({ dice }) => {
      const minVal = Math.min(...dice);
      const idx = dice.findIndex(v => v === minVal);
      const nextDice = [...dice];
      nextDice[idx] = Math.min(6, minVal + 1) as (typeof nextDice)[number];
      return {
        ok: true,
        dice: nextDice as typeof dice,
        message: '가장 낮은 주사위를 1 올렸습니다.',
      };
    },
  },
  {
    id: 'mirror_high',
    name: 'Mirror High',
    description: '선택한 주사위 1개를 현재 최고 숫자로 복사합니다.',
    rarity: 'uncommon',
    tags: ['set'],
    apply: ({ dice, selectedDice }) => {
      if (selectedDice.length !== 1) {
        return { ok: false, message: 'Mirror High는 주사위 1개를 정확히 선택해야 합니다.' };
      }

      const highest = Math.max(...dice);
      const nextDice = [...dice];
      nextDice[selectedDice[0]] = highest as (typeof nextDice)[number];

      return {
        ok: true,
        dice: nextDice as typeof dice,
        message: `선택한 주사위를 최고 숫자 ${highest}(으)로 맞췄습니다.`,
      };
    },
  },
  {
    id: 'mirror_low',
    name: 'Mirror Low',
    description: '선택한 주사위 1개를 현재 최저 숫자로 맞춥니다.',
    rarity: 'uncommon',
    tags: ['set'],
    apply: ({ dice, selectedDice }) => {
      if (selectedDice.length !== 1) {
        return { ok: false, message: '주사위 1개를 정확히 선택해야 합니다.' };
      }
      const lowest = Math.min(...dice);
      const nextDice = [...dice];
      nextDice[selectedDice[0]] = lowest as (typeof nextDice)[number];
      return {
        ok: true,
        dice: nextDice as typeof dice,
        message: `선택한 주사위를 최저 숫자 ${lowest}(으)로 맞췄습니다.`,
      };
    },
  },
  {
    id: 'even_polish',
    name: 'Even Polish',
    description: '선택한 홀수 주사위를 다음 짝수로 보정합니다. 선택이 없으면 모든 홀수에 적용됩니다.',
    rarity: 'uncommon',
    tags: ['even', 'consistency'],
    apply: ({ dice, selectedDice }) => {
      const targetIndices = selectedDice.length > 0 ? selectedDice : dice.map((_, index) => index);
      const nextDice = [...dice];

      targetIndices.forEach(index => {
        const value = nextDice[index];
        if (value % 2 === 1) {
          nextDice[index] = Math.min(6, value + 1) as (typeof nextDice)[number];
        }
      });

      return {
        ok: true,
        dice: nextDice as typeof dice,
        message: '홀수 주사위를 짝수 쪽으로 보정했습니다.',
      };
    },
  },
  {
    id: 'twin_peak',
    name: 'Twin Peak',
    description: '선택한 주사위 2개를 둘 다 더 높은 쪽 숫자로 맞춥니다.',
    rarity: 'uncommon',
    tags: ['set'],
    apply: ({ dice, selectedDice }) => {
      if (selectedDice.length !== 2) {
        return { ok: false, message: '주사위 2개를 정확히 선택해야 합니다.' };
      }
      const [a, b] = selectedDice;
      const peak = Math.max(dice[a], dice[b]);
      const nextDice = [...dice];
      nextDice[a] = peak as (typeof nextDice)[number];
      nextDice[b] = peak as (typeof nextDice)[number];
      return {
        ok: true,
        dice: nextDice as typeof dice,
        message: `두 주사위를 ${peak}(으)로 맞췄습니다.`,
      };
    },
  },
  {
    id: 'invert_faces',
    name: 'Invert Faces',
    description: '모든 주사위를 반전합니다. (1↔6, 2↔5, 3↔4)',
    rarity: 'uncommon',
    tags: ['sequence'],
    apply: ({ dice }) => ({
      ok: true,
      dice: dice.map(v => (7 - v) as (typeof dice)[number]) as typeof dice,
      message: '모든 주사위 면을 반전했습니다.',
    }),
  },
  {
    id: 'chaos_reroll',
    name: 'Chaos Reroll',
    description: '선택과 관계없이 전체 주사위를 무료로 다시 굴립니다.',
    rarity: 'uncommon',
    tags: ['consistency'],
    apply: ({ dice, rollDiceAt }) => ({
      ok: true,
      dice: rollDiceAt(
        dice,
        dice.map((_, index) => index),
      ),
      message: '전체 주사위를 다시 굴렸습니다.',
    }),
  },
  {
    id: 'surge_die',
    name: 'Surge Die',
    description: '선택한 주사위 1개를 +2 올립니다. 최대값은 6입니다.',
    rarity: 'uncommon',
    tags: ['high'],
    apply: ({ dice, selectedDice }) => {
      if (selectedDice.length !== 1) {
        return { ok: false, message: '주사위 1개를 정확히 선택해야 합니다.' };
      }
      const nextDice = [...dice];
      const i = selectedDice[0];
      nextDice[i] = Math.min(6, nextDice[i] + 2) as (typeof nextDice)[number];
      return {
        ok: true,
        dice: nextDice as typeof dice,
        message: '선택한 주사위를 2 올렸습니다.',
      };
    },
  },
  {
    id: 'swap_pair',
    name: 'Swap Pair',
    description: '선택한 서로 다른 주사위 2개의 값을 맞바꿉니다.',
    rarity: 'uncommon',
    tags: ['set'],
    apply: ({ dice, selectedDice }) => {
      if (selectedDice.length !== 2) {
        return { ok: false, message: '주사위 2개를 정확히 선택해야 합니다.' };
      }
      const [i, j] = selectedDice;
      if (i === j) {
        return { ok: false, message: '서로 다른 주사위 두 개를 선택해야 합니다.' };
      }
      const nextDice = [...dice];
      const tmp = nextDice[i];
      nextDice[i] = nextDice[j];
      nextDice[j] = tmp as (typeof nextDice)[number];
      return {
        ok: true,
        dice: nextDice as typeof dice,
        message: '두 주사위 값을 맞바꿨습니다.',
      };
    },
  },
  {
    id: 'loaded_six',
    name: 'Loaded Six',
    description: '선택한 주사위 1개를 6으로 바꿉니다.',
    rarity: 'rare',
    tags: ['high'],
    apply: ({ dice, selectedDice }) => {
      if (selectedDice.length !== 1) {
        return { ok: false, message: 'Loaded Six는 주사위 1개를 정확히 선택해야 합니다.' };
      }

      const nextDice = [...dice];
      nextDice[selectedDice[0]] = 6;

      return {
        ok: true,
        dice: nextDice as typeof dice,
        message: '선택한 주사위를 6으로 고정했습니다.',
      };
    },
  },
  {
    id: 'boost_spike',
    name: 'Boost Spike',
    description: '모든 주사위를 +2 올립니다. 최대값은 6입니다.',
    rarity: 'rare',
    tags: ['high'],
    apply: ({ dice }) => ({
      ok: true,
      dice: dice.map(value => Math.min(6, value + 2)) as typeof dice,
      message: '모든 주사위가 2씩 증가했습니다.',
    }),
  },
  {
    id: 'median_three',
    name: 'Median Three',
    description: '선택한 주사위 3개를 그 셋의 중앙값으로 통일합니다.',
    rarity: 'rare',
    tags: ['set'],
    apply: ({ dice, selectedDice }) => {
      if (selectedDice.length !== 3) {
        return { ok: false, message: '주사위 3개를 정확히 선택해야 합니다.' };
      }
      const vals = [...selectedDice.map(i => dice[i])].sort((x, y) => x - y);
      const median = vals[1];
      const nextDice = [...dice];
      selectedDice.forEach(i => {
        nextDice[i] = median as (typeof nextDice)[number];
      });
      return {
        ok: true,
        dice: nextDice as typeof dice,
        message: `세 주사위를 중앙값 ${median}(으)로 맞췄습니다.`,
      };
    },
  },
  {
    id: 'grand_raise',
    name: 'Grand Raise',
    description: '모든 주사위를 +3 올립니다. 최대값은 6입니다.',
    rarity: 'legendary',
    tags: ['high'],
    apply: ({ dice }) => ({
      ok: true,
      dice: dice.map(value => Math.min(6, value + 3)) as typeof dice,
      message: '모든 주사위가 3씩 증가했습니다.',
    }),
  },
  {
    id: 'apex_unify',
    name: 'Apex Unify',
    description: '모든 주사위를 현재 나온 숫자 중 최고값으로 통일합니다.',
    rarity: 'legendary',
    tags: ['high', 'set'],
    apply: ({ dice }) => {
      const peak = Math.max(...dice);
      return {
        ok: true,
        dice: dice.map(() => peak) as typeof dice,
        message: `모든 주사위를 ${peak}(으)로 통일했습니다.`,
      };
    },
  },
  {
    id: 'negative_ink',
    name: 'Negative Ink',
    description:
      '보유한 조커 중 네거티브가 아닌 조커 1장을 무작위로 네거티브로 만듭니다. 네거티브 조커는 슬롯을 차지하지 않으며, 사용하면 완전히 사라집니다.',
    rarity: 'legendary',
    tags: ['economy'],
    pool: 'voucher',
    consumable: true,
    apply: ({ dice, jokerIds, negativeJokerIds, rng }) => {
      const candidates = jokerIds.filter(jokerId => !negativeJokerIds.includes(jokerId));
      if (candidates.length === 0) {
        return { ok: false, message: '네거티브로 만들 조커가 없습니다.' };
      }

      const picked = candidates[Math.floor(rng() * candidates.length)];

      return {
        ok: true,
        dice,
        negativeJokerId: picked,
        message: '랜덤 조커 1장을 네거티브로 만들었습니다.',
      };
    },
  },
  {
    id: 'gold_burn',
    name: 'Gold Burn',
    description: '10G를 소모해 이번 Hand의 기본 점수를 +120 얻습니다.',
    rarity: 'rare',
    tags: ['economy', 'high'],
    apply: ({ dice, currentGold }) => {
      if (currentGold < 10) {
        return { ok: false, message: 'Gold Burn은 10G가 필요합니다.' };
      }

      return {
        ok: true,
        dice,
        goldCost: 10,
        scoreBonusDelta: 120,
        scoreNote: 'Gold Burn: 카드 효과로 기본 점수 +120',
        message: '10G를 태워 이번 Hand의 기본 점수 +120을 얻었습니다.',
      };
    },
  },
  {
    id: 'royal_expense',
    name: 'Royal Expense',
    description: '8G를 소모해 이번 Hand의 배수를 +1 얻습니다.',
    rarity: 'legendary',
    tags: ['economy', 'high'],
    apply: ({ dice, currentGold }) => {
      if (currentGold < 8) {
        return { ok: false, message: 'Royal Expense는 8G가 필요합니다.' };
      }

      return {
        ok: true,
        dice,
        goldCost: 8,
        multiplierDelta: 1,
        scoreNote: 'Royal Expense: 카드 효과로 배수 +1',
        message: '8G를 지불해 이번 Hand의 배수 +1을 얻었습니다.',
      };
    },
  },
  {
    id: 'coin_flip',
    name: 'Coin Flip',
    description: '5G를 소모합니다. 성공하면 이번 Hand의 배수 +2, 실패하면 효과가 없습니다.',
    rarity: 'uncommon',
    tags: ['economy', 'high'],
    apply: ({ dice, currentGold, rng }) => {
      if (currentGold < 5) {
        return { ok: false, message: 'Coin Flip은 5G가 필요합니다.' };
      }

      const success = rng() < 0.5;
      return {
        ok: true,
        dice,
        goldCost: 5,
        multiplierDelta: success ? 2 : 0,
        scoreNote: success ? 'Coin Flip: 대성공으로 배수 +2' : 'Coin Flip: 실패',
        message: success
          ? 'Coin Flip 성공! 5G로 이번 Hand의 배수 +2를 얻었습니다.'
          : 'Coin Flip 실패. 5G를 썼지만 이번에는 아무 일도 일어나지 않았습니다.',
      };
    },
  },
  {
    id: 'private_dealer',
    name: 'Private Dealer',
    description: '10G를 소모해 덱에서 손패를 2장 더 뽑습니다.',
    rarity: 'legendary',
    tags: ['economy', 'consistency'],
    apply: ({ dice, currentGold }) => {
      if (currentGold < 10) {
        return { ok: false, message: 'Private Dealer는 10G가 필요합니다.' };
      }

      return {
        ok: true,
        dice,
        goldCost: 10,
        drawCards: 2,
        message: '10G를 지불하고 손패를 2장 더 뽑았습니다.',
      };
    },
  },
  {
    id: 'paid_favor',
    name: 'Paid Favor',
    description: '6G를 소모해 선택한 주사위를 전부 +1 올립니다. 최대값은 6입니다.',
    rarity: 'rare',
    tags: ['economy', 'consistency'],
    apply: ({ dice, selectedDice, currentGold }) => {
      if (currentGold < 6) {
        return { ok: false, message: 'Paid Favor는 6G가 필요합니다.' };
      }
      if (selectedDice.length === 0) {
        return { ok: false, message: 'Paid Favor는 최소 1개의 주사위를 선택해야 합니다.' };
      }

      const nextDice = [...dice];
      selectedDice.forEach(index => {
        nextDice[index] = Math.min(6, nextDice[index] + 1) as (typeof nextDice)[number];
      });

      return {
        ok: true,
        dice: nextDice as typeof dice,
        goldCost: 6,
        message: '6G를 지불해 선택한 주사위를 전부 1씩 올렸습니다.',
      };
    },
  },
  {
    id: 'reserve_draw',
    name: 'Reserve Draw',
    description: '사용 후 영구적으로 매 Hand 시작 시 손패를 1장 더 뽑습니다. 사용하면 완전히 사라집니다.',
    rarity: 'legendary',
    tags: ['consistency'],
    pool: 'voucher',
    consumable: true,
    apply: ({ dice }) => ({
      ok: true,
      dice,
      handSizeVoucherDelta: 1,
      message: 'Reserve Draw 바우처를 사용해 시작 손패가 영구적으로 1장 증가했습니다.',
    }),
  },
  {
    id: 'negative_stamp',
    name: 'Negative Stamp',
    description:
      '보유한 조커 중 네거티브가 아닌 조커 1장을 무작위로 네거티브로 만듭니다. 사용하면 완전히 사라집니다.',
    rarity: 'legendary',
    tags: ['economy'],
    pool: 'voucher',
    consumable: true,
    apply: ({ dice, jokerIds, negativeJokerIds, rng }) => {
      const candidates = jokerIds.filter(jokerId => !negativeJokerIds.includes(jokerId));
      if (candidates.length === 0) {
        return { ok: false, message: '네거티브로 만들 조커가 없습니다.' };
      }

      const picked = candidates[Math.floor(rng() * candidates.length)];
      return {
        ok: true,
        dice,
        negativeJokerId: picked,
        message: 'Negative Stamp를 사용해 랜덤 조커 1장이 네거티브가 되었습니다.',
      };
    },
  },
  {
    id: 'interest_ledger',
    name: 'Interest Ledger',
    description:
      '사용 후 영구적으로 최대 이자가 +5 증가합니다. 기본 25G 한도가 50G, 75G처럼 25G씩 늘어납니다. 사용하면 완전히 사라집니다.',
    rarity: 'legendary',
    tags: ['economy'],
    pool: 'voucher',
    consumable: true,
    apply: ({ dice }) => ({
      ok: true,
      dice,
      interestCapVoucherDelta: 5,
      message: 'Interest Ledger를 사용해 최대 이자 한도가 영구적으로 +5 증가했습니다.',
    }),
  },
  {
    id: 'boss_waiver',
    name: 'Boss Waiver',
    description: '사용한 현재 Ante의 보스 효과를 무시합니다. 사용하면 완전히 사라집니다.',
    rarity: 'legendary',
    tags: ['high', 'consistency'],
    pool: 'voucher',
    consumable: true,
    apply: ({ dice }) => ({
      ok: true,
      dice,
      ignoreBossForCurrentAnte: true,
      message: 'Boss Waiver를 사용해 이번 Ante의 보스 효과가 무시됩니다.',
    }),
  },
];

/** 배수 누적 성장 조커: 저장값이 Hand 배수에 더해지는 양, 성장 1스텝당 +0.1 */
export const MULTIPLIER_GROWTH_STEP = 0.1;

const MULTIPLIER_GROWTH_JOKER_IDS: readonly string[] = [
  'twin_engine',
  'reroll_ledger',
  'golden_habit',
  'glass_joker',
];

export const isMultiplierGrowthJoker = (jokerId: string) =>
  MULTIPLIER_GROWTH_JOKER_IDS.includes(jokerId);

const roundMultiplierGrowthValue = (n: number) => Math.round(n * 10) / 10;

export const stepMultiplierGrowthProgress = (current: number, steps: number) =>
  roundMultiplierGrowthValue(current + steps * MULTIPLIER_GROWTH_STEP);

export const formatMultiplierGrowthForDisplay = (n: number) =>
  roundMultiplierGrowthValue(n).toFixed(1);

const GROWTH_JOKER_BASE_VALUES: Partial<Record<string, number>> = {
  pair_savings: 6,
  twin_engine: MULTIPLIER_GROWTH_STEP,
  house_keeper: 12,
  straight_scholar: 15,
  six_cult: 6,
  card_sharp: 2,
  burn_count: 4,
  reroll_ledger: MULTIPLIER_GROWTH_STEP,
  perfect_grip: 10,
  piggy_bank: 6,
  golden_habit: MULTIPLIER_GROWTH_STEP,
  frugal_mask: 8,
  all_in: 12,
  glass_joker: MULTIPLIER_GROWTH_STEP,
  last_chance: 16,
};

export const getGrowthJokerValue = (jokerId: string, progress: JokerProgressMap = {}) => {
  const base = GROWTH_JOKER_BASE_VALUES[jokerId] ?? 0;
  let raw = progress[jokerId] ?? base;

  if (isMultiplierGrowthJoker(jokerId)) {
    if (Number.isFinite(raw) && Number.isInteger(raw) && raw >= 1) {
      raw = raw * MULTIPLIER_GROWTH_STEP;
    }
    raw = roundMultiplierGrowthValue(raw);
  }

  return raw;
};

export const getGrowthJokerSummary = (jokerId: string, progress: JokerProgressMap = {}) => {
  const value = getGrowthJokerValue(jokerId, progress);
  if (!(jokerId in GROWTH_JOKER_BASE_VALUES)) {
    return undefined;
  }

  const byId: Record<string, string> = {
    pair_savings: `현재 Pair 보너스 +${value}`,
    twin_engine: `현재 Two Pair 배수 +${formatMultiplierGrowthForDisplay(value)}`,
    house_keeper: `현재 Full House 보너스 +${value}`,
    straight_scholar: `현재 Straight 보너스 +${value}`,
    six_cult: `현재 6 포함 보너스 +${value}`,
    card_sharp: `현재 누적 기본 점수 +${value}`,
    burn_count: `현재 카드 1장당 보너스 +${value}`,
    reroll_ledger: `현재 리롤 Hand 배수 +${formatMultiplierGrowthForDisplay(value)}`,
    perfect_grip: `현재 클린 Hand 보너스 +${value}`,
    piggy_bank: `현재 누적 기본 점수 +${value}`,
    golden_habit: `현재 누적 배수 +${formatMultiplierGrowthForDisplay(value)}`,
    frugal_mask: `현재 누적 기본 점수 +${value}`,
    all_in: `현재 누적 기본 점수 +${value}`,
    glass_joker: `현재 누적 배수 +${formatMultiplierGrowthForDisplay(value)}`,
    last_chance: `현재 막판 Hand 보너스 +${value}`,
  };

  return byId[jokerId];
};

export const getGrowthJokerDetail = (jokerId: string, progress: JokerProgressMap = {}) => {
  const current = getGrowthJokerSummary(jokerId, progress);
  if (!current) {
    return undefined;
  }

  const growthRuleById: Record<string, string> = {
    pair_savings: '성장: Pair 성공 시 +3',
    twin_engine: '성장: Two Pair 성공 시 +0.1',
    house_keeper: '성장: Full House 성공 시 +10',
    straight_scholar: '성장: Straight 성공 시 +15',
    six_cult: '성장: 점수 주사위에 6 포함 시 +4',
    card_sharp: '성장: 핸드 카드 사용 시 +2',
    burn_count: '성장: 카드 2장 이상 사용한 Hand 종료 시 +1',
    reroll_ledger: '성장: 리롤 사용 시 +0.1',
    perfect_grip: '성장: 리롤/카드 없이 제출 시 +6',
    piggy_bank: '성장: 정산 이자 획득 시 +5',
    golden_habit: '성장: 상점 구매 시 +0.1',
    frugal_mask: '성장: 상점 구매 없이 넘기면 +6',
    all_in: '성장: 목표보다 100점 초과할 때마다 +4',
    glass_joker: '성장: Hand 점수 60 이상이면 +0.2, 실패 시 0.1로 초기화',
    last_chance: '성장: 남은 Hand 1 이하로 클리어 시 +12',
  };

  return {
    current,
    growthRule: growthRuleById[jokerId],
  };
};

const STARTING_ROULETTE_RARITY_WEIGHT: Record<Exclude<JokerRarity, 'legendary'>, number> = {
  common: 60,
  uncommon: 28,
  rare: 12,
};

export const getStartingRouletteJokerPool = (): JokerDefinition[] =>
  JOKERS.filter(joker => joker.rarity !== 'legendary');

export const pickStartingRouletteJoker = (
  rng: () => number = Math.random,
  pool: JokerDefinition[] = getStartingRouletteJokerPool(),
): JokerDefinition | undefined => {
  if (pool.length === 0) {
    return undefined;
  }

  const totalWeight = pool.reduce(
    (sum, joker) => sum + STARTING_ROULETTE_RARITY_WEIGHT[joker.rarity as Exclude<JokerRarity, 'legendary'>],
    0,
  );

  let roll = rng() * totalWeight;
  for (const joker of pool) {
    roll -= STARTING_ROULETTE_RARITY_WEIGHT[joker.rarity as Exclude<JokerRarity, 'legendary'>];
    if (roll <= 0) {
      return joker;
    }
  }

  return pool[pool.length - 1];
};

export const JOKERS: JokerDefinition[] = [
  {
    id: 'pair_savings',
    name: 'Pair Savings',
    description: 'Pair면 현재 누적 수치만큼 기본 점수를 얻고, Pair를 만들 때마다 +3 성장합니다.',
    rarity: 'common',
    tags: ['consistency', 'set'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.handRank !== 'pair') {
        return ctx;
      }

      const bonus = getGrowthJokerValue('pair_savings', ctx.jokerProgress);
      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `Pair Savings: Pair로 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'twin_engine',
    name: 'Twin Engine',
    description: 'Two Pair면 현재 누적 수치만큼 배수를 얻고, Two Pair를 만들 때마다 +0.1 성장합니다.',
    rarity: 'rare',
    tags: ['set'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.handRank !== 'two_pair') {
        return ctx;
      }

      const bonus = getGrowthJokerValue('twin_engine', ctx.jokerProgress);
      return {
        ...ctx,
        multiplier: ctx.multiplier + bonus,
        notes: [
          ...ctx.notes,
          `Twin Engine: Two Pair로 배수 +${formatMultiplierGrowthForDisplay(bonus)}`,
        ],
      };
    },
  },
  {
    id: 'house_keeper',
    name: 'House Keeper',
    description: 'Full House면 현재 누적 수치만큼 기본 점수를 얻고, Full House를 만들 때마다 +10 성장합니다.',
    rarity: 'rare',
    tags: ['set'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.handRank !== 'full_house') {
        return ctx;
      }

      const bonus = getGrowthJokerValue('house_keeper', ctx.jokerProgress);
      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `House Keeper: Full House로 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'straight_scholar',
    name: 'Straight Scholar',
    description: 'Straight면 현재 누적 수치만큼 기본 점수를 얻고, Straight를 만들 때마다 +15 성장합니다.',
    rarity: 'uncommon',
    tags: ['sequence'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.handRank !== 'straight') {
        return ctx;
      }

      const bonus = getGrowthJokerValue('straight_scholar', ctx.jokerProgress);
      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `Straight Scholar: Straight로 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'six_cult',
    name: 'Six Cult',
    description: '점수 주사위에 6이 포함되면 현재 누적 수치만큼 기본 점수를 얻고, 그때마다 +4 성장합니다.',
    rarity: 'rare',
    tags: ['high'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (!ctx.scoringDice.includes(6)) {
        return ctx;
      }

      const bonus = getGrowthJokerValue('six_cult', ctx.jokerProgress);
      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `Six Cult: 6 포함으로 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'card_sharp',
    name: 'Card Sharp',
    description: '현재 누적 수치만큼 기본 점수를 얻고, 핸드 카드를 사용할 때마다 +2 성장합니다.',
    rarity: 'uncommon',
    tags: ['consistency'],
    trigger: 'beforeScore',
    apply: ctx => {
      const bonus = getGrowthJokerValue('card_sharp', ctx.jokerProgress);
      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `Card Sharp: 누적 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'burn_count',
    name: 'Burn Count',
    description:
      '이번 Hand에서 사용한 카드 수 x 현재 누적 수치만큼 기본 점수를 얻고, 2장 이상 사용한 Hand를 끝낼 때마다 +1 성장합니다.',
    rarity: 'rare',
    tags: ['consistency', 'economy'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.cardsPlayedThisHand <= 0) {
        return ctx;
      }

      const unit = getGrowthJokerValue('burn_count', ctx.jokerProgress);
      const bonus = unit * ctx.cardsPlayedThisHand;
      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `Burn Count: 카드 ${ctx.cardsPlayedThisHand}장으로 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'reroll_ledger',
    name: 'Reroll Ledger',
    description: '리롤을 한 Hand면 현재 누적 수치만큼 배수를 얻고, 리롤할 때마다 +0.1 성장합니다.',
    rarity: 'uncommon',
    tags: ['consistency'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.rerollsUsedThisHand <= 0) {
        return ctx;
      }

      const bonus = getGrowthJokerValue('reroll_ledger', ctx.jokerProgress);
      return {
        ...ctx,
        multiplier: ctx.multiplier + bonus,
        notes: [
          ...ctx.notes,
          `Reroll Ledger: 리롤 Hand로 배수 +${formatMultiplierGrowthForDisplay(bonus)}`,
        ],
      };
    },
  },
  {
    id: 'perfect_grip',
    name: 'Perfect Grip',
    description: '리롤과 카드 사용 없이 제출한 Hand면 현재 누적 수치만큼 기본 점수를 얻고, 그때마다 +6 성장합니다.',
    rarity: 'uncommon',
    tags: ['consistency'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.cardsPlayedThisHand > 0 || ctx.rerollsUsedThisHand > 0) {
        return ctx;
      }

      const bonus = getGrowthJokerValue('perfect_grip', ctx.jokerProgress);
      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `Perfect Grip: 클린 Hand로 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'piggy_bank',
    name: 'Piggy Bank',
    description: '현재 누적 수치만큼 기본 점수를 얻고, 정산에서 이자를 받을 때마다 +5 성장합니다.',
    rarity: 'rare',
    tags: ['economy'],
    trigger: 'beforeScore',
    apply: ctx => {
      const bonus = getGrowthJokerValue('piggy_bank', ctx.jokerProgress);
      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `Piggy Bank: 누적 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'golden_habit',
    name: 'Golden Habit',
    description: '현재 누적 수치만큼 배수를 얻고, 상점에서 구매할 때마다 +0.1 성장합니다.',
    rarity: 'rare',
    tags: ['economy'],
    trigger: 'beforeScore',
    apply: ctx => {
      const bonus = getGrowthJokerValue('golden_habit', ctx.jokerProgress);
      return {
        ...ctx,
        multiplier: ctx.multiplier + bonus,
        notes: [...ctx.notes, `Golden Habit: 누적 배수 +${formatMultiplierGrowthForDisplay(bonus)}`],
      };
    },
  },
  {
    id: 'frugal_mask',
    name: 'Frugal Mask',
    description: '현재 누적 수치만큼 기본 점수를 얻고, 상점을 구매 없이 넘길 때마다 +6 성장합니다.',
    rarity: 'uncommon',
    tags: ['economy', 'consistency'],
    trigger: 'beforeScore',
    apply: ctx => {
      const bonus = getGrowthJokerValue('frugal_mask', ctx.jokerProgress);
      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `Frugal Mask: 누적 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'all_in',
    name: 'All In',
    description: '현재 누적 수치만큼 기본 점수를 얻고, Hand 점수가 목표를 100점 초과할 때마다 +4 성장합니다.',
    rarity: 'rare',
    tags: ['high'],
    trigger: 'beforeScore',
    apply: ctx => {
      const bonus = getGrowthJokerValue('all_in', ctx.jokerProgress);
      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `All In: 누적 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'glass_joker',
    name: 'Glass Joker',
    description:
      '현재 누적 수치만큼 배수를 얻습니다. Hand 점수 60 이상이면 +0.2 성장하지만, 실패하면 0.1로 초기화됩니다.',
    rarity: 'legendary',
    tags: ['high'],
    trigger: 'beforeScore',
    apply: ctx => {
      const bonus = getGrowthJokerValue('glass_joker', ctx.jokerProgress);
      return {
        ...ctx,
        multiplier: ctx.multiplier + bonus,
        notes: [...ctx.notes, `Glass Joker: 누적 배수 +${formatMultiplierGrowthForDisplay(bonus)}`],
      };
    },
  },
  {
    id: 'last_chance',
    name: 'Last Chance',
    description:
      '남은 Hand가 1 이하일 때 현재 누적 수치만큼 기본 점수를 얻고, 그 상태로 스테이지를 클리어하면 +12 성장합니다.',
    rarity: 'legendary',
    tags: ['high', 'consistency'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.remainingHands > 1) {
        return ctx;
      }

      const bonus = getGrowthJokerValue('last_chance', ctx.jokerProgress);
      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `Last Chance: 막판 Hand로 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'gold_rush',
    name: 'Gold Rush',
    description: '현재 보유 골드 5G당 기본 점수 +8을 얻습니다.',
    rarity: 'common',
    tags: ['economy'],
    trigger: 'beforeScore',
    apply: ctx => {
      const bonus = Math.floor(ctx.currentGold / 5) * 8;
      if (bonus <= 0) {
        return ctx;
      }

      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `Gold Rush: 보유 골드로 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'heavy_purse',
    name: 'Heavy Purse',
    description: '현재 보유 골드가 20G 이상이면 배수 +1을 얻습니다.',
    rarity: 'rare',
    tags: ['economy'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.currentGold < 20) {
        return ctx;
      }

      return {
        ...ctx,
        multiplier: ctx.multiplier + 1,
        notes: [...ctx.notes, 'Heavy Purse: 20G 이상으로 배수 +1'],
      };
    },
  },
  {
    id: 'loose_change',
    name: 'Loose Change',
    description: '리롤할 때마다 1G를 얻습니다. 리롤한 Hand면 보유 골드 10G당 기본 점수 +12를 얻습니다.',
    rarity: 'uncommon',
    tags: ['economy', 'consistency'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.rerollsUsedThisHand <= 0) {
        return ctx;
      }

      const bonus = Math.floor(ctx.currentGold / 10) * 12;
      if (bonus <= 0) {
        return ctx;
      }

      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `Loose Change: 리롤 Hand로 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'pawn_broker',
    name: 'Pawn Broker',
    description: '카드나 조커를 팔 때 추가로 1G를 얻고, 이번 스테이지에서 판매한 횟수마다 기본 점수 +14를 얻습니다.',
    rarity: 'uncommon',
    tags: ['economy'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.cardsSoldThisStage <= 0) {
        return ctx;
      }

      const bonus = ctx.cardsSoldThisStage * 14;
      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `Pawn Broker: 판매 ${ctx.cardsSoldThisStage}회로 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'golden_nerves',
    name: 'Golden Nerves',
    description:
      '남은 Hand가 2 이하일 때 보유 골드 10G당 기본 점수 +12를 얻습니다. 마지막 Hand면 이 보너스가 두 배가 됩니다.',
    rarity: 'rare',
    tags: ['economy', 'high'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.remainingHands > 2) {
        return ctx;
      }

      const perTenGold = ctx.remainingHands <= 1 ? 24 : 12;
      const bonus = Math.floor(ctx.currentGold / 10) * perTenGold;
      if (bonus <= 0) {
        return ctx;
      }

      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `Golden Nerves: 막판 자금으로 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'tax_collector',
    name: 'Tax Collector',
    description: '직전 정산에서 받은 이자 1당 기본 점수 +10을 얻습니다.',
    rarity: 'common',
    tags: ['economy'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.interestGoldLastSettlement <= 0) {
        return ctx;
      }

      const bonus = ctx.interestGoldLastSettlement * 10;
      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `Tax Collector: 직전 이자로 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'bribe',
    name: 'Bribe',
    description: '점수 확정 직전에 3G를 자동으로 소모하고 기본 점수 +40을 얻습니다.',
    rarity: 'common',
    tags: ['economy'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.currentGold < 3) {
        return ctx;
      }

      return {
        ...ctx,
        currentGold: ctx.currentGold - 3,
        goldDelta: ctx.goldDelta - 3,
        bonusBase: ctx.bonusBase + 40,
        notes: [...ctx.notes, 'Bribe: 3G를 소모해 기본 점수 +40'],
      };
    },
  },
  {
    id: 'jackpot_engine',
    name: 'Jackpot Engine',
    description: '점수 확정 직전에 5G를 자동으로 소모하고 배수 +1을 얻습니다.',
    rarity: 'legendary',
    tags: ['economy', 'high'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.currentGold < 5) {
        return ctx;
      }

      return {
        ...ctx,
        currentGold: ctx.currentGold - 5,
        goldDelta: ctx.goldDelta - 5,
        multiplier: ctx.multiplier + 1,
        notes: [...ctx.notes, 'Jackpot Engine: 5G를 소모해 배수 +1'],
      };
    },
  },
  {
    id: 'black_market_smile',
    name: 'Black Market Smile',
    description: '이번 상점 방문에서 구매한 횟수마다 기본 점수 +10을 얻습니다.',
    rarity: 'rare',
    tags: ['economy'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.shopPurchasesThisVisit <= 0) {
        return ctx;
      }

      const bonus = ctx.shopPurchasesThisVisit * 10;
      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `Black Market Smile: 구매 ${ctx.shopPurchasesThisVisit}회로 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'six_master',
    name: 'Six Master',
    description: '6이 나올 때마다 배수가 +1 됩니다.',
    rarity: 'uncommon',
    tags: ['high'],
    trigger: 'beforeScore',
    apply: ctx => {
      const sixCount = ctx.scoringDice.filter(value => value === 6).length;
      if (sixCount === 0) {
        return ctx;
      }

      return {
        ...ctx,
        multiplier: ctx.multiplier + sixCount,
        notes: [...ctx.notes, `Six Master: 6 ${sixCount}개로 배수 +${sixCount}`],
      };
    },
  },
  {
    id: 'even_power',
    name: 'Even Power',
    description: '모든 점수 주사위가 짝수면 배수가 +2 됩니다.',
    rarity: 'rare',
    tags: ['even'],
    trigger: 'beforeScore',
    apply: ctx => {
      const isAllEven = ctx.scoringDice.every(value => value % 2 === 0);
      if (!isAllEven) {
        return ctx;
      }

      return {
        ...ctx,
        multiplier: ctx.multiplier + 2,
        notes: [...ctx.notes, 'Even Power: 짝수 시너지 발동으로 배수 +2'],
      };
    },
  },
  {
    id: 'even_polish',
    name: 'Even Polish',
    description: '짝수 주사위 1개당 기본 점수 +4를 얻습니다.',
    rarity: 'rare',
    tags: ['even', 'consistency'],
    trigger: 'beforeScore',
    apply: ctx => {
      const evenCount = ctx.scoringDice.filter(value => value % 2 === 0).length;
      if (evenCount === 0) {
        return ctx;
      }

      const bonus = evenCount * 4;
      return {
        ...ctx,
        bonusBase: ctx.bonusBase + bonus,
        notes: [...ctx.notes, `Even Polish: 짝수 ${evenCount}개로 기본 점수 +${bonus}`],
      };
    },
  },
  {
    id: 'odd_power',
    name: 'Odd Power',
    description: '모든 점수 주사위가 홀수면 배수가 +2 됩니다.',
    rarity: 'rare',
    tags: ['consistency'],
    trigger: 'beforeScore',
    apply: ctx => {
      const isAllOdd = ctx.scoringDice.every(value => value % 2 === 1);
      if (!isAllOdd) {
        return ctx;
      }

      return {
        ...ctx,
        multiplier: ctx.multiplier + 2,
        notes: [...ctx.notes, 'Odd Power: 홀수 시너지 발동으로 배수 +2'],
      };
    },
  },
  {
    id: 'triple_boost',
    name: 'Triple Boost',
    description: '트리플이 포함된 족보면 배수가 +3 됩니다.',
    rarity: 'rare',
    tags: ['set'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (!['three', 'full_house'].includes(ctx.handRank)) {
        return ctx;
      }

      return {
        ...ctx,
        multiplier: ctx.multiplier + 3,
        notes: [...ctx.notes, 'Triple Boost: 세트 족보로 배수 +3'],
      };
    },
  },
  {
    id: 'straight_spark',
    name: 'Straight Spark',
    description: '스트레이트면 기본 점수 +20, 배수 +1을 얻습니다.',
    rarity: 'uncommon',
    tags: ['sequence'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (ctx.handRank !== 'straight') {
        return ctx;
      }

      return {
        ...ctx,
        bonusBase: ctx.bonusBase + 20,
        multiplier: ctx.multiplier + 1,
        notes: [...ctx.notes, 'Straight Spark: 스트레이트로 기본 점수 +20, 배수 +1'],
      };
    },
  },
  {
    id: 'steady_pair',
    name: 'Steady Pair',
    description: '페어 계열 족보면 기본 점수 +12를 얻습니다.',
    rarity: 'common',
    tags: ['consistency', 'set'],
    trigger: 'beforeScore',
    apply: ctx => {
      if (!['pair', 'two_pair', 'full_house'].includes(ctx.handRank)) {
        return ctx;
      }

      return {
        ...ctx,
        bonusBase: ctx.bonusBase + 12,
        notes: [...ctx.notes, 'Steady Pair: 페어 계열 보너스 +12'],
      };
    },
  },
  {
    id: 'lucky_reroll',
    name: 'Lucky Reroll',
    description: '매 Hand 시작 시 무료 리롤을 1회 얻습니다.',
    rarity: 'common',
    tags: ['consistency'],
    trigger: 'onHandStart',
    apply: ctx => ({
      ...ctx,
      extraRerolls: ctx.extraRerolls + 1,
      notes: [...ctx.notes, 'Lucky Reroll: 무료 리롤 +1'],
    }),
  },
  {
    id: 'full_grip',
    name: 'Full Grip',
    description: '매 Hand 시작 시 손패를 1장 더 뽑습니다.',
    rarity: 'uncommon',
    tags: ['consistency'],
    trigger: 'onHandStart',
    apply: ctx => ({
      ...ctx,
      handSizeBonus: ctx.handSizeBonus + 1,
      notes: [...ctx.notes, 'Full Grip: 시작 손패 +1'],
    }),
  },
  {
    id: 'fresh_deal',
    name: 'Fresh Deal',
    description: '매 Hand 시작 시 손패 교체를 1회 얻습니다.',
    rarity: 'rare',
    tags: ['consistency', 'economy'],
    trigger: 'onHandStart',
    apply: ctx => ({
      ...ctx,
      handRefreshes: ctx.handRefreshes + 1,
      notes: [...ctx.notes, 'Fresh Deal: 손패 교체 +1'],
    }),
  },
  {
    id: 'golden_touch',
    name: 'Golden Touch',
    description: '이번 Hand 점수가 80 이상이면 골드 +2를 얻습니다.',
    rarity: 'legendary',
    tags: ['economy'],
    trigger: 'afterScore',
    apply: ctx => {
      if (ctx.finalScore < 80) {
        return ctx;
      }

      return {
        ...ctx,
        goldDelta: ctx.goldDelta + 2,
        notes: [...ctx.notes, 'Golden Touch: 점수 80 이상으로 골드 +2'],
      };
    },
  },
  {
    id: 'gap_draw',
    name: 'Gap Fill',
    description:
      'Hand 점수를 확정할 때마다 손패에 빈 슬롯이 있으면 덱에서 카드를 1장 뽑습니다. (덱·버림패에 남아 있을 때)',
    rarity: 'legendary',
    tags: ['consistency', 'economy'],
    trigger: 'afterScore',
    apply: ctx => ctx,
  },
  {
    id: 'shop_6_slot',
    name: 'Market Expansion',
    description: '상점에서 아이템 슬롯이 최대 6개까지 증가합니다.',
    rarity: 'rare',
    tags: ['economy'],
    trigger: 'onHandStart',
    apply: ctx => ctx,
  },
  {
    id: 'sixth_sense',
    name: 'Sixth Sense',
    description: '매 Hand 시작 시 주사위를 1개 더 굴립니다.',
    rarity: 'legendary',
    tags: ['consistency', 'high'],
    trigger: 'onHandStart',
    apply: ctx => ({
      ...ctx,
      diceCountBonus: ctx.diceCountBonus + 1,
      notes: [...ctx.notes, 'Sixth Sense: 시작 주사위 +1'],
    }),
  },
];

export const BOSSES: BossDefinition[] = [
  {
    id: 'static_sleeve',
    name: 'Static Sleeve',
    description: '가장 오른쪽 조커 1개가 비활성화됩니다.',
    disabledJokerSlots: 1,
  },
  {
    id: 'ceiling_jam',
    name: 'Ceiling Jam',
    description: '5와 6은 점수 계산 시 4로 낮아집니다.',
    applyBeforeJokers: ctx => {
      const scoringDice = ctx.scoringDice.map(value => Math.min(4, value));
      return withNote(
        {
          ...ctx,
          scoringDice,
          diceBase: scoringDice.reduce((sum, value) => sum + value, 0),
        },
        'Ceiling Jam: 5와 6이 점수 계산에서 4로 고정됩니다.',
      );
    },
  },
  {
    id: 'odd_tax',
    name: 'Odd Tax',
    description: '홀수 주사위마다 기본 점수에서 4점씩 차감됩니다.',
    applyBeforeJokers: ctx => {
      const oddCount = ctx.scoringDice.filter(value => value % 2 === 1).length;
      if (oddCount === 0) {
        return ctx;
      }

      return withNote(
        {
          ...ctx,
          bonusBase: ctx.bonusBase - oddCount * 4,
        },
        `Odd Tax: 홀수 ${oddCount}개로 기본 점수 -${oddCount * 4}`,
      );
    },
  },
];

export const STAGES: StageDefinition[] = [
  {
    id: 'small_blind',
    name: 'Small Blind',
    targetScore: 120,
    rewardGold: 3,
  },
  {
    id: 'big_blind',
    name: 'Big Blind',
    targetScore: 260,
    rewardGold: 4,
  },
  {
    id: 'boss_blind',
    name: 'Boss Blind',
    targetScore: 420,
    rewardGold: 6,
  },
];

export const STARTING_DECK = [
  'precision_reroll',
  'precision_reroll',
  'loaded_six',
  'raise_all',
  'mirror_high',
  'even_polish',
];

export const STARTING_JOKERS = ['lucky_reroll'];
