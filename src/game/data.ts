import {
  ActionCardDefinition,
  BossDefinition,
  BossScoreContext,
  JokerDefinition,
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
      '보유한 조커 중 네거티브가 아닌 조커 1장을 무작위로 네거티브로 만듭니다. 네거티브 조커는 슬롯을 차지하지 않습니다.',
    rarity: 'legendary',
    tags: ['economy'],
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
];

export const JOKERS: JokerDefinition[] = [
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
