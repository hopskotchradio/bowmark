import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { GameEngine } from 'react-native-game-engine';
import { Gyroscope } from 'expo-sensors';
import { StatusBar } from 'expo-status-bar';

import { GameLoop } from './src/systems/GameLoop';
import { Bow } from './src/entities/Bow';
import { Target } from './src/entities/Target';
import { Arrow } from './src/entities/Arrow';

const { width, height } = Dimensions.get('window');

export default function App() {
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  const [gameState, setGameState] = useState('aiming'); // aiming, drawing, firing, scoring
  const [stamina, setStamina] = useState(100);
  const [drawPower, setDrawPower] = useState(0);
  
  const engineRef = useRef(null);
  const gyroSubscription = useRef(null);

  useEffect(() => {
    Gyroscope.setUpdateInterval(16); // ~60fps
    
    gyroSubscription.current = Gyroscope.addListener(data => {
      setGyroData(data);
    });

    return () => {
      gyroSubscription.current?.remove();
    };
  }, []);

  const entities = {
    bow: {
      position: { x: 80, y: height / 2 },
      aimAngle: 0,
      drawPower: 0,
      renderer: <Bow />
    },
    target: {
      position: { x: width - 100, y: height / 2 },
      radius: 40,
      moving: false,
      renderer: <Target />
    },
    arrow: null,
    gameState: { value: gameState },
    gyro: gyroData,
    stamina: { value: stamina },
    wind: { x: 2, y: 0 } // wind factor
  };

  return (
    <View style={styles.container}>
      <GameEngine
        ref={engineRef}
        style={styles.gameContainer}
        systems={[GameLoop]}
        entities={entities}
        running={true}
      />
      <StatusBar style="light" hidden />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  gameContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
});
