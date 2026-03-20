import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LobbyScreen } from './src/screens/LobbyScreen';
import { RogueRollScreen } from './src/screens/RogueRollScreen';

function App() {
  const [screen, setScreen] = useState<'lobby' | 'game'>('lobby');
  const [startingJokerId, setStartingJokerId] = useState('lucky_reroll');

  return (
    <SafeAreaProvider>
      {screen === 'lobby' ? (
        <LobbyScreen
          onStartGame={(_mode, selectedJokerId) => {
            setStartingJokerId(selectedJokerId);
            setScreen('game');
          }}
        />
      ) : (
        <RogueRollScreen
          startingJokerId={startingJokerId}
          onBackToLobby={() => {
            setScreen('lobby');
          }}
        />
      )}
    </SafeAreaProvider>
  );
}

export default App;
