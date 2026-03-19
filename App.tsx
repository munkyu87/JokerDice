import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RogueRollScreen } from './src/screens/RogueRollScreen';

function App() {
  return (
    <SafeAreaProvider>
      <RogueRollScreen />
    </SafeAreaProvider>
  );
}

export default App;
