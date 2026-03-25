import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { JOKERS } from '../game/data';
import { getDiceModeImage, type DieMode } from '../game/dicePreviewImages';
import { getJokerPreviewImage } from '../game/jokerPreviewImages';
import { JokerDefinition, JokerRarity } from '../game/types';

const LOBBY_LOGO = require('../assets/etc/logo.png');
const JOKER_LIST_BTN = require('../assets/etc/joker-card-list.png');
const START_BUTTON_IMG = require('../assets/etc/start.png');

const MODE_OPTIONS: Array<{ id: DieMode; title: string; subtitle: string; available: boolean }> = [
  { id: 'white', title: '하얀색 주사위', subtitle: '기본 모드', available: true },
  { id: 'black', title: '검정색 주사위', subtitle: '추후 챌린지 모드', available: false },
  { id: 'blue', title: '파란색 주사위', subtitle: '추후 챌린지 모드', available: false },
  { id: 'gold', title: '금색 주사위', subtitle: '추후 챌린지 모드', available: false },
];

const JOKER_RARITY_ORDER: JokerRarity[] = ['legendary', 'rare', 'uncommon', 'common'];

const JOKER_RARITY_LABELS: Record<JokerRarity, string> = {
  common: '일반',
  uncommon: '희귀',
  rare: '레어',
  legendary: '전설',
};

const JOKER_RARITY_COLORS: Record<JokerRarity, { border: string; glow: string }> = {
  common: { border: '#9aa6b2', glow: 'rgba(154, 166, 178, 0.25)' },
  uncommon: { border: '#3b82f6', glow: 'rgba(59, 130, 246, 0.30)' },
  rare: { border: '#ef4444', glow: 'rgba(239, 68, 68, 0.30)' },
  legendary: { border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.35)' },
};

const JOKER_TRIGGER_LABELS: Record<JokerDefinition['trigger'], string> = {
  onHandStart: '핸드 시작',
  beforeScore: '득점 전',
  afterScore: '득점 후',
};
const ROULETTE_CARD_WIDTH = 92;
const ROULETTE_CARD_GAP = 10;
const ROULETTE_VIEWPORT_WIDTH = ROULETTE_CARD_WIDTH * 3 + ROULETTE_CARD_GAP * 2; // 3장 꽉 차는 폭
const ROULETTE_STRIDE = ROULETTE_CARD_WIDTH + ROULETTE_CARD_GAP;
const ROULETTE_TARGET_INDEX = 20;
const MODE_SWIPE_THRESHOLD_PX = 48;
const MODE_SIDE_SCALE_TARGET = 0.72;
const MODE_CAROUSEL_SHIFT_PX = 26;

function ModeTitleVisual({
  mode,
  size,
}: {
  mode: { id: DieMode; title: string };
  size: 'center' | 'side';
}) {
  const diceImage = getDiceModeImage(mode.id);
  if (diceImage) {
    return (
      <Image
        source={diceImage}
        style={size === 'center' ? styles.modeCenterDiceImage : styles.modeSideDiceImage}
        // resizeMode="contain"
        resizeMethod='scale'
        accessibilityLabel={mode.title}
      />
    );
  }
  return <Text style={size === 'center' ? styles.modeCenterTitle : styles.modeSideTitle}>{mode.title}</Text>;
}

export function LobbyScreen({
  onStartGame,
}: {
  onStartGame: (mode: DieMode, startingJokerId: string) => void;
}) {
  const [selectedMode, setSelectedMode] = useState<DieMode>('white');
  const selectedModeRef = useRef(selectedMode);
  selectedModeRef.current = selectedMode;

  const modeSwipePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.15,
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: (_, g) => {
          const idx = MODE_OPTIONS.findIndex(m => m.id === selectedModeRef.current);
          if (idx < 0) {
            return;
          }
          if (g.dx <= -MODE_SWIPE_THRESHOLD_PX) {
            setSelectedMode(MODE_OPTIONS[(idx + 1) % MODE_OPTIONS.length].id);
          } else if (g.dx >= MODE_SWIPE_THRESHOLD_PX) {
            setSelectedMode(MODE_OPTIONS[(idx - 1 + MODE_OPTIONS.length) % MODE_OPTIONS.length].id);
          }
        },
      }),
    [],
  );

  const modeCarouselShiftX = useRef(new Animated.Value(0)).current;
  const modeCenterScale = useRef(new Animated.Value(1)).current;
  const modeSideScale = useRef(new Animated.Value(MODE_SIDE_SCALE_TARGET)).current;
  const prevModeIndexForAnim = useRef<number | null>(null);

  useEffect(() => {
    const idx = Math.max(0, MODE_OPTIONS.findIndex(m => m.id === selectedMode));
    if (prevModeIndexForAnim.current === null) {
      prevModeIndexForAnim.current = idx;
      return;
    }
    const prev = prevModeIndexForAnim.current;
    if (prev === idx) {
      return;
    }
    prevModeIndexForAnim.current = idx;

    const len = MODE_OPTIONS.length;
    let delta = idx - prev;
    if (delta > len / 2) {
      delta -= len;
    }
    if (delta < -len / 2) {
      delta += len;
    }

    const shiftStart = delta > 0 ? -MODE_CAROUSEL_SHIFT_PX : delta < 0 ? MODE_CAROUSEL_SHIFT_PX : 0;
    modeCarouselShiftX.setValue(shiftStart);
    modeCenterScale.setValue(0.82);
    modeSideScale.setValue(0.58);

    Animated.parallel([
      Animated.spring(modeCarouselShiftX, {
        toValue: 0,
        friction: 9,
        tension: 76,
        useNativeDriver: true,
      }),
      Animated.spring(modeCenterScale, {
        toValue: 1,
        friction: 7,
        tension: 86,
        useNativeDriver: true,
      }),
      Animated.spring(modeSideScale, {
        toValue: MODE_SIDE_SCALE_TARGET,
        friction: 8,
        tension: 88,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedMode]);

  const [showJokerGuide, setShowJokerGuide] = useState(false);
  const [selectedJokerId, setSelectedJokerId] = useState<string>(JOKERS[0]?.id ?? 'lucky_reroll');
  const [showStartReveal, setShowStartReveal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [revealedStartJokerId, setRevealedStartJokerId] = useState<string>('lucky_reroll');
  const [showRouletteResult, setShowRouletteResult] = useState(false);
  const [rouletteJokerIds, setRouletteJokerIds] = useState<string[]>([]);
  const rouletteTranslateX = useState(() => new Animated.Value(0))[0];
  const rouletteShineTranslateX = useRef(new Animated.Value(-60)).current;

  // 선택 조커로 시작할 때 "획득" 연출 오버레이
  const [showStartOverlay, setShowStartOverlay] = useState(false);
  const [isStartingTransition, setIsStartingTransition] = useState(false);
  const startOverlayScale = useRef(new Animated.Value(0.6)).current;
  const startOverlayOpacity = useRef(new Animated.Value(0)).current;
  const startOverlayBackdropOpacity = useRef(new Animated.Value(0)).current;
  // 흔들림/이동 없이 가운데에서 "커졌다가 사라지는" 연출만
  const didAutoStartRef = useRef(false);

  const selectedJoker = useMemo(
    () => JOKERS.find(joker => joker.id === selectedJokerId) ?? JOKERS[0],
    [selectedJokerId],
  );
  const selectedJokerRarityColors = selectedJoker
    ? JOKER_RARITY_COLORS[selectedJoker.rarity]
    : JOKER_RARITY_COLORS.common;

  const jokerSections = useMemo(() => {
    return JOKER_RARITY_ORDER.map(rarity => ({
      rarity,
      items: JOKERS.filter(j => j.rarity === rarity),
    }));
  }, []);

  const startJokers = useMemo(() => JOKERS, []);
  const revealedStartJoker = useMemo(
    () => JOKERS.find(joker => joker.id === revealedStartJokerId),
    [revealedStartJokerId],
  );
  const revealedStartJokerRarityColors = useMemo(
    () => JOKER_RARITY_COLORS[revealedStartJoker?.rarity ?? 'common'],
    [revealedStartJoker?.rarity],
  );
  const jokerById = useMemo(
    () =>
      Object.fromEntries(
        JOKERS.map(joker => [joker.id, joker]),
      ) as Record<string, JokerDefinition>,
    [],
  );

  const handleStartRun = () => {
    if (isStarting || startJokers.length === 0) {
      return;
    }

    const randomJoker = startJokers[Math.floor(Math.random() * startJokers.length)];
    const targetIndex = ROULETTE_TARGET_INDEX;
    const generatedRouletteIds = Array.from({ length: 26 }, () => {
      const randomIndex = Math.floor(Math.random() * startJokers.length);
      return startJokers[randomIndex].id;
    });
    generatedRouletteIds[targetIndex] = randomJoker.id;

    setRevealedStartJokerId(randomJoker.id);
    setShowRouletteResult(false);
    didAutoStartRef.current = false;
    setRouletteJokerIds(generatedRouletteIds);
    setShowStartReveal(true);
    setIsStarting(true);
    rouletteTranslateX.setValue(0);
    const centerOffset = ROULETTE_VIEWPORT_WIDTH / 2 - ROULETTE_CARD_WIDTH / 2;
    const targetOffset = -(targetIndex * ROULETTE_STRIDE - centerOffset);

    Animated.sequence([
      Animated.delay(180),
      Animated.timing(rouletteTranslateX, {
        toValue: targetOffset,
        duration: 3200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(700),
    ]).start(() => {
      setShowRouletteResult(true);
      setIsStarting(false);
    });
  };

  const handleConfirmStart = () => {
    if (isStartingTransition || !revealedStartJokerId) {
      return;
    }

    setIsStartingTransition(true);
    setShowStartReveal(false); // 1️⃣ 팝업 닫힘
    setShowStartOverlay(true); // 2️⃣ 오버레이 등장

    startOverlayScale.setValue(0.6);
    startOverlayOpacity.setValue(0);
    startOverlayBackdropOpacity.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(startOverlayBackdropOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(startOverlayOpacity, {
          toValue: 0.2,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(startOverlayScale, {
          toValue: 1.52,
          speed: 18,
          bounciness: 10,
          useNativeDriver: true,
        }),
        Animated.timing(startOverlayOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(900), // 1.5~2초 느낌(확대 + 이름 노출)
    ]).start(() => {
      Animated.parallel([
        Animated.timing(startOverlayBackdropOpacity, {
          toValue: 0,
          duration: 320,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(startOverlayOpacity, {
          toValue: 0,
          duration: 320,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowStartOverlay(false);
        setIsStartingTransition(false);
        onStartGame(selectedMode, revealedStartJokerId);
      });
    });
  };

  useEffect(() => {
    if (!showStartReveal) {
      rouletteShineTranslateX.setValue(-60);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(rouletteShineTranslateX, {
        toValue: ROULETTE_VIEWPORT_WIDTH + 60,
        duration: 1400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );

    loop.start();
    return () => loop.stop();
  }, [Easing, ROULETTE_VIEWPORT_WIDTH, showStartReveal, rouletteShineTranslateX]);

  // 3) 추첨 끝나면 "이 조커로 시작"을 자동으로 실행
  useEffect(() => {
    if (!showStartReveal || !showRouletteResult) {
      return;
    }

    if (showStartOverlay || isStartingTransition) {
      return;
    }

    if (didAutoStartRef.current) {
      return;
    }

    didAutoStartRef.current = true;
    const t = setTimeout(() => {
      handleConfirmStart();
    }, 420);

    return () => clearTimeout(t);
  }, [showStartReveal, showRouletteResult, showStartOverlay, isStartingTransition, revealedStartJokerId]);

  const modeIndex = Math.max(
    0,
    MODE_OPTIONS.findIndex(m => m.id === selectedMode),
  );
  const leftMode = MODE_OPTIONS[(modeIndex - 1 + MODE_OPTIONS.length) % MODE_OPTIONS.length];
  const rightMode = MODE_OPTIONS[(modeIndex + 1) % MODE_OPTIONS.length];
  const selectedModeOption = MODE_OPTIONS[modeIndex];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.frameOuter}>
        <View style={styles.framePanel}>
          <View style={styles.frameContent}>
            <View style={styles.frameHeader}>
              <Image
                source={LOBBY_LOGO}
                style={styles.lobbyLogo}
                resizeMode="contain"
                accessibilityLabel="Joker Dice"
              />
            </View>

            <View style={styles.frameMiddle}>
              <View style={styles.modeCarouselWrap}>
          <Animated.View
            style={[
              styles.modeCarouselRow,
              { transform: [{ translateX: modeCarouselShiftX }] },
            ]}
            collapsable={false}
            {...modeSwipePanResponder.panHandlers}>
            <Pressable onPress={() => setSelectedMode(leftMode.id)} style={styles.modeSideCard}>
              <Animated.View
                style={[
                  styles.modeSideCardInner,
                  {
                    opacity: leftMode.available ? 0.75 : 0.45,
                    transform: [{ scale: modeSideScale }],
                  },
                ]}>
                <ModeTitleVisual mode={leftMode} size="side" />
              </Animated.View>
            </Pressable>

            <Pressable
              onPress={() => setSelectedMode(selectedMode)}
              style={[
                styles.modeCenterCard,
                !selectedModeOption.available ? styles.modeCenterCardLocked : undefined,
              ]}>
              <Animated.View
                style={[styles.modeCenterCardInner, { transform: [{ scale: modeCenterScale }] }]}>
                <ModeTitleVisual mode={MODE_OPTIONS[modeIndex]} size="center" />
              </Animated.View>
            </Pressable>

            <Pressable onPress={() => setSelectedMode(rightMode.id)} style={styles.modeSideCard}>
              <Animated.View
                style={[
                  styles.modeSideCardInner,
                  {
                    opacity: rightMode.available ? 0.75 : 0.45,
                    transform: [{ scale: modeSideScale }],
                  },
                ]}>
                <ModeTitleVisual mode={rightMode} size="side" />
              </Animated.View>
            </Pressable>
          </Animated.View>

          <View style={styles.modeNavStrip}>
            <Text style={styles.modeNavPillLabel} numberOfLines={1}>
              {MODE_OPTIONS[modeIndex].subtitle}
            </Text>
          </View>
            </View>
            </View>

            <View style={styles.frameFooter}>
              <View style={styles.frameFooterTopRow}>
                <Pressable
                  onPress={() => setShowJokerGuide(true)}
                  style={({ pressed }) => [
                    styles.jokerListButton
                    // pressed && styles.jokerListButtonPressed,
                  ]}
                  hitSlop={10}
                  accessibilityLabel="조커 목록">
                  <Image source={JOKER_LIST_BTN} style={styles.jokerListButtonImage} />
                </Pressable>
              </View>
              <Pressable
                onPress={handleStartRun}
                style={[styles.startButton, !selectedModeOption.available ? styles.startButtonDisabled : undefined]}
                disabled={isStarting || !selectedModeOption.available}
                accessibilityLabel="게임 시작"
                accessibilityRole="button">
                <Image
                  source={START_BUTTON_IMG}
                  style={styles.startButtonImage}
                  // resizeMode="contain"
                  // resizeMethod='scale'
                />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {showStartOverlay ? (
        <Animated.View
          style={[styles.startOverlayBackdrop, { opacity: startOverlayBackdropOpacity }]}
          pointerEvents="none">
          <Animated.View
            style={[
              styles.startOverlayCard,
              {
                opacity: startOverlayOpacity,
                transform: [
                  { scale: startOverlayScale },
                ],
              },
            ]}>
            {getJokerPreviewImage(revealedStartJokerId) ? (
              <Image
                source={getJokerPreviewImage(revealedStartJokerId)!}
                style={styles.startOverlayImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.startOverlayPlaceholder} />
            )}
          </Animated.View>
        </Animated.View>
      ) : null}

      <Modal animationType="fade" transparent visible={showStartReveal}>
        <View style={styles.revealBackdrop}>
          <View style={styles.revealContent}>
            <Text style={styles.revealTitle}>🎰 시작 조커 추첨</Text>
            {/* <Text style={styles.revealSubtitle}>전설 제외 랜덤 1장</Text> */}

            <View style={styles.revealRouletteViewport}>
              <Animated.View
                style={[
                  styles.revealRouletteTrack,
                  { transform: [{ translateX: rouletteTranslateX }] },
                ]}>
                {rouletteJokerIds.map((jokerId, index) => {
                  const joker = jokerById[jokerId];
                  const jokerImage = getJokerPreviewImage(jokerId);
                  const rarity = joker?.rarity ?? 'common';
                  const rarityColors = JOKER_RARITY_COLORS[rarity];
                  const isSelected = index === ROULETTE_TARGET_INDEX;
                  return (
                    <View
                      key={`${jokerId}-${index}`}
                      style={[
                        styles.revealRouletteCard,
                        {
                          borderColor: rarityColors.border,
                          backgroundColor: rarityColors.glow,
                          borderWidth: isSelected ? 3 : 1.5,
                        },
                        isSelected ? styles.revealRouletteCardSelected : undefined,
                      ]}>
                      {jokerImage ? (
                        <Image source={jokerImage} style={styles.revealRouletteImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.revealRoulettePlaceholder}>
                          <Text style={styles.revealRoulettePlaceholderText}>
                            {joker?.name.slice(0, 1) ?? '?'}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </Animated.View>
              <View pointerEvents="none" style={styles.revealPointer} />
              <View pointerEvents="none" style={styles.revealFocusGlow} />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.revealShine,
                  { transform: [{ translateX: rouletteShineTranslateX }] },
                ]}
              />
            </View>

            {/* 등급/이름 UI는 빼고, 중앙 캐러셀만 보여줍니다. */}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={showJokerGuide}
        onRequestClose={() => setShowJokerGuide(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>조커 리스트</Text>
              <Pressable onPress={() => setShowJokerGuide(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>닫기</Text>
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <View
                style={[
                  styles.jokerDetail,
                  {
                    borderColor: selectedJokerRarityColors.border,
                    borderTopColor: selectedJokerRarityColors.border,
                    shadowColor: selectedJokerRarityColors.border,
                  },
                ]}>
                {selectedJoker ? (
                  <>
                    {getJokerPreviewImage(selectedJoker.id) ? (
                      <Image
                        source={getJokerPreviewImage(selectedJoker.id)}
                        style={styles.jokerDetailImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.jokerDetailPlaceholder}>
                        <Text style={styles.jokerDetailPlaceholderText}>{selectedJoker.name.slice(0, 1)}</Text>
                      </View>
                    )}
                    <Text style={styles.jokerDetailTitle}>{selectedJoker.name}</Text>
                    <View style={styles.jokerDetailMeta}>
                      <Text
                        style={[
                          styles.jokerDetailMetaPill,
                          {
                            borderColor: JOKER_RARITY_COLORS[selectedJoker.rarity].border,
                            backgroundColor: JOKER_RARITY_COLORS[selectedJoker.rarity].glow,
                            color: JOKER_RARITY_COLORS[selectedJoker.rarity].border,
                          },
                        ]}>
                        {selectedJoker.rarity === 'legendary' ? '★ ' : ''}
                        {JOKER_RARITY_LABELS[selectedJoker.rarity]}
                      </Text>
                      <Text style={styles.jokerDetailTriggerPill}>{JOKER_TRIGGER_LABELS[selectedJoker.trigger]}</Text>
                    </View>
                    <Text style={styles.jokerDetailDesc}>{selectedJoker.description}</Text>
                  </>
                ) : null}
              </View>

              <ScrollView style={styles.jokerGridScroll} contentContainerStyle={styles.jokerGridScrollContent}>
                {jokerSections
                  .filter(section => section.items.length > 0)
                  .map(section => (
                    <View key={section.rarity} style={styles.jokerSection}>
                      <View style={styles.jokerSectionHeader}>
                        <View
                          style={[
                            styles.jokerSectionTag,
                            {
                              borderColor: JOKER_RARITY_COLORS[section.rarity].border,
                              backgroundColor: JOKER_RARITY_COLORS[section.rarity].glow,
                            },
                          ]}>
                          <Text style={[styles.jokerSectionTagText, { color: JOKER_RARITY_COLORS[section.rarity].border }]}>
                            {section.rarity === 'legendary' ? '★ ' : ''}
                            {JOKER_RARITY_LABELS[section.rarity]}
                          </Text>
                          <Text style={styles.jokerSectionTagCount}> {section.items.length}</Text>
                        </View>
                      </View>

                      <View style={styles.jokerGrid}>
                        {section.items.map((joker: JokerDefinition, index: number) => {
                          const previewImage = getJokerPreviewImage(joker.id);
                          const isSelected = selectedJoker?.id === joker.id;
                          const rarityColors = JOKER_RARITY_COLORS[joker.rarity];
                          const isRowLast = (index + 1) % 4 === 0;

                          return (
                            <Pressable
                              key={joker.id}
                              onPress={() => setSelectedJokerId(joker.id)}
                              style={[
                                styles.jokerGridItem,
                                isRowLast ? styles.jokerGridItemRowLast : undefined,
                                { borderColor: rarityColors.border },
                                isSelected ? styles.jokerGridItemSelected : undefined,
                              ]}>
                              {previewImage ? (
                                <Image source={previewImage} style={styles.jokerGridImage} resizeMode="cover" />
                              ) : (
                                <View style={[styles.jokerGridPlaceholder, { backgroundColor: rarityColors.glow }]}>
                                  <View style={styles.jokerGridPlaceholderMark} />
                                </View>
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  frameOuter: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  framePanel: {
    width: '95%',
    height: '100%',
    alignSelf: 'center',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  frameContent: {
    flex: 1,
    width: '100%',
    paddingHorizontal: '4.5%',
    // paddingTop: '4.5%',
    paddingBottom: '4%',
  },
  frameHeader: {
    alignItems: 'center',
    paddingTop: 20,
    flexShrink: 0,
    // backgroundColor: 'red',
  },
  lobbyLogo: {
    width: '100%',
    // backgroundColor: 'red',
    maxWidth: 280,
    height: 240,
  },
  frameMiddle: {
    flex: 1,
    // justifyContent: 'center',
    minHeight: 120,
    // backgroundColor: 'blue',
  },
  frameFooter: {
    gap: 8,
    paddingTop: 4,
    flexShrink: 0,
  },
  frameFooterTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  jokerListButton: {
    // width: 40,
    height: 60,
    // backgroundColor: 'red',
    // paddingTop: 20,
    marginRight: 10,
    // borderRadius: 16,
    // backgroundColor: 'rgba(15, 23, 42, 0.06)',
    // backgroundColor: 'red',
    // borderWidth: StyleSheet.hairlineWidth * 2,
    // borderColor: 'rgba(245, 158, 11, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jokerListButtonPressed: {
    backgroundColor: 'rgba(15, 23, 42, 0.12)',
  },
  jokerListButtonImage: {
    width: 70,
    height: 85,
    // backgroundColor: 'red',
  },
  modeList: {
    gap: 10,
  },
  modeCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdcf3',
    backgroundColor: '#f8fcff',
  },
  modeCardSelected: {
    borderColor: '#60a5fa',
    backgroundColor: '#eaf3ff',
  },
  modeCardDisabled: {
    opacity: 0.6,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#173450',
  },
  modeSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#5f7f9a',
  },
  modeSoon: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: '#8da7bb',
  },
  modeCarouselWrap: {
    position: 'relative',
    // marginTop: 6,
  },
  modeCarouselRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 70,
    zIndex: 1,
    overflow: 'visible',
  },
  modeSideCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSideCardInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSideTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#173450',
    textAlign: 'center',
  },
  modeCenterCard: {
    flex: 1.1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCenterCardInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCenterCardLocked: {
    opacity: 0.92,
  },
  modeCenterTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#173450',
  },
  modeCenterDiceImage: {
    width: 230,
    height: 200,
  },
  modeSideDiceImage: {
    width: 130,
    height: 100,
  },
  modeNavStrip: {
    alignItems: 'center',
    // marginTop: 6,
    paddingHorizontal: 12,
  },
  modeNavPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(96, 165, 250, 0.42)',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  modeNavPillHit: {
    width: 46,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeNavPillHitPressed: {
    backgroundColor: 'rgba(147, 197, 253, 0.38)',
  },
  modeNavPillLabelWrap: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    minWidth: 112,
    maxWidth: 240,
    alignItems: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(96, 165, 250, 0.28)',
  },
  modeNavPillLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3d5a73',
    letterSpacing: 0.35,
    textAlign: 'center',
  },
  modeNavPillArrow: {
    fontSize: 28,
    fontWeight: '200',
    color: '#1e4f8c',
    marginTop: -3,
  },
  startButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 70,
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
  startButtonDisabled: {
    opacity: 0.45,
  },
  startButtonImage: {
    width: '75%',
    // maxWidth: 400,
    // backgroundColor: 'red',
    height: 100,
  },
  startOverlayBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  startOverlayCard: {
    width: 240,
    paddingVertical: 0,
    borderRadius: 26,
    borderWidth: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 2,
  },
  startOverlayGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  startOverlayImage: {
    width: 240,
    height: 240,
  },
  startOverlayPlaceholder: {
    width: 210,
    height: 210,
    borderRadius: 22,
    backgroundColor: 'rgba(216,232,246,0.9)',
  },
  startOverlayName: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  startOverlaySparkle1: {
    position: 'absolute',
    width: 10,
    height: 10,
    left: '45%',
    top: '30%',
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 1,
  },
  startOverlaySparkle2: {
    position: 'absolute',
    width: 14,
    height: 14,
    left: '62%',
    top: '40%',
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 1,
  },
  startOverlaySparkle3: {
    position: 'absolute',
    width: 12,
    height: 12,
    left: '30%',
    top: '52%',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.65)',
    zIndex: 1,
  },
  startOverlaySparkle4: {
    position: 'absolute',
    width: 16,
    height: 16,
    left: '52%',
    top: '62%',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.6)',
    zIndex: 1,
  },
  revealBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 14, 0.76)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  revealContent: {
    width: '82%',
    maxWidth: 320,
    borderRadius: 16,
    // backgroundColor: '#eaf7ff',
    backgroundColor: '#eef6ff',
    borderWidth: 1,
    // borderColor: '#c4dff3',
    // borderColor: 'rgba(0,0,0,0.05)',

    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  revealTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#173450',
  },
  revealSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#62809d',
  },
  revealRouletteViewport: {
    marginTop: 14,
    width: ROULETTE_VIEWPORT_WIDTH,
    height: 160,
    borderWidth: 1,
    borderColor: '#b7d3ea',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  revealRouletteTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 0,
  },
  revealRouletteCard: {
    width: ROULETTE_CARD_WIDTH,
    height: 124,
    marginRight: ROULETTE_CARD_GAP,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#8fbce0',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  revealRouletteImage: {
    width: '100%',
    height: '100%',
  },
  revealRoulettePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#dbe8f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealRoulettePlaceholderText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#3f5f7a',
  },
  revealPointer: {
    position: 'absolute',
    top: 2,
    left: '50%',
    marginLeft: -9,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1f4f78',
    // borderTopColor: '#1f4f78',
  },
  revealFocusGlow: {
    position: 'absolute',
    left: '50%',
    marginLeft: -46,
    top: 17,
    width: 93,
    height: 124,
    borderRadius: 14,
    borderWidth: 3,
    // borderColor: 'rgba(36, 111, 173, 0.55)',
    // borderColor: 'black',
    borderColor: '#3bbcff',
    backgroundColor: 'rgba(59,188,255,0.08)',
    // backgroundColor: 'rgba(59,188,255,0.15)',

    // iOS 네온
    shadowColor: '#3bbcff',
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },

    // Android 네온
    elevation: 8,

    // backgroundColor: 'rgba(255,255,255,0.16)',
    // shadowOpacity: 0.18,
    // shadowRadius: 12,
    // shadowOffset: { width: 0, height: 4 },
  },
  revealRouletteCardSelected: {
    borderColor: '#60a5fa',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  revealShine: {
    position: 'absolute',
    top: -22,
    left: -60,
    width: 70,
    height: 190,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.65)',
    opacity: 0.18,
  },
  revealJokerName: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '800',
    color: '#173450',
  },
  revealResultWrap: {
    marginTop: 14,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  revealResultName: {
    fontSize: 16,
    fontWeight: '900',
  },
  revealResultNamePlaceholder: {
    fontSize: 14,
    fontWeight: '900',
    color: '#5f7f9a',
  },
  revealResultSub: {
    fontSize: 12,
    fontWeight: '900',
    color: '#294968',
  },
  revealActionRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  revealSecondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#9ab7d0',
    backgroundColor: '#f5fbff',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  revealSecondaryButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#43627e',
  },
  revealPrimaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2f81ff',
    backgroundColor: '#e7f1ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  revealPrimaryButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#185cc4',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 14, 0.7)',
    justifyContent: 'center',
    padding: 14,
  },
  modalCard: {
    backgroundColor: '#f7fbff',
    borderRadius: 20,
    padding: 14,
    maxHeight: '94%',
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#173450',
  },
  modalCloseButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#dceefe',
  },
  modalCloseText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2e5472',
  },
  modalBody: {
    flexDirection: 'column',
    gap: 12,
    minHeight: 430,
  },
  jokerGridScroll: {
    minHeight: 200,
    maxHeight: 280,
  },
  jokerGridScrollContent: {
    paddingBottom: 10,
  },
  jokerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  jokerGridItem: {
    width: '24%',
    aspectRatio: 0.68,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c4dff3',
    backgroundColor: '#ffffff',
    marginBottom: 8,
    marginRight: '1.33%',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  jokerGridItemRowLast: {
    marginRight: 0,
  },
  jokerGridItemSelected: {
    borderColor: '#60a5fa',
    backgroundColor: '#edf5ff',
  },
  jokerGridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 9,
  },
  jokerGridPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 9,
    backgroundColor: '#dbe8f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jokerGridPlaceholderText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#355572',
  },
  jokerGridPlaceholderMark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  jokerDetail: {
    flex: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderTopWidth: 4,
    borderColor: '#c4dff3',
    backgroundColor: '#ffffff',
    padding: 10,
    alignItems: 'center',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  jokerDetailImage: {
    width: 150,
    height: 196,
    borderRadius: 12,
  },
  jokerDetailPlaceholder: {
    width: 150,
    height: 196,
    borderRadius: 12,
    backgroundColor: '#e0ecf9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jokerDetailPlaceholderText: {
    fontSize: 78,
    fontWeight: '800',
    color: '#3d6180',
  },
  jokerDetailTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#173450',
  },
  jokerDetailDesc: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: '#4f718f',
    textAlign: 'center',
  },

  jokerDetailMeta: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  jokerDetailMetaPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '900',
    color: '#173450',
  },
  jokerDetailTriggerPill: {
    borderWidth: 1,
    borderColor: '#b9d4ea',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '900',
    color: '#2e5472',
    backgroundColor: '#edf5ff',
  },

  jokerSection: {
    marginTop: 8,
    gap: 8,
  },
  jokerSectionHeader: {
    paddingHorizontal: 8,
  },
  jokerSectionTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  jokerSectionTagText: {
    fontSize: 13,
    fontWeight: '900',
  },
  jokerSectionTagCount: {
    fontSize: 12,
    fontWeight: '900',
    color: '#294968',
  },
});
