import { evaluateHand, scoreDice } from '../src/game/engine';

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
});
