import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { getActionCard, getJoker } from '../game/engine';
import { useRogueRollGame } from '../game/useRogueRollGame';
import { HandRank } from '../game/types';

const HAND_RANK_LABELS: Record<HandRank, string> = {
  high_card: 'High Card',
  pair: 'Pair',
  two_pair: 'Two Pair',
  three: 'Three',
  straight: 'Straight',
  full_house: 'Full House',
  four: 'Four',
  five: 'Five',
};

const PhaseCard = ({
  title,
  description,
  actionLabel,
  onPress,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onPress: () => void;
}) => (
  <View style={styles.overlayCard}>
    <Text style={styles.overlayTitle}>{title}</Text>
    <Text style={styles.overlayDescription}>{description}</Text>
    <Pressable onPress={onPress} style={styles.primaryButton}>
      <Text style={styles.primaryButtonText}>{actionLabel}</Text>
    </Pressable>
  </View>
);

export function RogueRollScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const {
    state,
    stageDefinition,
    boss,
    previewScore,
    purgeOptions,
    activeJokers,
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
  } = useRogueRollGame();

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode ? styles.darkBackground : styles.lightBackground]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.title}>RogueRoll Prototype</Text>
          <Text style={styles.subtitle}>
            주사위, 카드, 조커, 보스, 보상, 상점이 모두 연결된 세로형 MVP입니다.
          </Text>
          <Text style={styles.message}>{state.message}</Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Stage</Text>
            <Text style={styles.metricValue}>
              {state.stage.stageIndex + 1} / 3
            </Text>
            <Text style={styles.metricHint}>{stageDefinition.name}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Score</Text>
            <Text style={styles.metricValue}>
              {state.stage.currentScore} / {stageDefinition.targetScore}
            </Text>
            <Text style={styles.metricHint}>이번 블라인드 누적 점수</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Hands</Text>
            <Text style={styles.metricValue}>{state.stage.remainingHands}</Text>
            <Text style={styles.metricHint}>점수 획득 기회</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Rolls</Text>
            <Text style={styles.metricValue}>
              {state.stage.remainingRolls}
              {state.hand.freeRerolls > 0 ? ` +${state.hand.freeRerolls}` : ''}
            </Text>
            <Text style={styles.metricHint}>남은 리롤 + 무료 리롤</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Gold</Text>
            <Text style={styles.metricValue}>{state.gold}</Text>
            <Text style={styles.metricHint}>상점 구매 자원</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Boss Rule</Text>
          <Text style={styles.sectionValue}>{boss ? boss.name : '일반 블라인드'}</Text>
          <Text style={styles.sectionDescription}>
            {boss ? boss.description : '현재 스테이지에는 추가 보스 제약이 없습니다.'}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Dice</Text>
          <View style={styles.diceRow}>
            {state.hand.dice.map((value, index) => {
              const isSelected = state.hand.selectedDice.includes(index);

              return (
                <Pressable
                  key={`${index}-${value}`}
                  onPress={() => toggleDie(index)}
                  style={[styles.die, isSelected ? styles.dieSelected : undefined]}>
                  <Text style={[styles.dieValue, isSelected ? styles.dieValueSelected : undefined]}>{value}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.buttonRow}>
            <Pressable onPress={selectAllDice} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>모두 선택</Text>
            </Pressable>
            <Pressable onPress={rerollSelectedDice} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>선택 리롤</Text>
            </Pressable>
            <Pressable onPress={submitHand} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>점수 확정</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Projected Score</Text>
          <Text style={styles.previewHeadline}>
            {HAND_RANK_LABELS[previewScore.handRank]} | {previewScore.finalScore}점
          </Text>
          <Text style={styles.sectionDescription}>
            공식: ({previewScore.handBase} hand + {previewScore.diceBase} dice + {previewScore.bonusBase} bonus) x{' '}
            {previewScore.multiplier}
          </Text>
          {previewScore.notes.map(note => (
            <Text key={note} style={styles.noteText}>
              - {note}
            </Text>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Cards In Hand</Text>
          <Text style={styles.sectionDescription}>
            Hand당 최대 2장 사용. 남은 손패는 Hand 종료 시 버림 더미로 이동합니다.
          </Text>
          {state.deck.hand.map((cardId, index) => {
            const card = getActionCard(cardId);
            if (!card) {
              return null;
            }

            return (
              <Pressable
                key={`${cardId}-${index}`}
                onPress={() => playCard(index)}
                style={styles.listButton}>
                <Text style={styles.listButtonTitle}>{card.name}</Text>
                <Text style={styles.listButtonBody}>{card.description}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Jokers</Text>
          <Text style={styles.sectionDescription}>왼쪽부터 적용되며, 보스는 오른쪽 슬롯부터 막습니다.</Text>
          {activeJokers.activeJokerIds.map(jokerId => {
            const joker = getJoker(jokerId);
            if (!joker) {
              return null;
            }

            return (
              <View key={jokerId} style={styles.listItem}>
                <Text style={styles.listButtonTitle}>{joker.name}</Text>
                <Text style={styles.listButtonBody}>{joker.description}</Text>
              </View>
            );
          })}
          {activeJokers.disabledJokerIds.map(jokerId => {
            const joker = getJoker(jokerId);
            if (!joker) {
              return null;
            }

            return (
              <View key={jokerId} style={[styles.listItem, styles.disabledItem]}>
                <Text style={styles.listButtonTitle}>{joker.name} (비활성)</Text>
                <Text style={styles.listButtonBody}>{joker.description}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Deck Economy</Text>
          <Text style={styles.sectionDescription}>
            Draw {state.deck.drawPile.length} / Discard {state.deck.discardPile.length} / Hand {state.deck.hand.length}
          </Text>
        </View>

        {state.lastScore ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Last Hand Result</Text>
            <Text style={styles.previewHeadline}>
              {HAND_RANK_LABELS[state.lastScore.handRank]} | {state.lastScore.finalScore}점
            </Text>
            <Text style={styles.sectionDescription}>
              골드 변화: +{state.lastScore.gainedGold} | 활성 조커 {state.lastScore.activeJokerIds.length}개
            </Text>
            {state.lastScore.notes.map(note => (
              <Text key={note} style={styles.noteText}>
                - {note}
              </Text>
            ))}
          </View>
        ) : null}

        {state.phase === 'reward' ? (
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>Reward Pick</Text>
            <Text style={styles.overlayDescription}>세 가지 보상 중 하나를 골라 다음 스테이지용 빌드를 만드세요.</Text>
            {state.rewardOptions.map(option => (
              <Pressable key={option.id} onPress={() => applyReward(option)} style={styles.listButton}>
                <Text style={styles.listButtonTitle}>{option.title}</Text>
                <Text style={styles.listButtonBody}>{option.description}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {state.phase === 'shop' ? (
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>Shop</Text>
            <Text style={styles.overlayDescription}>골드를 써서 빌드를 다듬거나, 다음 블라인드로 넘어가세요.</Text>
            {state.shopItems.map(item => (
              <Pressable key={item.id} onPress={() => buyShopItem(item)} style={styles.listButton}>
                <Text style={styles.listButtonTitle}>
                  {item.title} | {item.price}G
                </Text>
                <Text style={styles.listButtonBody}>{item.description}</Text>
              </Pressable>
            ))}
            <Pressable onPress={continueFromShop} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>다음 스테이지</Text>
            </Pressable>
          </View>
        ) : null}

        {state.phase === 'purge' ? (
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>Deck Trim</Text>
            <Text style={styles.overlayDescription}>삭제할 카드를 선택하세요. 덱 압축이 빌드 안정성을 올립니다.</Text>
            {purgeOptions.map(option => {
              const card = getActionCard(option.cardId);
              if (!card) {
                return null;
              }

              return (
                <Pressable
                  key={`${option.zone}-${option.index}-${option.cardId}`}
                  onPress={() => removeDeckCard(option)}
                  style={styles.listButton}>
                  <Text style={styles.listButtonTitle}>
                    {card.name} | {option.zone === 'drawPile' ? 'Draw' : 'Discard'}
                  </Text>
                  <Text style={styles.listButtonBody}>{card.description}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {state.phase === 'victory' ? (
          <PhaseCard
            title="Run Complete"
            description="보스 블라인드를 돌파했습니다. 현재 구조는 1회 런 기준 MVP이며, 이후 안테 확장이나 메타 성장 시스템을 붙이기 좋습니다."
            actionLabel="새 런 시작"
            onPress={restartRun}
          />
        ) : null}

        {state.phase === 'defeat' ? (
          <PhaseCard
            title="Run Failed"
            description="이번 빌드는 목표 점수에 도달하지 못했습니다. 조커 순서와 덱 압축을 다시 시험해보세요."
            actionLabel="다시 도전"
            onPress={restartRun}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  darkBackground: {
    backgroundColor: '#101217',
  },
  lightBackground: {
    backgroundColor: '#f4f5f7',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#1d2230',
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#c9d1e8',
    lineHeight: 20,
  },
  message: {
    fontSize: 13,
    color: '#8fe3ff',
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6d7483',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  metricHint: {
    fontSize: 12,
    color: '#7b8496',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#667085',
  },
  diceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  die: {
    flex: 1,
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: '#e9edf7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dieSelected: {
    backgroundColor: '#1d4ed8',
    borderColor: '#0f172a',
  },
  dieValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  dieValueSelected: {
    color: '#ffffff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#e7ecf8',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  previewHeadline: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#475467',
  },
  listButton: {
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  listItem: {
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  disabledItem: {
    opacity: 0.55,
  },
  listButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  listButtonBody: {
    fontSize: 13,
    lineHeight: 18,
    color: '#667085',
  },
  overlayCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  overlayDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#d1d5db',
  },
});
