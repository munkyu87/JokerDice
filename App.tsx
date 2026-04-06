import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LobbyScreen } from './src/screens/LobbyScreen';
import { RogueRollScreen } from './src/screens/RogueRollScreen';
import { RogueRollGameState } from './src/game/useRogueRollGame';

const ACTIVE_RUN_STORAGE_KEY = '@jokerdice/active-run';

type SavedRunSnapshot = {
  startingJokerId: string;
  state: RogueRollGameState;
};

function App() {
  const [screen, setScreen] = useState<'lobby' | 'game'>('lobby');
  const [startingJokerId, setStartingJokerId] = useState('lucky_reroll');
  const [savedRun, setSavedRun] = useState<SavedRunSnapshot | null>(null);
  const [pendingInitialState, setPendingInitialState] = useState<RogueRollGameState | undefined>(undefined);
  const [isStorageReady, setIsStorageReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSavedRun = async () => {
      try {
        const raw = await AsyncStorage.getItem(ACTIVE_RUN_STORAGE_KEY);
        if (!raw || cancelled) {
          return;
        }

        const parsed = JSON.parse(raw) as SavedRunSnapshot;
        if (
          parsed?.startingJokerId &&
          parsed?.state &&
          parsed.state.phase !== 'victory' &&
          parsed.state.phase !== 'defeat'
        ) {
          setSavedRun(parsed);
        } else {
          await AsyncStorage.removeItem(ACTIVE_RUN_STORAGE_KEY);
        }
      } catch {
        await AsyncStorage.removeItem(ACTIVE_RUN_STORAGE_KEY);
      } finally {
        if (!cancelled) {
          setIsStorageReady(true);
        }
      }
    };

    loadSavedRun();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isStorageReady) {
      return;
    }

    const timeout = setTimeout(() => {
      if (!savedRun) {
        AsyncStorage.removeItem(ACTIVE_RUN_STORAGE_KEY).catch(() => undefined);
        return;
      }

      AsyncStorage.setItem(ACTIVE_RUN_STORAGE_KEY, JSON.stringify(savedRun)).catch(() => undefined);
    }, 180);

    return () => clearTimeout(timeout);
  }, [isStorageReady, savedRun]);

  const handleGameStateChange = useCallback(
    (nextState: RogueRollGameState) => {
      if (nextState.phase === 'victory' || nextState.phase === 'defeat') {
        setSavedRun(null);
        return;
      }

      setSavedRun({
        startingJokerId,
        state: nextState,
      });
    },
    [startingJokerId],
  );

  const handleStartGame = useCallback(
    async (_mode: string, selectedJokerId: string, mode: 'new' | 'continue') => {
      if (mode === 'continue' && savedRun) {
        setStartingJokerId(savedRun.startingJokerId);
        setPendingInitialState(savedRun.state);
        setScreen('game');
        return;
      }

      setStartingJokerId(selectedJokerId);
      setPendingInitialState(undefined);
      setSavedRun(null);
      setScreen('game');
      await AsyncStorage.removeItem(ACTIVE_RUN_STORAGE_KEY).catch(() => undefined);
    },
    [savedRun],
  );

  return (
    <SafeAreaProvider>
      {screen === 'lobby' ? (
        <LobbyScreen
          hasContinueGame={isStorageReady && !!savedRun}
          onStartGame={handleStartGame}
        />
      ) : (
        <RogueRollScreen
          startingJokerId={startingJokerId}
          initialState={pendingInitialState}
          onStateChange={handleGameStateChange}
          onStartingJokerChange={setStartingJokerId}
          onBackToLobby={() => {
            setScreen('lobby');
          }}
        />
      )}
    </SafeAreaProvider>
  );
}

export default App;
