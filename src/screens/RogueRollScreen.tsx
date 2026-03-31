import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  getActionCard,
  getJoker,
  getSellPriceHandCard,
  getSellPriceJoker,
  getShopHandCardPrice,
  SHOP_JOKER_PRICE,
} from '../game/engine';
import { getActionCardPreviewImage } from '../game/actionCardPreviewImages';
import { getJokerPreviewImage } from '../game/jokerPreviewImages';
import { useRogueRollGame } from '../game/useRogueRollGame';
import { DiceValue, HandRank, JokerRarity } from '../game/types';

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

const HAND_RANK_GUIDE: Array<{ rank: HandRank; base: number; hint: string }> = [
  { rank: 'high_card', base: 0, hint: '기본 숫자 합만 반영됩니다.' },
  { rank: 'pair', base: 10, hint: '안정적인 초반 점수용.' },
  { rank: 'two_pair', base: 20, hint: '셋업형 조커와 궁합이 좋습니다.' },
  { rank: 'three', base: 30, hint: '세트 빌드의 시작점.' },
  { rank: 'straight', base: 40, hint: '연속 숫자 빌드의 핵심.' },
  { rank: 'full_house', base: 60, hint: '안정성과 고점의 균형.' },
  { rank: 'four', base: 80, hint: '강한 단일 족보.' },
  { rank: 'five', base: 100, hint: '최상위 족보.' },
];

const JOKER_TRIGGER_LABELS = {
  onHandStart: '시작 효과',
  beforeScore: '점수 전',
  afterScore: '점수 후',
} as const;

const JOKER_RARITY_LABELS: Record<JokerRarity, string> = {
  common: '일반',
  uncommon: '희귀',
  rare: '레어',
  legendary: '전설',
};

const JOKER_RARITY_COLORS: Record<JokerRarity, { frame: string; glow: string }> = {
  common: { frame: '#9aa6b2', glow: 'rgba(154, 166, 178, 0.28)' },
  uncommon: { frame: '#3b82f6', glow: 'rgba(59, 130, 246, 0.35)' },
  rare: { frame: '#ef4444', glow: 'rgba(239, 68, 68, 0.35)' },
  legendary: { frame: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)' },
};

const DIE_PIP_MAP: Record<DiceValue, boolean[]> = {
  1: [false, false, false, false, true, false, false, false, false],
  2: [true, false, false, false, false, false, false, false, true],
  3: [true, false, false, false, true, false, false, false, true],
  4: [true, false, true, false, false, false, true, false, true],
  5: [true, false, true, false, true, false, true, false, true],
  6: [true, false, true, true, false, true, true, false, true],
};

const TAG_LABELS = {
  high: 'HIGH',
  even: 'EVEN',
  set: 'SET',
  sequence: 'RUN',
  economy: 'GOLD',
  consistency: 'SAFE',
} as const;

const ACTION_CARD_THEME = {
  high: { frame: '#1f6feb', surface: '#e7f0ff', accent: '#0d63c9', badge: '#cfe0ff' },
  even: { frame: '#0f766e', surface: '#def7f3', accent: '#0f766e', badge: '#c9f0ea' },
  set: { frame: '#7c3aed', surface: '#efe7ff', accent: '#7c3aed', badge: '#dfcffd' },
  sequence: { frame: '#ea580c', surface: '#ffeddc', accent: '#ea580c', badge: '#ffd6bc' },
  economy: { frame: '#b7791f', surface: '#fff4d8', accent: '#b7791f', badge: '#ffe8ae' },
  consistency: { frame: '#2563eb', surface: '#e8f1ff', accent: '#2563eb', badge: '#d6e5ff' },
} as const;

const JOKER_THEME = {
  high: { frame: '#8b5cf6', surface: '#23143c', accent: '#b692ff', badge: '#3a235d' },
  even: { frame: '#14b8a6', surface: '#102827', accent: '#6ee7d8', badge: '#183938' },
  set: { frame: '#d946ef', surface: '#2b1334', accent: '#f0abfc', badge: '#441b4f' },
  sequence: { frame: '#f97316', surface: '#2d1a12', accent: '#fdba74', badge: '#47291c' },
  economy: { frame: '#eab308', surface: '#2e260d', accent: '#fde047', badge: '#4e4212' },
  consistency: { frame: '#38bdf8', surface: '#102535', accent: '#7dd3fc', badge: '#1a3850' },
} as const;
const DICE_ROLL_DURATION_MS = 400;

const getPrimaryTag = (tags: Array<keyof typeof TAG_LABELS> | undefined) =>
  tags?.[0] ?? 'consistency';

const getActionTheme = (tags: Array<keyof typeof ACTION_CARD_THEME> | undefined) =>
  ACTION_CARD_THEME[getPrimaryTag(tags)];

const getJokerTheme = (tags: Array<keyof typeof JOKER_THEME> | undefined) =>
  JOKER_THEME[getPrimaryTag(tags)];

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

const OverlayModal = ({
  visible,
  title,
  children,
  onClose,
  dismissible = true,
}: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  dismissible?: boolean;
}) => (
  <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          {dismissible ? (
            <Pressable onPress={onClose} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>닫기</Text>
            </Pressable>
          ) : null}
        </View>
        {children}
      </View>
    </View>
  </Modal>
);

const DieFace = ({
  value,
  selected,
}: {
  value: DiceValue;
  selected: boolean;
}) => (
  <View style={[styles.dieFace, selected ? styles.dieFaceSelected : undefined]}>
    <View style={styles.dieGrid}>
      {DIE_PIP_MAP[value].map((visible, index) => (
        <View key={`${value}-${index}`} style={styles.dieCell}>
          {visible ? (
            <View style={[styles.diePip, selected ? styles.diePipSelected : styles.diePipDefault]} />
          ) : null}
        </View>
      ))}
    </View>
  </View>
);

const DropZoneHandPreview = ({ cardId }: { cardId: string }) => {
  const card = getActionCard(cardId);
  if (!card) {
    return null;
  }

  const img = getActionCardPreviewImage(cardId);
  const theme = getActionTheme(card.tags);
  const rarityTheme = JOKER_RARITY_COLORS[card.rarity];

  return (
    <View
      style={[
        styles.dropZoneMiniCard,
        {
          borderColor: rarityTheme?.frame ?? theme.frame,
          backgroundColor: theme.surface,
        },
      ]}>
      {img ? (
        <Image source={img} style={styles.dropZoneMiniCardImage} resizeMode="cover" />
      ) : (
        <Text style={[styles.dropZoneMiniCardGlyph, { color: theme.accent }]}>{card.name.slice(0, 1)}</Text>
      )}
    </View>
  );
};

const DropZoneJokerPreview = ({ jokerId }: { jokerId: string }) => {
  const joker = getJoker(jokerId);
  if (!joker) {
    return null;
  }

  const img = getJokerPreviewImage(jokerId);
  const theme = getJokerTheme(joker.tags);
  const rarityTheme = JOKER_RARITY_COLORS[joker.rarity];

  return (
    <View
      style={[
        styles.dropZoneMiniJoker,
        { borderColor: rarityTheme?.frame ?? theme.frame, backgroundColor: theme.surface },
      ]}>
      {img ? (
        <Image source={img} style={styles.dropZoneMiniJokerImage} resizeMode="cover" />
      ) : (
        <Text style={[styles.dropZoneMiniJokerGlyph, { color: theme.accent }]}>{joker.name.slice(0, 1)}</Text>
      )}
    </View>
  );
};

export function RogueRollScreen({
  startingJokerId = 'lucky_reroll',
  onBackToLobby,
}: {
  startingJokerId?: string;
  onBackToLobby?: () => void;
}) {
  const isDarkMode = useColorScheme() === 'dark';
  const { height } = useWindowDimensions();
  const isCompact = height < 860;
  const [showGuide, setShowGuide] = useState(false);
  const [showRunInfo, setShowRunInfo] = useState(false);
  const [showDeckList, setShowDeckList] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [selectedJokerIndex, setSelectedJokerIndex] = useState<number | null>(null);
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [rewardTooltipId, setRewardTooltipId] = useState<string | null>(null);
  const [selectedShopItemId, setSelectedShopItemId] = useState<string | null>(null);
  const [shopTooltipId, setShopTooltipId] = useState<string | null>(null);
  const [draggingCardIndex, setDraggingCardIndex] = useState<number | null>(null);
  const [draggingJokerIndex, setDraggingJokerIndex] = useState<number | null>(null);
  const [isDraggingOverSellZone, setIsDraggingOverSellZone] = useState(false);
  const [isDraggingOverUseZone, setIsDraggingOverUseZone] = useState(false);
  const [useZoneRect, setUseZoneRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [sellZoneRect, setSellZoneRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const {
    state,
    stageDefinition,
    totalAntes,
    boss,
    previewScore,
    purgeOptions,
    activeJokers,
    toggleDie,
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
    removeDeckCard,
    continueFromShop,
    continueFromSettlement,
    restartRun,
  } = useRogueRollGame(startingJokerId);
  const visibleCardSlotCount = Math.max(3, state.hand.drawCount, state.deck.hand.length);
  const [displayDice, setDisplayDice] = useState(state.hand.dice);
  const diceAnimationsRef = useRef(
    state.hand.dice.map(() => new Animated.Value(0)),
  );
  const diceSelectAnimationsRef = useRef(
    state.hand.dice.map(() => new Animated.Value(0)),
  );
  const cardSelectAnimationsRef = useRef<Animated.Value[]>([]);
  const cardDragAnimationsRef = useRef<Animated.ValueXY[]>([]);
  const jokerSelectAnimationsRef = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0)));
  const jokerDragAnimationsRef = useRef<Animated.ValueXY[]>([]);
  const cardTooltipAnimation = useRef(new Animated.Value(0)).current;
  const jokerTooltipAnimation = useRef(new Animated.Value(0)).current;
  const useZoneRef = useRef<View | null>(null);
  const sellZoneRef = useRef<View | null>(null);
  const cardSlotRefs = useRef<Array<View | null>>([]);
  const cardSlotRectsRef = useRef<Array<{ x: number; y: number; width: number; height: number } | null>>([]);
  const jokerSlotRefs = useRef<Array<View | null>>([]);
  const jokerSlotRectsRef = useRef<Array<{ x: number; y: number; width: number; height: number } | null>>([]);
  const previousDiceRef = useRef(state.hand.dice);
  const mountedRef = useRef(false);
  const timeoutRefs = useRef<Array<ReturnType<typeof setTimeout> | null>>(
    state.hand.dice.map(() => null),
  );

  const overlayTitle = useMemo(() => {
    if (state.phase === 'settlement') {
      return '스테이지 정산';
    }
    if (state.phase === 'reward') {
      return '보상 선택';
    }
    if (state.phase === 'shop') {
      return '상점';
    }
    if (state.phase === 'purge') {
      return '카드 제거';
    }
    if (state.phase === 'victory') {
      return '런 완료';
    }
    if (state.phase === 'defeat') {
      return '런 실패';
    }
    return '';
  }, [state.phase]);

  const selectedCardId =
    selectedCardIndex !== null ? state.deck.hand[selectedCardIndex] : undefined;
  const selectedCard = selectedCardId ? getActionCard(selectedCardId) : undefined;
  const draggingHandCardDef =
    draggingCardIndex !== null && state.deck.hand[draggingCardIndex]
      ? getActionCard(state.deck.hand[draggingCardIndex])
      : undefined;
  const selectedJokerId =
    selectedJokerIndex !== null ? state.jokers[selectedJokerIndex] : undefined;
  const selectedJoker = selectedJokerId ? getJoker(selectedJokerId) : undefined;
  const selectedRewardOption =
    state.phase === 'reward'
      ? state.rewardOptions.find(option => option.id === selectedRewardId) ?? null
      : null;
  const selectedShopItem =
    state.phase === 'shop'
      ? state.shopItems.find(item => item.id === selectedShopItemId) ?? null
      : null;
  const canBuySelectedShopItem = !!selectedShopItem && state.gold >= selectedShopItem.price;
  const negativeJokerIds = useMemo(
    () => state.negativeJokerIds.filter(jokerId => state.jokers.includes(jokerId)),
    [state.jokers, state.negativeJokerIds],
  );
  const occupiedJokerSlots = Math.max(0, state.jokers.length - negativeJokerIds.length);
  const jokerSlotCount = Math.max(5 + negativeJokerIds.length, state.jokers.length);
  const blindTypeLabel = stageDefinition.name;
  const blindRuleText = boss ? boss.description : undefined;
  const dismissActiveTooltip = useCallback(() => {
    setSelectedCardIndex(null);
    setSelectedJokerIndex(null);
  }, []);
  const selectedCardTooltipStyle = useMemo(() => {
    if (selectedCardIndex === null) {
      return undefined;
    }

    const tooltipWidthPercent = Math.min(40, Math.max(28, (100 / visibleCardSlotCount) * 1.4));
    const slotWidthPercent = 100 / visibleCardSlotCount;
    const slotCenterPercent = slotWidthPercent * (selectedCardIndex + 0.5);
    const maxLeftPercent = 100 - tooltipWidthPercent;
    const leftPercent = Math.min(
      maxLeftPercent,
      Math.max(0, slotCenterPercent - tooltipWidthPercent / 2),
    );

    return {
      width: `${tooltipWidthPercent}%` as const,
      left: `${leftPercent}%` as const,
    };
  }, [selectedCardIndex, visibleCardSlotCount]);
  const selectedJokerTooltipStyle = useMemo(() => {
    if (selectedJokerIndex === null) {
      return undefined;
    }

    const tooltipWidthPercent = Math.min(58, Math.max(34, Math.round(180 / jokerSlotCount)));
    const slotWidthPercent = 100 / jokerSlotCount;
    const slotCenterPercent = slotWidthPercent * (selectedJokerIndex + 0.5);
    const maxLeftPercent = 100 - tooltipWidthPercent;
    const leftPercent = Math.min(
      maxLeftPercent,
      Math.max(0, slotCenterPercent - tooltipWidthPercent / 2),
    );

    return {
      width: `${tooltipWidthPercent}%` as const,
      left: `${leftPercent}%` as const,
    };
  }, [jokerSlotCount, selectedJokerIndex]);
  const deckSections = useMemo(
    () => [
      { title: `손패 ${state.deck.hand.length}`, cards: state.deck.hand },
      { title: `드로우 ${state.deck.drawPile.length}`, cards: state.deck.drawPile },
      { title: `버림 ${state.deck.discardPile.length}`, cards: state.deck.discardPile },
    ],
    [state.deck.discardPile, state.deck.drawPile, state.deck.hand],
  );

  useEffect(() => {
    if (state.phase !== 'reward') {
      setSelectedRewardId(null);
      setRewardTooltipId(null);
      return;
    }
    if (!selectedRewardId && state.rewardOptions.length > 0) {
      setSelectedRewardId(state.rewardOptions[0].id);
    }
  }, [state.phase, state.rewardOptions, selectedRewardId]);

  useEffect(() => {
    if (state.phase !== 'shop') {
      setSelectedShopItemId(null);
      setShopTooltipId(null);
      return;
    }
    setSelectedShopItemId(state.shopItems[0]?.id ?? null);
  }, [state.phase, state.shopItems]);

  while (cardSelectAnimationsRef.current.length < visibleCardSlotCount) {
    cardSelectAnimationsRef.current.push(new Animated.Value(0));
  }

  while (cardDragAnimationsRef.current.length < visibleCardSlotCount) {
    cardDragAnimationsRef.current.push(new Animated.ValueXY({ x: 0, y: 0 }));
  }

  while (jokerDragAnimationsRef.current.length < jokerSlotCount) {
    jokerDragAnimationsRef.current.push(new Animated.ValueXY({ x: 0, y: 0 }));
  }

  const handleCardPreview = (index: number) => {
    setSelectedJokerIndex(null);
    setSelectedCardIndex(current => (current === index ? null : index));
  };

  const handleJokerPreview = (index: number) => {
    setSelectedCardIndex(null);
    setSelectedJokerIndex(current => (current === index ? null : index));
  };

  const resetDraggedJokerPosition = useCallback((slotIndex: number) => {
    const dragAnimation = jokerDragAnimationsRef.current[slotIndex];
    if (!dragAnimation) {
      return;
    }

    Animated.spring(dragAnimation, {
      toValue: { x: 0, y: 0 },
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, []);

  const resetDraggedCardPosition = useCallback((index: number) => {
    const dragAnimation = cardDragAnimationsRef.current[index];
    if (!dragAnimation) {
      return;
    }

    Animated.spring(dragAnimation, {
      toValue: { x: 0, y: 0 },
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, []);

  const updateUseZoneRect = useCallback(() => {
    requestAnimationFrame(() => {
      useZoneRef.current?.measureInWindow((x, y, width, height) => {
        setUseZoneRect({ x, y, width, height });
      });
    });
  }, []);

  const updateSellZoneRect = useCallback(() => {
    requestAnimationFrame(() => {
      sellZoneRef.current?.measureInWindow((x, y, width, height) => {
        setSellZoneRect({ x, y, width, height });
      });
    });
  }, []);

  const isPointInsideUseZone = useCallback(
    (moveX: number, moveY: number) =>
    Boolean(
      useZoneRect &&
        moveX >= useZoneRect.x &&
        moveX <= useZoneRect.x + useZoneRect.width &&
        moveY >= useZoneRect.y &&
        moveY <= useZoneRect.y + useZoneRect.height,
    ),
    [useZoneRect],
  );

  const isPointInsideSellZone = useCallback(
    (moveX: number, moveY: number) =>
      Boolean(
        sellZoneRect &&
          moveX >= sellZoneRect.x &&
          moveX <= sellZoneRect.x + sellZoneRect.width &&
          moveY >= sellZoneRect.y &&
          moveY <= sellZoneRect.y + sellZoneRect.height,
      ),
    [sellZoneRect],
  );

  const findSlotIndexAtPoint = useCallback(
    (
      x: number,
      y: number,
      rects: Array<{ x: number; y: number; width: number; height: number } | null | undefined>,
      slotCount: number,
    ): number | null => {
      for (let i = 0; i < slotCount; i += 1) {
        const r = rects[i];
        if (!r) {
          continue;
        }
        if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
          return i;
        }
      }
      let best: number | null = null;
      let bestDist = Infinity;
      for (let i = 0; i < slotCount; i += 1) {
        const r = rects[i];
        if (!r) {
          continue;
        }
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    },
    [],
  );

  useEffect(() => {
    if (selectedCardIndex !== null && selectedCardIndex >= state.deck.hand.length) {
      setSelectedCardIndex(null);
    }
  }, [selectedCardIndex, state.deck.hand.length]);

  useEffect(() => {
    if (selectedJokerIndex !== null && selectedJokerIndex >= state.jokers.length) {
      setSelectedJokerIndex(null);
    }
  }, [selectedJokerIndex, state.jokers.length]);

  useEffect(() => {
    if (draggingCardIndex !== null || draggingJokerIndex !== null) {
      updateSellZoneRect();
      if (draggingCardIndex !== null) {
        updateUseZoneRect();
      }
    }
  }, [
    draggingCardIndex,
    draggingJokerIndex,
    updateSellZoneRect,
    updateUseZoneRect,
    visibleCardSlotCount,
  ]);

  useEffect(() => {
    if (draggingCardIndex !== null && draggingCardIndex >= state.deck.hand.length) {
      setDraggingCardIndex(null);
      setIsDraggingOverUseZone(false);
      setIsDraggingOverSellZone(false);
    }
  }, [draggingCardIndex, state.deck.hand.length]);

  useEffect(() => {
    if (draggingJokerIndex !== null && draggingJokerIndex >= state.jokers.length) {
      setDraggingJokerIndex(null);
      setIsDraggingOverSellZone(false);
    }
  }, [draggingJokerIndex, state.jokers.length]);

  useEffect(() => {
    const timeouts = timeoutRefs.current;

    return () => {
      timeouts.forEach(timer => {
        if (timer) {
          clearTimeout(timer);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      previousDiceRef.current = state.hand.dice;
      setDisplayDice(state.hand.dice);
      return;
    }

    const changedIndices = state.hand.dice.reduce<number[]>((indices, value, index) => {
      if (previousDiceRef.current[index] !== value) {
        indices.push(index);
      }
      return indices;
    }, []);

    if (changedIndices.length === 0) {
      previousDiceRef.current = state.hand.dice;
      return;
    }

    changedIndices.forEach(index => {
      const animation = diceAnimationsRef.current[index];
      const finalValue = state.hand.dice[index];

      if (timeoutRefs.current[index]) {
        clearTimeout(timeoutRefs.current[index]!);
      }

      animation.stopAnimation();
      animation.setValue(0);

      // 회전 중간(50%)에 숫자를 한 번 랜덤 변경해 슬롯머신 느낌을 냅니다.
      timeoutRefs.current[index] = setTimeout(() => {
        setDisplayDice(currentDice => {
          const nextDice = [...currentDice];
          nextDice[index] = (Math.floor(Math.random() * 6) + 1) as DiceValue;
          return nextDice as typeof currentDice;
        });
      }, DICE_ROLL_DURATION_MS / 2);

      Animated.timing(animation, {
        toValue: 1,
        duration: DICE_ROLL_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => {
        if (timeoutRefs.current[index]) {
          clearTimeout(timeoutRefs.current[index]!);
          timeoutRefs.current[index] = null;
        }
        setDisplayDice(currentDice => {
          const nextDice = [...currentDice];
          nextDice[index] = finalValue;
          return nextDice as typeof currentDice;
        });
        animation.setValue(0);
      });
    });

    previousDiceRef.current = state.hand.dice;
  }, [state.hand.dice]);

  useEffect(() => {
    diceSelectAnimationsRef.current.forEach((animation, index) => {
      Animated.spring(animation, {
        toValue: state.hand.selectedDice.includes(index) ? 1 : 0,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }).start();
    });
  }, [state.hand.selectedDice]);

  useEffect(() => {
    cardSelectAnimationsRef.current.forEach((animation, index) => {
      Animated.spring(animation, {
        toValue: selectedCardIndex === index && index < state.deck.hand.length ? 1 : 0,
        friction: 7,
        tension: 130,
        useNativeDriver: true,
      }).start();
    });
  }, [selectedCardIndex, state.deck.hand.length]);

  useEffect(() => {
    jokerSelectAnimationsRef.current.forEach((animation, index) => {
      Animated.spring(animation, {
        toValue: selectedJokerIndex === index ? 1 : 0,
        friction: 7,
        tension: 130,
        useNativeDriver: true,
      }).start();
    });
  }, [selectedJokerIndex]);

  useEffect(() => {
    if (!selectedCard) {
      cardTooltipAnimation.setValue(0);
      return;
    }

    Animated.timing(cardTooltipAnimation, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [selectedCard, cardTooltipAnimation]);

  useEffect(() => {
    if (!selectedJoker) {
      jokerTooltipAnimation.setValue(0);
      return;
    }

    Animated.timing(jokerTooltipAnimation, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [selectedJoker, jokerTooltipAnimation]);

  const cardPanResponders = useMemo(
    () =>
      Array.from({ length: visibleCardSlotCount }, (_, index) =>
        PanResponder.create({
          onMoveShouldSetPanResponderCapture: (_, gestureState) =>
            state.phase === 'playing' &&
            index < state.deck.hand.length &&
            (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2),
          onMoveShouldSetPanResponder: (_, gestureState) =>
            state.phase === 'playing' &&
            index < state.deck.hand.length &&
            (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2),
          onPanResponderGrant: () => {
            const dragAnimation = cardDragAnimationsRef.current[index];
            dragAnimation?.stopAnimation();
            dragAnimation?.setValue({ x: 0, y: 0 });
            setDraggingCardIndex(index);
            updateSellZoneRect();
            updateUseZoneRect();
            for (let i = 0; i < visibleCardSlotCount; i += 1) {
              cardSlotRefs.current[i]?.measureInWindow((x, y, w, h) => {
                cardSlotRectsRef.current[i] = { x, y, width: w, height: h };
              });
            }
          },
          onPanResponderMove: (_, gestureState) => {
            cardDragAnimationsRef.current[index].setValue({
              x: gestureState.dx,
              y: gestureState.dy,
            });
            const mx = gestureState.moveX;
            const my = gestureState.moveY;
            setIsDraggingOverSellZone(isPointInsideSellZone(mx, my));
            setIsDraggingOverUseZone(isPointInsideUseZone(mx, my));
          },
          onPanResponderRelease: (_, gestureState) => {
            const mx = gestureState.moveX;
            const my = gestureState.moveY;
            const shouldSell = isPointInsideSellZone(mx, my);
            const shouldUseCard = isPointInsideUseZone(mx, my);

            resetDraggedCardPosition(index);
            setDraggingCardIndex(null);
            setIsDraggingOverUseZone(false);
            setIsDraggingOverSellZone(false);

            if (shouldSell) {
              sellHandCard(index);
            } else if (shouldUseCard) {
              playCard(index);
            } else {
              const target = findSlotIndexAtPoint(
                mx,
                my,
                cardSlotRectsRef.current,
                visibleCardSlotCount,
              );
              if (target !== null && target !== index) {
                reorderHandCards(index, target);
                setSelectedCardIndex(null);
              }
            }
          },
          onPanResponderTerminate: () => {
            resetDraggedCardPosition(index);
            setDraggingCardIndex(null);
            setIsDraggingOverUseZone(false);
            setIsDraggingOverSellZone(false);
          },
        }),
      ),
    [
      findSlotIndexAtPoint,
      isPointInsideSellZone,
      isPointInsideUseZone,
      playCard,
      reorderHandCards,
      resetDraggedCardPosition,
      sellHandCard,
      state.deck.hand.length,
      state.phase,
      updateSellZoneRect,
      updateUseZoneRect,
      visibleCardSlotCount,
    ],
  );

  const jokerPanResponders = useMemo(
    () =>
      Array.from({ length: jokerSlotCount }, (_, slotIndex) =>
        PanResponder.create({
          onMoveShouldSetPanResponderCapture: (_, gestureState) =>
            state.phase === 'playing' &&
            Boolean(state.jokers[slotIndex]) &&
            (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2),
          onMoveShouldSetPanResponder: (_, gestureState) =>
            state.phase === 'playing' &&
            Boolean(state.jokers[slotIndex]) &&
            (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2),
          onPanResponderGrant: () => {
            const dragAnimation = jokerDragAnimationsRef.current[slotIndex];
            dragAnimation?.stopAnimation();
            dragAnimation?.setValue({ x: 0, y: 0 });
            setDraggingJokerIndex(slotIndex);
            updateSellZoneRect();
            for (let i = 0; i < jokerSlotCount; i += 1) {
              jokerSlotRefs.current[i]?.measureInWindow((x, y, w, h) => {
                jokerSlotRectsRef.current[i] = { x, y, width: w, height: h };
              });
            }
          },
          onPanResponderMove: (_, gestureState) => {
            jokerDragAnimationsRef.current[slotIndex].setValue({
              x: gestureState.dx,
              y: gestureState.dy,
            });
            setIsDraggingOverSellZone(
              isPointInsideSellZone(gestureState.moveX, gestureState.moveY),
            );
          },
          onPanResponderRelease: (_, gestureState) => {
            const shouldSell = isPointInsideSellZone(gestureState.moveX, gestureState.moveY);

            resetDraggedJokerPosition(slotIndex);
            setDraggingJokerIndex(null);
            setIsDraggingOverSellZone(false);

            if (shouldSell) {
              sellJoker(slotIndex);
            } else {
              const target = findSlotIndexAtPoint(
                gestureState.moveX,
                gestureState.moveY,
                jokerSlotRectsRef.current,
                jokerSlotCount,
              );
              if (target !== null && target !== slotIndex) {
                reorderJokers(slotIndex, target);
                setSelectedJokerIndex(null);
              }
            }
          },
          onPanResponderTerminate: () => {
            resetDraggedJokerPosition(slotIndex);
            setDraggingJokerIndex(null);
            setIsDraggingOverSellZone(false);
          },
        }),
      ),
    [
      findSlotIndexAtPoint,
      isPointInsideSellZone,
      jokerSlotCount,
      reorderJokers,
      resetDraggedJokerPosition,
      sellJoker,
      state.jokers,
      state.phase,
      updateSellZoneRect,
    ],
  );

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode ? styles.darkBackground : styles.lightBackground]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={[styles.screen, isCompact ? styles.screenCompact : undefined]}>
        {selectedCard || selectedJoker ? (
          <Pressable onPress={dismissActiveTooltip} style={styles.tooltipDismissOverlay} />
        ) : null}
        {state.phase === 'playing' && (draggingCardIndex !== null || draggingJokerIndex !== null) ? (
          <View
            ref={sellZoneRef}
            collapsable={false}
            onLayout={updateSellZoneRect}
            pointerEvents="none"
            style={[
              styles.topSellZone,
              isDraggingOverSellZone ? styles.topSellZoneActive : undefined,
            ]}>
            {isDraggingOverSellZone && draggingCardIndex !== null && state.deck.hand[draggingCardIndex] ? (
              <DropZoneHandPreview cardId={state.deck.hand[draggingCardIndex]} />
            ) : null}
            {isDraggingOverSellZone && draggingJokerIndex !== null && state.jokers[draggingJokerIndex] ? (
              <DropZoneJokerPreview jokerId={state.jokers[draggingJokerIndex]} />
            ) : null}
            {draggingHandCardDef ? (
              <Text style={styles.topSellZonePriceHint}>
                핸드 카드 판매 +{getSellPriceHandCard(draggingHandCardDef.rarity)}G · 상점 유사 등급{' '}
                {getShopHandCardPrice(draggingHandCardDef.rarity)}G
              </Text>
            ) : draggingJokerIndex !== null && state.jokers[draggingJokerIndex] ? (
              <Text style={styles.topSellZonePriceHint}>
                조커 판매 +
                {getSellPriceJoker(getJoker(state.jokers[draggingJokerIndex])!.rarity)}G · 상점 구매{' '}
                {SHOP_JOKER_PRICE}G
              </Text>
            ) : null}
            <Text style={styles.topSellZoneLabel}>
              {isDraggingOverSellZone ? '놓으면 골드로 판매합니다' : '↑ 여기로 드롭하여 판매'}
            </Text>
          </View>
        ) : null}
        <View style={[styles.topRow, isCompact ? styles.topRowCompact : undefined]}>
          <View style={[styles.scorePanel, isCompact ? styles.scorePanelCompact : undefined]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelLabel}>현재 블라인드</Text>
              <View style={styles.headerButtonRow}>
                {onBackToLobby ? (
                  <Pressable onPress={onBackToLobby} style={styles.iconButton}>
                    <Text style={styles.iconButtonText}>로비</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => setShowGuide(true)} style={styles.iconButton}>
                  <Text style={styles.iconButtonText}>족보</Text>
                </Pressable>
              </View>
            </View>
            <Text style={[styles.scoreValue, isCompact ? styles.scoreValueCompact : undefined]}>
              {state.stage.currentScore}
              <Text style={styles.scoreDivider}> / {stageDefinition.targetScore}</Text>
            </Text>
            <Text style={styles.scoreHint}>{stageDefinition.name}</Text>

            <View style={styles.previewBar}>
              <Text style={styles.previewRank}>{HAND_RANK_LABELS[previewScore.handRank]}</Text>
              <Text style={styles.previewScore}>{previewScore.finalScore}점</Text>
            </View>
          </View>

          <View style={[styles.sidePanel, isCompact ? styles.sidePanelCompact : undefined]}>
            <Pressable onPress={() => setShowRunInfo(true)} style={styles.bossPanel}>
              <Text style={styles.bossLabel}>BLIND / RUN INFO</Text>
              <Text numberOfLines={1} style={styles.bossName}>
                {blindTypeLabel}
              </Text>
              {blindRuleText ? (
                <Text numberOfLines={2} style={styles.bossDescription}>
                  {blindRuleText}
                </Text>
              ) : null}
              {/* <Text numberOfLines={1} style={styles.bossMetaText}>
                Ante {state.stage.ante}/{totalAntes} · Stage {state.stage.stageIndex + 1}/3
              </Text> */}
            </Pressable>
            <View style={styles.stageSummaryRow}>
              <View style={[styles.stageTile, styles.anteTile]}>
                <Text style={styles.miniLabel}>ANTE</Text>
                <Text style={styles.stageTileValue}>
                  {state.stage.ante}/{totalAntes}
                </Text>
              </View>
              <View style={styles.stageTile}>
                <Text style={styles.miniLabel}>STAGE</Text>
                <Text style={styles.stageTileValue}>{state.stage.stageIndex + 1}/3</Text>
              </View>
            </View>

            <View style={styles.topResourceStrip}>
              <View style={styles.topResourceItem}>
                <Text style={styles.topResourceLabel}>HAND</Text>
                <Text style={styles.topResourceValue}>{state.stage.remainingHands}</Text>
              </View>
              <View style={styles.topResourceItem}>
                <Text style={styles.topResourceLabel}>ROLL</Text>
                <Text style={styles.topResourceValue}>
                  {state.stage.remainingRolls}
                  {state.hand.freeRerolls > 0 ? `+${state.hand.freeRerolls}` : ''}
                </Text>
              </View>
              <View style={styles.topResourceItem}>
                <Text style={styles.topResourceLabel}>GOLD</Text>
                <Text style={styles.topResourceValue}>{state.gold}</Text>
              </View>
            </View>

          </View>
        </View>

        <View style={[styles.jokerPanel, isCompact ? styles.jokerPanelCompact : undefined]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelLabel}>JOKERS</Text>
            <Text style={styles.deckCounts}>
              {occupiedJokerSlots}/5
              {negativeJokerIds.length > 0 ? ` · NEG ${negativeJokerIds.length}` : ''}
            </Text>
          </View>

          <View style={styles.jokerRowWrap}>
            {selectedJoker ? (
              <Animated.View
                style={[
                  styles.jokerTooltip,
                  styles.jokerTooltipFloating,
                  selectedJokerTooltipStyle,
                  {
                    opacity: jokerTooltipAnimation,
                    transform: [
                      {
                        translateY: jokerTooltipAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 0],
                        }),
                      },
                    ],
                  },
                ]}>
                <Text style={styles.cardTooltipTitle}>{selectedJoker.name}</Text>
                <Text style={styles.cardTooltipBody}>{selectedJoker.description}</Text>
                <Text style={styles.jokerTooltipMeta}>
                  {JOKER_RARITY_LABELS[selectedJoker.rarity]} · {JOKER_TRIGGER_LABELS[selectedJoker.trigger]}
                  {negativeJokerIds.includes(selectedJoker.id) ? ' · 네거티브' : ''}
                  {activeJokers.disabledJokerIds.includes(selectedJoker.id) ? ' · 현재 비활성' : ''}
                </Text>
                <View style={styles.jokerTooltipArrow} />
              </Animated.View>
            ) : null}

            <View style={[styles.jokerRow, isCompact ? styles.jokerRowCompact : undefined]}>
            {Array.from({ length: jokerSlotCount }, (_, slotIndex) => {
              const jokerId = state.jokers[slotIndex];
              const joker = jokerId ? getJoker(jokerId) : undefined;
              const isNegative = negativeJokerIds.includes(jokerId ?? '');
              const isDisabled = activeJokers.disabledJokerIds.includes(jokerId ?? '');
              const isSelected = selectedJokerIndex === slotIndex;
              const theme = getJokerTheme(joker?.tags);
              const rarityTheme = joker ? JOKER_RARITY_COLORS[joker.rarity] : undefined;
              const badgeLabel = joker ? TAG_LABELS[getPrimaryTag(joker.tags)] : 'EMPTY';
              const jokerPreviewImage = joker ? getJokerPreviewImage(joker.id) : undefined;
              const animation = jokerSelectAnimationsRef.current[slotIndex];
              const jokerDragAnimation = jokerDragAnimationsRef.current[slotIndex];
              const isJokerDragging = draggingJokerIndex === slotIndex;
              const slotJokerInSell = isJokerDragging && isDraggingOverSellZone;
              const animatedStyle = {
                transform: [
                  ...(isJokerDragging && joker && jokerDragAnimation
                    ? [
                        { translateX: jokerDragAnimation.x },
                        { translateY: jokerDragAnimation.y },
                        { scale: slotJokerInSell ? 0.96 : 1.06 },
                      ]
                    : [
                        {
                          translateY: animation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -6],
                          }),
                        },
                        {
                          scale: animation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.03],
                          }),
                        },
                      ]),
                ],
              };

              return (
                <Animated.View
                  key={`joker-slot-${slotIndex}`}
                  ref={el => {
                    jokerSlotRefs.current[slotIndex] = el as View | null;
                  }}
                  collapsable={false}
                  onLayout={() => {
                    jokerSlotRefs.current[slotIndex]?.measureInWindow((x, y, w, h) => {
                      jokerSlotRectsRef.current[slotIndex] = { x, y, width: w, height: h };
                    });
                  }}
                  style={[animatedStyle, isJokerDragging ? styles.draggingJokerSlot : undefined]}
                  {...(joker ? jokerPanResponders[slotIndex].panHandlers : {})}>
                  <Pressable
                    disabled={!joker}
                    onPress={() => handleJokerPreview(slotIndex)}
                    style={[
                      styles.jokerCard,
                      !joker ? styles.emptyJokerCard : undefined,
                      joker
                        ? {
                            backgroundColor: theme.surface,
                            borderColor: rarityTheme?.frame ?? theme.frame,
                          }
                        : undefined,
                      isCompact ? styles.jokerCardCompact : undefined,
                      isSelected ? styles.jokerCardActive : undefined,
                      isSelected && rarityTheme ? { borderColor: rarityTheme.frame } : undefined,
                      isSelected && rarityTheme ? { shadowColor: rarityTheme.glow } : undefined,
                      isNegative ? styles.negativeJokerCard : undefined,
                      isDisabled ? styles.jokerDisabled : undefined,
                      slotJokerInSell ? styles.jokerCardSlottedGhost : undefined,
                    ]}>
                    {joker ? (
                      <>
                        {jokerPreviewImage ? (
                          <ImageBackground
                            source={jokerPreviewImage}
                            imageStyle={styles.jokerArtImage}
                            resizeMode="cover"
                            style={styles.jokerArtCard}>
                            <View pointerEvents="none" style={styles.jokerArtOverlay} />
                          </ImageBackground>
                        ) : (
                          <>
                            <View pointerEvents="none" style={styles.cardFrameBorder} />
                            <View
                              pointerEvents="none"
                              style={[styles.jokerFrameStripe, { backgroundColor: theme.frame }]}
                            />
                            <View pointerEvents="none" style={styles.cardFrameSpark} />
                            <View style={styles.cardTopRow}>
                              <Text
                                style={[
                                  styles.miniBadge,
                                  { backgroundColor: theme.badge, color: theme.accent },
                                ]}>
                                {badgeLabel}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.jokerGlyph,
                                { backgroundColor: theme.frame, shadowColor: theme.frame },
                              ]}>
                              <View pointerEvents="none" style={styles.glyphHalo} />
                              <Text style={styles.jokerGlyphText}>{joker.name.slice(0, 1)}</Text>
                            </View>
                            <Text numberOfLines={2} style={styles.jokerTitle}>
                              {joker.name}
                            </Text>
                            <View style={[styles.cardBottomBadge, { backgroundColor: theme.badge }]}>
                              <Text numberOfLines={1} style={styles.jokerMeta}>
                                {isDisabled ? 'OFF' : 'INFO'}
                              </Text>
                            </View>
                          </>
                        )}
                        {isNegative ? (
                          <View style={styles.negativeJokerBadge}>
                            <Text style={styles.negativeJokerBadgeText}>NEG</Text>
                          </View>
                        ) : null}
                      </>
                    ) : (
                      <View style={styles.emptyJokerSlot} />
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
            </View>
          </View>
        </View>

        <View style={[styles.boardPanel, isCompact ? styles.boardPanelCompact : undefined]}>
          <View pointerEvents="none" style={styles.boardGlowOrbA} />
          <View pointerEvents="none" style={styles.boardGlowOrbB} />
          <View pointerEvents="none" style={styles.boardGrid} />
          <View style={styles.boardHeader}>
            <Text style={styles.boardTitle}>DICE BOARD</Text>
            <Text style={styles.boardFormula}>
              ({previewScore.handBase}+{previewScore.diceBase}+{previewScore.bonusBase}) x {previewScore.multiplier}
            </Text>
          </View>

          {state.phase !== 'playing' ? (
            <View style={styles.statusBanner}>
              <Text numberOfLines={1} style={styles.statusBannerText}>
                {state.message}
              </Text>
            </View>
          ) : null}

          <View style={styles.diceRow}>
            {displayDice.map((value, index) => {
              const isSelected = state.hand.selectedDice.includes(index);
              const animation = diceAnimationsRef.current[index];
              const selectAnimation = diceSelectAnimationsRef.current[index];
              const rollAnimatedStyle = {
                transform: [
                  {
                    rotate: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '540deg'],
                    }),
                  },
                  {
                    scale: animation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 1.1, 1],
                    }),
                  },
                ],
              };
              const selectAnimatedStyle = {
                transform: [
                  {
                    translateY: selectAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8],
                    }),
                  },
                  {
                    scale: selectAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.04],
                    }),
                  },
                ],
              };

              return (
                <Animated.View key={`die-${index}`} style={selectAnimatedStyle}>
                  <Animated.View style={rollAnimatedStyle}>
                    <Pressable
                      onPress={() => toggleDie(index)}
                      style={[
                        styles.die,
                        isCompact ? styles.dieCompact : undefined,
                        isSelected ? styles.dieSelected : undefined,
                      ]}>
                      <DieFace value={value} selected={isSelected} />
                    </Pressable>
                  </Animated.View>
                </Animated.View>
              );
            })}
          </View>

          {state.phase !== 'playing' && previewScore.notes.length > 0 ? (
            <View style={styles.notesPanel}>
              {previewScore.notes.slice(0, 1).map(note => (
                <Text key={note} numberOfLines={1} style={styles.noteText}>
                  - {note}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={[styles.cardPanel, isCompact ? styles.cardPanelCompact : undefined]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelLabel}>HAND CARDS</Text>
            <View style={styles.cardPanelHeaderActions}>
              {state.phase === 'playing' ? (
                <Pressable
                  disabled={state.hand.handRefreshes <= 0}
                  onPress={refreshHandCards}
                  style={[
                    styles.cardRefreshButton,
                    state.hand.handRefreshes <= 0 ? styles.cardRefreshButtonDisabled : undefined,
                  ]}>
                  <Text
                    style={[
                      styles.cardRefreshButtonText,
                      state.hand.handRefreshes <= 0 ? styles.cardRefreshButtonTextDisabled : undefined,
                    ]}>
                    교체 {state.hand.handRefreshes}
                  </Text>
                </Pressable>
              ) : null}
              <View style={styles.deckCountsRow}>
                <Text style={styles.deckCounts}>
                  D {state.deck.drawPile.length} / X {state.deck.discardPile.length}
                </Text>
                <Pressable onPress={() => setShowDeckList(true)} style={styles.deckListButton}>
                  <Text style={styles.deckListButtonText}>덱</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.cardRowWrap}>
            {selectedCard ? (
              <Animated.View
                style={[
                  styles.cardTooltip,
                  styles.cardTooltipFloating,
                  selectedCardTooltipStyle,
                  {
                    opacity: cardTooltipAnimation,
                    transform: [
                      {
                        translateY: cardTooltipAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 0],
                        }),
                      },
                    ],
                  },
                ]}>
                <Text style={styles.cardTooltipTitle}>{selectedCard.name}</Text>
                <Text style={styles.cardTooltipRarity}>{JOKER_RARITY_LABELS[selectedCard.rarity]}</Text>
                <Text style={styles.cardTooltipBody}>{selectedCard.description}</Text>
                <View style={styles.cardTooltipArrow} />
              </Animated.View>
            ) : null}

            <View style={[styles.cardRow, visibleCardSlotCount > 3 ? styles.cardRowDense : undefined]}>
            {Array.from({ length: visibleCardSlotCount }, (_, index) => {
              const cardId = state.deck.hand[index];
              const card = cardId ? getActionCard(cardId) : undefined;
              const actionPreviewImage = card ? getActionCardPreviewImage(card.id) : undefined;
              const isPreviewing = selectedCardIndex === index;
              const theme = getActionTheme(card?.tags);
              const actionRarityTheme = card ? JOKER_RARITY_COLORS[card.rarity] : undefined;
              const badgeLabel = card ? TAG_LABELS[getPrimaryTag(card.tags)] : 'A';
              const animation = cardSelectAnimationsRef.current[index];
              const dragAnimation = cardDragAnimationsRef.current[index];
              const panResponder = cardPanResponders[index];
              const isDragging = draggingCardIndex === index;
              const slotHandInSell = isDragging && isDraggingOverSellZone;
              const slotHandInUse = isDragging && isDraggingOverUseZone && !isDraggingOverSellZone;
              const slotHandHidden = slotHandInSell || slotHandInUse;
              const animatedStyle = {
                transform: [
                  ...(isDragging
                    ? [
                        {
                          translateX: dragAnimation.x,
                        },
                        {
                          translateY: dragAnimation.y,
                        },
                        {
                          scale: slotHandHidden ? 0.96 : 1.03,
                        },
                      ]
                    : [
                        {
                          translateY: animation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -7],
                          }),
                        },
                        {
                          scale: animation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.04],
                          }),
                        },
                      ]),
                ],
              };

              return (
                <Animated.View
                  key={`card-slot-${index}-${cardId ?? 'empty'}`}
                  ref={el => {
                    cardSlotRefs.current[index] = el as View | null;
                  }}
                  collapsable={false}
                  onLayout={() => {
                    cardSlotRefs.current[index]?.measureInWindow((x, y, w, h) => {
                      cardSlotRectsRef.current[index] = { x, y, width: w, height: h };
                    });
                  }}
                  style={[
                    animatedStyle,
                    styles.cardSlot,
                    isDragging ? styles.draggingCardSlot : undefined,
                  ]}
                  {...(card ? panResponder.panHandlers : {})}>
                  <Pressable
                    disabled={!card}
                    onPress={() => handleCardPreview(index)}
                    style={[
                      styles.handCard,
                      card
                        ? {
                            backgroundColor: theme.surface,
                            borderColor: actionRarityTheme?.frame ?? theme.frame,
                          }
                        : undefined,
                      isCompact ? styles.handCardCompact : undefined,
                      isPreviewing ? styles.handCardActive : undefined,
                      isDragging ? styles.handCardDragging : undefined,
                      slotHandHidden ? styles.handCardSlottedGhost : undefined,
                      !card ? styles.emptyCard : undefined,
                    ]}>
                    {actionPreviewImage ? (
                      <ImageBackground
                        source={actionPreviewImage}
                        imageStyle={styles.handCardArtImage}
                        resizeMode="cover"
                        style={styles.handCardArtCard}>
                        <View pointerEvents="none" style={styles.handCardArtOverlay} />
                        <View style={styles.cardTopRow}>
                          <Text
                            style={[
                              styles.miniBadge,
                              styles.handCardMiniBadgeOnImage,
                              card ? { backgroundColor: theme.badge, color: theme.accent } : undefined,
                            ]}>
                            {badgeLabel}
                          </Text>
                        </View>
                        <View style={styles.handCardFooterOnImage}>
                          <Text numberOfLines={1} style={styles.handCardTitleOnImage}>
                            {card ? card.name : 'EMPTY'}
                          </Text>
                        </View>
                      </ImageBackground>
                    ) : (
                      <>
                        <View pointerEvents="none" style={styles.cardFrameBorder} />
                        <View
                          pointerEvents="none"
                          style={[styles.actionFrameStripe, card ? { backgroundColor: theme.frame } : undefined]}
                        />
                        <View pointerEvents="none" style={styles.cardFrameSpark} />
                        <View style={styles.cardTopRow}>
                          <Text
                            style={[styles.miniBadge, card ? { backgroundColor: theme.badge, color: theme.accent } : undefined]}>
                            {badgeLabel}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.cardFace,
                            card ? { borderColor: theme.frame } : undefined,
                          ]}>
                          <View pointerEvents="none" style={styles.cardFaceShine} />
                          <Text style={[styles.cardGlyph, card ? { color: theme.accent } : undefined]}>
                            {card ? card.name.slice(0, 1) : '?'}
                          </Text>
                          <Text numberOfLines={1} style={styles.handCardTitle}>
                            {card ? card.name : 'EMPTY'}
                          </Text>
                        </View>
                      </>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
            </View>
          </View>
        </View>

        <View style={styles.bottomBar}>
          {draggingCardIndex !== null && state.phase === 'playing' ? (
            <View
              ref={useZoneRef}
              collapsable={false}
              onLayout={updateUseZoneRect}
              pointerEvents="none"
              style={[
                styles.bottomUseZone,
                styles.bottomUseZoneWide,
                isDraggingOverUseZone && !isDraggingOverSellZone ? styles.bottomUseZoneActive : undefined,
              ]}>
              {isDraggingOverUseZone &&
              !isDraggingOverSellZone &&
              state.deck.hand[draggingCardIndex] ? (
                <DropZoneHandPreview cardId={state.deck.hand[draggingCardIndex]} />
              ) : null}
              <Text style={styles.bottomUseZoneLabel}>
                {isDraggingOverUseZone && !isDraggingOverSellZone
                  ? '놓으면 카드가 적용됩니다'
                  : '하단 점수 영역에 드롭 → 카드 사용 · 위쪽은 판매'}
              </Text>
            </View>
          ) : (
            <>
              <Pressable onPress={rerollSelectedDice} style={styles.bottomButton}>
                <Text style={styles.bottomButtonText}>리롤</Text>
              </Pressable>
              <Pressable onPress={submitHand} style={[styles.bottomButton, styles.primaryBottomButton, styles.wideBottomButton]}>
                <Text style={styles.primaryBottomButtonText}>점수 확정</Text>
              </Pressable>
            </>
          )}
        </View>

        <OverlayModal visible={showGuide} title="족보 정보" onClose={() => setShowGuide(false)}>
          <Text style={styles.modalIntro}>핵심 공식: (족보 기본값 + 주사위 합 + 보너스) x 배수</Text>
          <View style={styles.guideList}>
            {HAND_RANK_GUIDE.map(item => (
              <View key={item.rank} style={styles.guideRow}>
                <Text style={styles.guideRank}>{HAND_RANK_LABELS[item.rank]}</Text>
                <Text style={styles.guideBase}>{item.base}</Text>
                <Text style={styles.guideHint}>{item.hint}</Text>
              </View>
            ))}
          </View>
        </OverlayModal>

        <OverlayModal visible={showRunInfo} title="런 정보" onClose={() => setShowRunInfo(false)}>
          <Text style={styles.modalIntro}>
            보스 제약, 최근 점수, 현재 조커 상태를 확인하는 보조 패널입니다.
          </Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>현재 진행</Text>
            <Text style={styles.infoCardBody}>
              Ante {state.stage.ante}/{totalAntes} · Stage {state.stage.stageIndex + 1}/3 · {stageDefinition.name}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>현재 블라인드</Text>
            <Text style={styles.infoCardBody}>{stageDefinition.name}</Text>
          </View>
          {boss ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>현재 제약</Text>
              <Text style={styles.infoCardBody}>{boss.description}</Text>
            </View>
          ) : null}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>현재 덱</Text>
            <Text style={styles.infoCardBody}>
              Draw {state.deck.drawPile.length} / Discard {state.deck.discardPile.length} / Hand {state.deck.hand.length}
            </Text>
          </View>
          {state.lastScore ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>직전 Hand</Text>
              <Text style={styles.infoCardBody}>
                {HAND_RANK_LABELS[state.lastScore.handRank]} | {state.lastScore.finalScore}점 | 골드 +
                {state.lastScore.gainedGold}
              </Text>
            </View>
          ) : null}
        </OverlayModal>

        <OverlayModal visible={showDeckList} title="덱 리스트" onClose={() => setShowDeckList(false)}>
          <Text style={styles.modalIntro}>현재 손패, 드로우 더미, 버림 더미 순서로 보여줍니다.</Text>
          <View style={styles.deckListSectionWrap}>
            {deckSections.map(section => (
              <View key={section.title} style={styles.deckListSection}>
                <Text style={styles.deckListSectionTitle}>{section.title}</Text>
                {section.cards.length > 0 ? (
                  <View style={styles.deckListItems}>
                    {section.cards.map((cardId, index) => {
                      const deckCard = getActionCard(cardId);
                      return (
                        <Text key={`${section.title}-${cardId}-${index}`} style={styles.deckListItem}>
                          {index + 1}. {deckCard?.name ?? cardId}
                          {deckCard ? ` · ${JOKER_RARITY_LABELS[deckCard.rarity]}` : ''}
                        </Text>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.deckListEmpty}>비어 있음</Text>
                )}
              </View>
            ))}
          </View>
        </OverlayModal>

        <OverlayModal visible={state.phase !== 'playing'} title={overlayTitle} onClose={() => undefined} dismissible={false}>
          {state.phase === 'settlement' && state.settlement ? (
            <View style={styles.overlayList}>
              <Text style={styles.modalIntro}>
                클리어한 블라인드와 남은 Hand·리롤에 따른 골드를 확인한 뒤 다음 단계로 진행합니다.
              </Text>
              <View style={styles.settlementStageCard}>
                <Text style={styles.settlementStageTitle}>
                  Ante {state.settlement.ante}/{totalAntes} · {state.settlement.stageName}
                </Text>
                <Text style={styles.settlementStageMeta}>
                  Stage {state.settlement.stageIndex + 1}/3 · 목표 {state.settlement.targetScore}점
                </Text>
              </View>
              <View style={styles.settlementRows}>
                <View style={styles.settlementRow}>
                  <Text style={styles.settlementRowLabel}>남은 Hand</Text>
                  <Text style={styles.settlementRowValue}>{state.settlement.spareHands}</Text>
                </View>
                <View style={styles.settlementRow}>
                  <Text style={styles.settlementRowLabel}>남은 리롤</Text>
                  <Text style={styles.settlementRowValue}>{state.settlement.spareRolls}</Text>
                </View>
                <View style={styles.settlementDivider} />
                <View style={styles.settlementRow}>
                  <Text style={styles.settlementRowLabel}>Hand 점수 골드</Text>
                  <Text style={styles.settlementRowValue}>+{state.settlement.handScoreGold}G</Text>
                </View>
                <View style={styles.settlementRow}>
                  <Text style={styles.settlementRowLabel}>블라인드 보상</Text>
                  <Text style={styles.settlementRowValue}>+{state.settlement.blindRewardGold}G</Text>
                </View>
                <View style={styles.settlementRow}>
                  <Text style={styles.settlementRowLabel}>여유 보너스 (Hand+리롤)</Text>
                  <Text style={styles.settlementRowValue}>+{state.settlement.efficiencyGold}G</Text>
                </View>
                <View style={styles.settlementDivider} />
                <View style={styles.settlementRow}>
                  <Text style={styles.settlementRowLabel}>이번 Hand 직전 보유</Text>
                  <Text style={styles.settlementRowValue}>{state.settlement.goldBeforeHand}G</Text>
                </View>
                <View style={[styles.settlementRow, styles.settlementRowHighlight]}>
                  <Text style={styles.settlementRowLabelStrong}>정산 후 보유 골드</Text>
                  <Text style={styles.settlementRowValueStrong}>{state.settlement.goldAfter}G</Text>
                </View>
              </View>
              <Pressable onPress={continueFromSettlement} style={styles.largePrimaryButton}>
                <Text style={styles.largePrimaryButtonText}>
                  {state.settlement.isRunComplete ? '런 완료로' : '보상 선택으로'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {state.phase === 'reward' ? (
            <View style={styles.overlayList}>
              <Text style={styles.modalIntro}>세 가지 중 하나를 골라 다음 블라인드용 빌드를 만드세요.</Text>
              <View style={styles.overlayGoldBar}>
                <Text style={styles.overlayGoldLabel}>보유 골드</Text>
                <Text style={styles.overlayGoldValue}>{state.gold}G</Text>
              </View>
              <View style={styles.rewardRow}>
                {state.rewardOptions.map(option => {
                  const isSelected = selectedRewardId === option.id;
                  const previewImage = option.type === 'joker' ? getJokerPreviewImage(option.jokerId) : undefined;
                  const actionCard = option.type === 'card' ? getActionCard(option.cardId) : undefined;
                  const actionPreviewImage =
                    option.type === 'card' ? getActionCardPreviewImage(option.cardId) : undefined;
                  const actionTheme = actionCard ? getActionTheme(actionCard.tags) : undefined;
                  const joker = option.type === 'joker' ? getJoker(option.jokerId) : undefined;
                  const rarityTheme = joker ? JOKER_RARITY_COLORS[joker.rarity] : undefined;
                  const actionRarityTheme =
                    option.type === 'card' && actionCard ? JOKER_RARITY_COLORS[actionCard.rarity] : undefined;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => setSelectedRewardId(option.id)}
                      onLongPress={() => setRewardTooltipId(option.id)}
                      delayLongPress={220}
                      onPressOut={() => setRewardTooltipId(current => (current === option.id ? null : current))}
                      style={[
                        styles.rewardCard,
                        option.type === 'joker' && rarityTheme ? { borderColor: rarityTheme.frame } : undefined,
                        option.type === 'joker' && isSelected && rarityTheme
                          ? { shadowColor: rarityTheme.frame, backgroundColor: '#e6f0ff' }
                          : undefined,
                        option.type === 'card' && actionRarityTheme
                          ? { borderColor: actionRarityTheme.frame }
                          : undefined,
                        option.type === 'card' && isSelected && actionRarityTheme
                          ? { shadowColor: actionRarityTheme.frame, backgroundColor: '#e6f0ff' }
                          : undefined,
                        isSelected ? styles.rewardCardSelected : undefined,
                      ]}>
                      {previewImage ? (
                        <Image source={previewImage} style={styles.rewardCardImage} resizeMode="cover" />
                      ) : actionPreviewImage ? (
                        <Image source={actionPreviewImage} style={styles.rewardCardImage} resizeMode="cover" />
                      ) : actionCard && actionTheme ? (
                        <View
                          style={[
                            styles.rewardCardFace,
                            {
                              backgroundColor: actionTheme.surface,
                              borderColor: actionTheme.frame,
                            },
                          ]}>
                          <View pointerEvents="none" style={styles.cardFaceShine} />
                          <Text style={[styles.cardGlyph, { color: actionTheme.accent }]}>
                            {actionCard.name.slice(0, 1)}
                          </Text>
                          <Text numberOfLines={1} style={styles.handCardTitle}>
                            {actionCard.name}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.rewardCardPlaceholder}>
                          <Text style={styles.rewardCardPlaceholderText}>{option.title.slice(0, 1)}</Text>
                        </View>
                      )}
                      {option.type !== 'card' ? (
                        <Text numberOfLines={1} style={styles.rewardCardTitle}>
                          {option.title}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
              {rewardTooltipId ? (
                <View style={styles.rewardTooltip}>
                  <Text style={styles.rewardTooltipTitle}>
                    {state.rewardOptions.find(option => option.id === rewardTooltipId)?.title}
                  </Text>
                  <Text style={styles.rewardTooltipBody}>
                    {state.rewardOptions.find(option => option.id === rewardTooltipId)?.description}
                  </Text>
                </View>
              ) : null}
              <Pressable
                onPress={() => {
                  if (selectedRewardOption) {
                    applyReward(selectedRewardOption);
                  }
                }}
                disabled={!selectedRewardOption}
                style={[
                  styles.largePrimaryButton,
                  !selectedRewardOption ? styles.largePrimaryButtonDisabled : undefined,
                ]}>
                <Text style={styles.largePrimaryButtonText}>선택</Text>
              </Pressable>
            </View>
          ) : null}

          {state.phase === 'shop' ? (
            <View style={styles.overlayList}>
              <Text style={styles.modalIntro}>골드를 써서 빌드를 다듬고 다음 스테이지로 이동합니다.</Text>
              <View style={styles.overlayGoldBar}>
                <Text style={styles.overlayGoldLabel}>보유 골드</Text>
                <Text style={styles.overlayGoldValue}>{state.gold}G</Text>
              </View>
              <View style={styles.rewardRow}>
                {state.shopItems.map(item => {
                  const isSelected = selectedShopItemId === item.id;
                  const jokerPreview =
                    item.type === 'joker' ? getJokerPreviewImage(item.jokerId) : undefined;
                  const actionCard = item.type === 'card' ? getActionCard(item.cardId) : undefined;
                  const actionPreviewImage =
                    item.type === 'card' ? getActionCardPreviewImage(item.cardId) : undefined;
                  const actionTheme = actionCard ? getActionTheme(actionCard.tags) : undefined;
                  const joker = item.type === 'joker' ? getJoker(item.jokerId) : undefined;
                  const rarityTheme = joker ? JOKER_RARITY_COLORS[joker.rarity] : undefined;
                  const actionRarityTheme =
                    item.type === 'card' && actionCard ? JOKER_RARITY_COLORS[actionCard.rarity] : undefined;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedShopItemId(item.id)}
                      onLongPress={() => setShopTooltipId(item.id)}
                      delayLongPress={220}
                      onPressOut={() => setShopTooltipId(current => (current === item.id ? null : current))}
                      style={[
                        styles.rewardCard,
                        item.type === 'joker' && rarityTheme ? { borderColor: rarityTheme.frame } : undefined,
                        item.type === 'joker' && isSelected && rarityTheme
                          ? { shadowColor: rarityTheme.frame, backgroundColor: '#e6f0ff' }
                          : undefined,
                        item.type === 'card' && actionRarityTheme
                          ? { borderColor: actionRarityTheme.frame }
                          : undefined,
                        item.type === 'card' && isSelected && actionRarityTheme
                          ? { shadowColor: actionRarityTheme.frame, backgroundColor: '#e6f0ff' }
                          : undefined,
                        isSelected ? styles.rewardCardSelected : undefined,
                      ]}>
                      {jokerPreview ? (
                        <Image source={jokerPreview} style={styles.rewardCardImage} resizeMode="cover" />
                      ) : actionPreviewImage ? (
                        <Image source={actionPreviewImage} style={styles.rewardCardImage} resizeMode="cover" />
                      ) : item.type === 'card' && actionCard && actionTheme ? (
                        <View
                          style={[
                            styles.rewardCardFace,
                            {
                              backgroundColor: actionTheme.surface,
                              borderColor: actionTheme.frame,
                            },
                          ]}>
                          <View pointerEvents="none" style={styles.cardFaceShine} />
                          <Text style={[styles.cardGlyph, { color: actionTheme.accent }]}>
                            {actionCard.name.slice(0, 1)}
                          </Text>
                          <Text numberOfLines={1} style={styles.handCardTitle}>
                            {actionCard.name}
                          </Text>
                          <Text numberOfLines={1} style={styles.rewardCardPrice}>
                            {item.price}G
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.rewardCardPlaceholder}>
                          <Text style={styles.rewardCardPlaceholderText}>{item.title.slice(0, 1)}</Text>
                        </View>
                      )}

                      {item.type !== 'card' ? (
                        <Text numberOfLines={1} style={styles.rewardCardTitle}>
                          {item.title}
                          {' | '}
                          {item.price}G
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              {shopTooltipId ? (
                <View style={styles.rewardTooltip}>
                  <Text style={styles.rewardTooltipTitle}>
                    {state.shopItems.find(item => item.id === shopTooltipId)?.title}
                  </Text>
                  <Text style={styles.rewardTooltipBody}>
                    {state.shopItems.find(item => item.id === shopTooltipId)?.description}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => {
                  if (selectedShopItem && canBuySelectedShopItem) {
                    buyShopItem(selectedShopItem);
                  }
                }}
                disabled={!canBuySelectedShopItem}
                style={[
                  styles.largePrimaryButton,
                  !canBuySelectedShopItem ? styles.largePrimaryButtonDisabled : undefined,
                ]}>
                <Text style={styles.largePrimaryButtonText}>
                  {selectedShopItem
                    ? canBuySelectedShopItem
                      ? `구매 (${selectedShopItem.price}G)`
                      : `골드 부족 (${selectedShopItem.price}G)`
                    : '아이템 선택'}
                </Text>
              </Pressable>
              <Pressable onPress={continueFromShop} style={styles.largePrimaryButton}>
                <Text style={styles.largePrimaryButtonText}>다음 스테이지</Text>
              </Pressable>
            </View>
          ) : null}

          {state.phase === 'purge' ? (
            <View style={styles.overlayList}>
              <Text style={styles.modalIntro}>덱 압축용으로 제거할 카드를 선택하세요.</Text>
              {purgeOptions.map(option => {
                const card = getActionCard(option.cardId);
                if (!card) {
                  return null;
                }

                return (
                  <Pressable
                    key={`${option.zone}-${option.index}-${option.cardId}`}
                    onPress={() => removeDeckCard(option)}
                    style={styles.overlayButton}>
                    <Text style={styles.overlayButtonTitle}>
                      {card.name} | {option.zone === 'drawPile' ? 'Draw' : 'Discard'}
                    </Text>
                    <Text numberOfLines={2} style={styles.overlayButtonBody}>
                      {card.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {state.phase === 'victory' ? (
            <PhaseCard
              title="Run Complete"
              description={`8 Ante 보스 블라인드까지 돌파했습니다. 최종 골드 ${state.gold}G. 새 런을 시작할 수 있습니다.`}
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
        </OverlayModal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  darkBackground: {
    backgroundColor: '#eaf7ff',
  },
  lightBackground: {
    backgroundColor: '#eaf7ff',
  },
  screen: {
    flex: 1,
    padding: 12,
    gap: 10,
    backgroundColor: '#eaf7ff',
    position: 'relative',
  },
  screenCompact: {
    padding: 10,
    gap: 8,
  },
  topSellZone: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    zIndex: 25,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(255, 247, 230, 0.96)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 8,
    minHeight: 72,
  },
  topSellZoneActive: {
    backgroundColor: 'rgba(254, 243, 199, 0.98)',
    borderColor: '#ea580c',
  },
  topSellZoneLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9a3412',
    textAlign: 'center',
  },
  topSellZonePriceHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350f',
    textAlign: 'center',
    lineHeight: 15,
  },
  dropZoneMiniCard: {
    width: 44,
    height: 56,
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZoneMiniCardImage: {
    width: '100%',
    height: '100%',
  },
  dropZoneMiniCardGlyph: {
    fontSize: 20,
    fontWeight: '900',
  },
  dropZoneMiniJoker: {
    width: 48,
    height: 60,
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZoneMiniJokerImage: {
    width: '100%',
    height: '100%',
  },
  dropZoneMiniJokerGlyph: {
    fontSize: 22,
    fontWeight: '900',
  },
  startJokerSplashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(234,247,255,0.62)',
  },
  startJokerSplashCard: {
    borderRadius: 22,
    borderWidth: 2,
    padding: 16,
    width: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startJokerSplashImage: {
    width: 180,
    height: 220,
    borderRadius: 18,
  },
  startJokerSplashPlaceholder: {
    width: 180,
    height: 220,
    borderRadius: 18,
    backgroundColor: 'rgba(216,232,246,0.9)',
  },
  startJokerSplashName: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  tooltipDismissOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  topRow: {
    flex: 1.42,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  topRowCompact: {
    flex: 1.22,
    gap: 8,
  },
  scorePanel: {
    flex: 1.1,
    backgroundColor: '#f8fcff',
    borderRadius: 18,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#bfdcf3',
    justifyContent: 'space-between',
  },
  scorePanelCompact: {
    padding: 12,
    gap: 6,
  },
  sidePanel: {
    flex: 1.12,
    gap: 8,
    justifyContent: 'flex-start',
  },
  sidePanelCompact: {
    gap: 8,
  },
  stageSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    // flex: 1.02,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // marginBottom: 10,
  },
  headerButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  panelLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5e89ab',
    letterSpacing: 0.8,
    // marginTop: 10,
  },
  iconButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#d9efff',
  },
  iconButtonText: {
    color: '#29516f',
    fontSize: 11,
    fontWeight: '700',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#18344e',
  },
  scoreValueCompact: {
    fontSize: 24,
  },
  scoreDivider: {
    fontSize: 15,
    color: '#6b91b1',
  },
  scoreHint: {
    fontSize: 12,
    color: '#6b91b1',
  },
  previewBar: {
    borderRadius: 14,
    backgroundColor: '#e7f5ff',
    padding: 10,
    gap: 3,
  },
  previewRank: {
    fontSize: 12,
    color: '#5d88a9',
    fontWeight: '700',
  },
  previewScore: {
    fontSize: 20,
    color: '#ffdd86',
    fontWeight: '800',
  },
  stageTile: {
    flex: 1,
    backgroundColor: '#f8fcff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#bfdcf3',
    minHeight: 0,
    justifyContent: 'center',
  },
  anteTile: {
    flex: 0.92,
  },
  statusBanner: {
    borderRadius: 14,
    backgroundColor: '#f8fcff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#ead0cd',
  },
  statusBannerText: {
    fontSize: 10,
    color: '#6e6666',
    lineHeight: 13,
  },
  topResourceStrip: {
    flexDirection: 'row',
    gap: 6,
    // flex: 0.72,
  },
  topResourceItem: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#f8fcff',
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdcf3',
  },
  topResourceLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#6e95b5',
  },
  topResourceValue: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '800',
    color: '#173450',
  },
  stageTileValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700',
    color: '#173450',
  },
  miniStat: {
    backgroundColor: '#121925',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#203144',
  },
  miniLabel: {
    fontSize: 10,
    color: '#88aeca',
    fontWeight: '700',
  },
  miniValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  bossPanel: {
    flex: 1,
    backgroundColor: '#f8fcff',
    borderRadius: 16,
    padding: 9,
    gap: 4,
    borderWidth: 1,
    borderColor: '#bfdcf3',
    minHeight: 0,
    justifyContent: 'center',
  },
  bossLabel: {
    fontSize: 10,
    color: '#6d94b3',
    fontWeight: '700',
  },
  bossName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#173450',
  },
  bossDescription: {
    fontSize: 10,
    lineHeight: 13,
    color: '#5c7f9d',
  },
  bossMetaText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#88a4bd',
  },
  jokerPanel: {
    flex: 0.9,
    backgroundColor: '#f8fcff',
    borderRadius: 18,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#bfdcf3',
  },
  jokerPanelCompact: {
    flex: 0.78,
    padding: 8,
    gap: 6,
  },
  jokerRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  jokerRowCompact: {
    gap: 6,
  },
  jokerRowWrap: {
    position: 'relative',
    flex: 1,
    justifyContent: 'flex-end',
  },
  jokerCard: {
    width: 62,
    height: 102,
    backgroundColor: '#eef3fa',
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#cad9eb',
    gap: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  emptyJokerCard: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: 'rgba(142, 184, 216, 0.35)',
    justifyContent: 'center',
  },
  jokerCardCompact: {
    width: 56,
    height: 94,
    paddingHorizontal: 5,
    paddingVertical: 7,
  },
  jokerCardActive: {
    borderWidth: 2,
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  },
  negativeJokerCard: {
    borderStyle: 'dashed',
  },
  jokerDisabled: {
    opacity: 0.4,
  },
  jokerCardSlottedGhost: {
    opacity: 0,
  },
  slotNumber: {
    fontSize: 10,
    color: '#62748a',
    fontWeight: '700',
  },
  cardTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniBadge: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#d7e6f8',
    fontSize: 8,
    fontWeight: '800',
    color: '#264a74',
    textAlign: 'center',
  },
  cardFrameBorder: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  jokerFrameStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    opacity: 0.95,
  },
  actionFrameStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    opacity: 0.92,
  },
  cardFrameSpark: {
    position: 'absolute',
    right: -16,
    top: -18,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  jokerTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 13,
    textAlign: 'center',
  },
  emptyJokerSlot: {
    width: 32,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(142, 184, 216, 0.35)',
  },
  jokerMeta: {
    fontSize: 9,
    color: '#5d6b7c',
    textAlign: 'center',
  },
  cardBottomBadge: {
    minWidth: 40,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#dbe8f6',
  },
  jokerGlyph: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#12263d',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },
  glyphHalo: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  jokerGlyphText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  jokerArtCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  jokerArtImage: {
    borderRadius: 14,
    backgroundColor: 'white',
  },
  jokerArtOverlay: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor: 'rgba(15, 18, 30, 0.14)',
  },
  negativeJokerBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  negativeJokerBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 0.4,
  },
  boardPanel: {
    flex: 1.18,
    backgroundColor: '#f3d2d0',
    borderRadius: 18,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#ddb3af',
    overflow: 'hidden',
  },
  boardPanelCompact: {
    flex: 1.15,
    padding: 10,
    gap: 8,
  },
  boardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  boardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8b5b58',
  },
  boardFormula: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    color: '#744949',
  },
  boardGlowOrbA: {
    position: 'absolute',
    top: -26,
    right: -10,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(125, 211, 252, 0.12)',
  },
  boardGlowOrbB: {
    position: 'absolute',
    bottom: -34,
    left: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(147, 197, 253, 0.12)',
  },
  boardGrid: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191, 219, 254, 0.07)',
  },
  diceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  die: {
    flex: 1,
    minHeight: 92,
    borderRadius: 18,
    backgroundColor: 'rgba(12, 21, 34, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    shadowColor: '#08101a',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 3,
  },
  dieCompact: {
    minHeight: 80,
    borderRadius: 16,
  },
  dieSelected: {
    backgroundColor: 'rgba(96, 165, 250, 0.12)',
  },
  dieFace: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d9e4ef',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06131d',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },
  dieFaceSelected: {
    backgroundColor: '#ffffff',
    borderColor: '#7fb3ff',
  },
  dieGrid: {
    width: 30,
    height: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dieCell: {
    width: '33.33%',
    height: '33.33%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diePip: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  diePipDefault: {
    backgroundColor: '#13253a',
  },
  diePipSelected: {
    backgroundColor: '#13253a',
  },
  dieValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
  },
  dieValueSelected: {
    color: '#ffffff',
  },
  notesPanel: {
    borderRadius: 14,
    backgroundColor: '#f8fcff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#bfdcf3',
  },
  noteText: {
    fontSize: 9,
    lineHeight: 11,
    color: '#4e7291',
  },
  cardPanel: {
    flex: 0.94,
    backgroundColor: '#f8fcff',
    borderRadius: 18,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#bfdcf3',
    overflow: 'visible',
  },
  cardPanelCompact: {
    flex: 0.84,
    padding: 10,
    gap: 8,
  },
  cardPanelHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deckCountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardRefreshButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#d9efff',
    borderWidth: 1,
    borderColor: '#a5cee8',
  },
  cardRefreshButtonDisabled: {
    backgroundColor: '#edf5fb',
    borderColor: '#ccdfed',
  },
  cardRefreshButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#305471',
  },
  cardRefreshButtonTextDisabled: {
    color: '#88a3ba',
  },
  deckCounts: {
    fontSize: 11,
    color: '#6d91b2',
    fontWeight: '700',
  },
  deckListButton: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: '#d9efff',
    borderWidth: 1,
    borderColor: '#a5cee8',
  },
  deckListButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2f5573',
  },
  cardRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  cardRowDense: {
    gap: 6,
  },
  cardRowWrap: {
    position: 'relative',
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardTooltip: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#bfdcf3',
    shadowColor: '#6b8aa5',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },
  cardTooltipFloating: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 10,
    zIndex: 5,
  },
  jokerTooltip: {
    borderRadius: 14,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#bfdcf3',
    shadowColor: '#6b8aa5',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },
  jokerTooltipFloating: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 10,
    zIndex: 5,
  },
  jokerTooltipMeta: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: '#4e79a0',
  },
  jokerTooltipArrow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 16,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#bfdcf3',
    transform: [{ rotate: '45deg' }],
  },
  cardTooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cardTooltipTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#173450',
  },
  cardTooltipRarity: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: '#5f7f9a',
  },
  cardTooltipBody: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    color: '#4c6f8d',
  },
  cardTooltipArrow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 16,
    backgroundColor: '#ffffff',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#bfdcf3',
    transform: [{ rotate: '-45deg' }],
  },
  cardSlot: {
    flex: 1,
  },
  draggingCardSlot: {
    zIndex: 6,
  },
  draggingJokerSlot: {
    zIndex: 8,
  },
  handCard: {
    flex: 1,
    backgroundColor: '#e9eff8',
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 3,
    borderWidth: 1,
    borderColor: '#cbd9eb',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#06101a',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },
  handCardCompact: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  handCardActive: {
    borderColor: '#7dd3fc',
    backgroundColor: '#edf5ff',
  },
  handCardDragging: {
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 6,
  },
  handCardSlottedGhost: {
    opacity: 0,
  },
  emptyCard: {
    opacity: 0.45,
  },
  cardFace: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#fcfdff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingVertical: 4,
    gap: 2,
    borderWidth: 1,
    borderColor: '#d8e5f4',
    overflow: 'hidden',
  },
  cardFaceShine: {
    position: 'absolute',
    top: 0,
    left: -6,
    right: -6,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  cardGlyph: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0d63c9',
  },
  handCardTitle: {
    fontSize: 8,
    fontWeight: '700',
    color: '#102033',
    textAlign: 'center',
  },
  handCardArtCard: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  handCardArtImage: {
    borderRadius: 14,
  },
  handCardArtOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 20, 36, 0.16)',
  },
  handCardMiniBadgeOnImage: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
  },
  handCardFooterOnImage: {
    width: '100%',
    backgroundColor: 'rgba(8, 15, 28, 0.56)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  handCardTitleOnImage: {
    fontSize: 8,
    fontWeight: '800',
    color: '#f8fbff',
    textAlign: 'center',
  },
  bottomBar: {
    flex: 0.42,
    flexDirection: 'row',
    gap: 8,
  },
  bottomUseZone: {
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#4aa6ff',
    backgroundColor: '#dff1ff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'column',
    gap: 8,
    minHeight: 72,
  },
  bottomUseZoneWide: {
    flex: 1,
  },
  bottomUseZoneActive: {
    backgroundColor: '#c9e7ff',
    borderColor: '#1f82ea',
  },
  bottomUseZoneLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#23557e',
    textAlign: 'center',
  },
  bottomButton: {
    flex: 0.9,
    borderRadius: 16,
    backgroundColor: '#f8fcff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#bfdcf3',
  },
  wideBottomButton: {
    flex: 1.2,
  },
  bottomButtonText: {
    color: '#2d526f',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryBottomButton: {
    backgroundColor: '#1072f1',
    borderColor: '#6db4ff',
  },
  primaryBottomButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 14, 0.72)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: '#f7f9fd',
    borderRadius: 22,
    padding: 18,
    gap: 12,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalIntro: {
    fontSize: 13,
    lineHeight: 18,
    color: '#526274',
  },
  guideList: {
    gap: 8,
  },
  guideRow: {
    borderRadius: 14,
    backgroundColor: '#ebf1f8',
    padding: 10,
    gap: 2,
  },
  guideRank: {
    fontSize: 14,
    fontWeight: '700',
    color: '#102033',
  },
  guideBase: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0d63c9',
  },
  guideHint: {
    fontSize: 12,
    lineHeight: 16,
    color: '#516173',
  },
  infoCard: {
    borderRadius: 14,
    backgroundColor: '#ebf1f8',
    padding: 12,
    gap: 4,
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#102033',
  },
  infoCardBody: {
    fontSize: 12,
    lineHeight: 16,
    color: '#516173',
  },
  deckListSectionWrap: {
    gap: 10,
  },
  deckListSection: {
    borderRadius: 14,
    backgroundColor: '#ebf1f8',
    padding: 12,
    gap: 6,
  },
  deckListSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#102033',
  },
  deckListItems: {
    gap: 4,
  },
  deckListItem: {
    fontSize: 12,
    lineHeight: 16,
    color: '#516173',
  },
  deckListEmpty: {
    fontSize: 12,
    color: '#7a8b9c',
  },
  overlayList: {
    gap: 10,
  },
  overlayGoldBar: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdcf3',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlayGoldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4c6f8d',
  },
  overlayGoldValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0d63c9',
  },
  settlementStageCard: {
    borderRadius: 14,
    backgroundColor: '#ebf1f8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  settlementStageTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#102033',
  },
  settlementStageMeta: {
    fontSize: 12,
    color: '#516173',
  },
  settlementRows: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdcf3',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settlementRowHighlight: {
    marginTop: 2,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2edf7',
  },
  settlementRowLabel: {
    fontSize: 13,
    color: '#516173',
    flex: 1,
  },
  settlementRowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#102033',
  },
  settlementRowLabelStrong: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102033',
    flex: 1,
  },
  settlementRowValueStrong: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0d63c9',
  },
  settlementDivider: {
    height: 1,
    backgroundColor: '#e2edf7',
    marginVertical: 2,
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    rowGap: 10,
  },
  rewardCard: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: '32%',
    padding: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d5e2ee',
    backgroundColor: '#eef4fa',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 7,
  },
  rewardCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#e6f0ff',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  rewardCardImage: {
    width: '100%',
    height: 110,
    borderRadius: 10,
  },
  rewardCardPlaceholder: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    backgroundColor: '#d8e4f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardCardFace: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    backgroundColor: '#fcfdff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingVertical: 4,
    gap: 2,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  rewardCardPlaceholderText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#35506b',
  },
  rewardCardPrice: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '800',
    color: '#35506b',
    textAlign: 'center',
  },
  rewardCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#102033',
    textAlign: 'center',
  },
  rewardTooltip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdcf3',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
  },
  rewardTooltipTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#173450',
  },
  rewardTooltipBody: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: '#4c6f8d',
  },
  overlayButton: {
    borderRadius: 16,
    backgroundColor: '#ebf1f8',
    padding: 12,
    gap: 4,
  },
  overlayButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#102033',
  },
  overlayButtonBody: {
    fontSize: 12,
    lineHeight: 16,
    color: '#526274',
  },
  overlayCard: {
    backgroundColor: '#ebf1f8',
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#102033',
  },
  overlayDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#526274',
  },
  largePrimaryButton: {
    marginTop: 6,
    borderRadius: 16,
    backgroundColor: '#1072f1',
    paddingVertical: 14,
    alignItems: 'center',
  },
  largePrimaryButtonDisabled: {
    opacity: 0.45,
  },
  largePrimaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: '#1072f1',
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
});
