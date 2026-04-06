import { evaluateHand, getActionCard, scoreDice } from '../src/game/engine';

describe('rogueroll engine', () => {
  test('detects a straight correctly', () => {
    const result = evaluateHand([2, 3, 4, 5, 6]);

    expect(result.rank).toBe('straight');
    expect(result.total).toBe(20);
  });

  test('applies jokers on score calculation', () => {
    const result = scoreDice({
      dice: [6, 6, 2, 4, 4],
      jokerIds: ['six_master', 'even_power'],
    });

    expect(result.handRank).toBe('two_pair');
    expect(result.multiplier).toBe(5);
    expect(result.finalScore).toBe(210);
  });

  test('boss can disable the rightmost joker slot', () => {
    const result = scoreDice({
      dice: [6, 6, 6, 2, 2],
      jokerIds: ['triple_boost', 'golden_touch'],
      bossId: 'static_sleeve',
    });

    expect(result.activeJokerIds).toEqual(['triple_boost']);
    expect(result.disabledJokerIds).toEqual(['golden_touch']);
    expect(result.finalScore).toBe(328);
  });

  test('boss shield nullifies boss handicap on boss stage', () => {
    const withShield = scoreDice({
      dice: [6, 6, 6, 2, 2],
      jokerIds: ['triple_boost', 'golden_touch', 'boss_shield'],
      bossId: 'static_sleeve',
    });
    expect(withShield.activeJokerIds).toEqual(['triple_boost', 'golden_touch', 'boss_shield']);
    expect(withShield.disabledJokerIds).toEqual([]);
    const noShieldSameDice = scoreDice({
      dice: [6, 6, 6, 2, 2],
      jokerIds: ['triple_boost', 'golden_touch'],
      bossId: 'static_sleeve',
    });
    expect(withShield.finalScore).toBe(noShieldSameDice.finalScore);

    const ceilingOnly = scoreDice({
      dice: [5, 5, 5, 2, 2],
      jokerIds: ['boss_shield'],
      bossId: 'ceiling_jam',
    });
    expect(ceilingOnly.scoringDice.filter(v => v === 5).length).toBe(3);
    const ceilingNoShield = scoreDice({
      dice: [5, 5, 5, 2, 2],
      jokerIds: [],
      bossId: 'ceiling_jam',
    });
    expect(ceilingOnly.diceBase).toBeGreaterThan(ceilingNoShield.diceBase);
  });

  test('gold jokers use current gold for score and spending', () => {
    const result = scoreDice({
      dice: [6, 6, 2, 4, 4],
      jokerIds: ['gold_rush', 'bribe', 'jackpot_engine'],
      currentGold: 25,
    });

    expect(result.bonusBase).toBe(80);
    expect(result.multiplier).toBe(2);
    expect(result.goldDelta).toBe(-8);
    expect(result.finalScore).toBe(244);
  });

  test('tax collector and pawn broker reflect stored economy state', () => {
    const result = scoreDice({
      dice: [3, 3, 3, 2, 2],
      jokerIds: ['tax_collector', 'pawn_broker'],
      interestGoldLastSettlement: 4,
      cardsSoldThisStage: 2,
    });

    expect(result.handRank).toBe('full_house');
    expect(result.bonusBase).toBe(68);
    expect(result.finalScore).toBe(141);
  });

  test('gold cards fail without enough gold and succeed with cost', () => {
    const goldBurn = getActionCard('gold_burn');
    expect(goldBurn).toBeDefined();

    const failed = goldBurn?.apply({
      dice: [1, 2, 3, 4, 5],
      selectedDice: [],
      rollDiceAt: dice => dice,
      jokerIds: [],
      negativeJokerIds: [],
      currentGold: 9,
      rng: () => 0.25,
    });
    expect(failed).toEqual({ ok: false, message: 'Gold Burn은 10G가 필요합니다.' });

    const success = goldBurn?.apply({
      dice: [1, 2, 3, 4, 5],
      selectedDice: [],
      rollDiceAt: dice => dice,
      jokerIds: [],
      negativeJokerIds: [],
      currentGold: 10,
      rng: () => 0.25,
    });

    expect(success).toMatchObject({
      ok: true,
      goldCost: 10,
      scoreBonusDelta: 120,
    });
  });
});
