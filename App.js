import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Dimensions, 
  TouchableWithoutFeedback,
  Animated,
  Text
} from 'react-native';
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
  const [gameState, setGameState] = useState('aiming');
  const [stamina, setStamina] = useState(100);
  const [drawPower, setDrawPower] = useState(0);
  const [score, setScore] = useState(0);
  const [arrowEntity, setArrowEntity] = useState(null);
  const [lastShotScore, setLastShotScore] = useState(null);
  
  const engineRef = useRef(null);
  const gyroSubscription = useRef(null);
  const entitiesRef = useRef({});
  const staminaAnim = useRef(new Animated.Value(100)).current;
  const drawAnim = useRef(new Animated.Value(0)).current;

  // Gyro setup
  useEffect(() => {
    Gyroscope.setUpdateInterval(16);
    gyroSubscription.current = Gyroscope.addListener(data => {
      setGyroData(data);
    });
    return () => gyroSubscription.current?.remove();
  }, []);

  // Stamina animation
  useEffect(() => {
    Animated.timing(staminaAnim, {
      toValue: stamina,
      duration: 50,
      useNativeDriver: false,
    }).start();
  }, [stamina]);

  // Draw power animation
  useEffect(() => {
    Animated.timing(drawAnim, {
      toValue: drawPower,
      duration: 16,
      useNativeDriver: false,
    }).start();
  }, [drawPower]);

  // Handle game events from GameLoop
  const onEvent = useCallback((e) => {
    if (e.type === 'score') {
      setScore(s => s + e.score);
      setLastShotScore(e.score);
      setTimeout(() => setLastShotScore(null), 1500);
    }
    if (e.type === 'stateChange') {
      setGameState(e.state);
      if (e.state === 'aiming') {
        setArrowEntity(null);
        setDrawPower(0);
      }
    }
    if (e.type === 'staminaUpdate') {
      setStamina(e.value);
    }
    if (e.type === 'drawUpdate') {
      setDrawPower(e.value);
    }
    if (e.type === 'arrowUpdate') {
      setArrowEntity(e.arrow);
    }
  }, []);

  // Touch handlers
  const onTouchStart = useCallback(() => {
    if (gameState === 'aiming' || gameState === 'scoring') {
      setGameState('drawing');
      setDrawPower(0);
      setLastShotScore(null);
    }
  }, [gameState]);

  const onTouchEnd = useCallback(() => {
    if (gameState === 'drawing') {
      setGameState('firing');
    }
  }, [gameState]);

  // Aim point for crosshair visualization
  const [aimPoint, setAimPoint] = useState({ x: width - 120, y: height / 2 });
  
  // Build entities object
  const entities = {
    bow: {
      position: { x: 80, y: height / 2 },
      aimAngle: 0,
      aimPoint: aimPoint,
      drawPower: drawPower,
      renderer: <Bow />
    },
    target: {
      position: { x: width - 120, y: height / 2 },
      radius: 50,
      moving: false,
      renderer: <Target />
    },
    arrow: arrowEntity,
    gameState: { value: gameState, setValue: setGameState },
    gyro: gyroData,
    stamina: { value: stamina, setValue: setStamina },
    wind: { x: 3, y: -1 },
    callbacks: {
      onStateChange: (state) => onEvent({ type: 'stateChange', state }),
      onStaminaUpdate: (value) => onEvent({ type: 'staminaUpdate', value }),
      onDrawUpdate: (value) => onEvent({ type: 'drawUpdate', value }),
      onArrowUpdate: (arrow) => onEvent({ type: 'arrowUpdate', arrow }),
      onScore: (score) => onEvent({ type: 'score', score }),
      onAimUpdate: (point) => setAimPoint(point),
    }
  };

  entitiesRef.current = entities;

  // Interpolated values for UI
  const staminaWidth = staminaAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const drawWidth = drawAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <TouchableWithoutFeedback 
      onPressIn={onTouchStart}
      onPressOut={onTouchEnd}
    >
      <View style={styles.container}>
        <GameEngine
          ref={engineRef}
          style={styles.gameContainer}
          systems={[GameLoop]}
          entities={entities}
          running={true}
          onEvent={onEvent}
        />

        {/* UI Overlay */}
        <View style={styles.uiContainer} pointerEvents="none">
          {/* Score */}
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{score}</Text>
            {lastShotScore && (
              <Text style={styles.lastShotText}>+{lastShotScore}</Text>
            )}
          </View>

          {/* Wind Indicator */}
          <View style={styles.windContainer}>
            <Text style={styles.windLabel}>WIND</Text>
            <View style={styles.windArrow}>
              <Text style={[
                styles.windDirection,
                { transform: [{ rotate: `${Math.atan2(entities.wind.y, entities.wind.x) * 180 / Math.PI}deg` }] }
              ]}>➤</Text>
              <Text style={styles.windSpeed}>{Math.round(Math.sqrt(entities.wind.x ** 2 + entities.wind.y ** 2))}</Text>
            </View>
          </View>

          {/* Stamina Bar */}
          <View style={styles.staminaContainer}>
            <Text style={styles.barLabel}>STAMINA</Text>
            <View style={styles.barBackground}>
              <Animated.View style={[
                styles.staminaBar,
                { width: staminaWidth },
                stamina < 30 && styles.staminaLow
              ]} />
            </View>
          </View>

          {/* Draw Power Bar (only when drawing) */}
          {gameState === 'drawing' && (
            <View style={styles.drawContainer}>
              <Text style={styles.barLabel}>POWER</Text>
              <View style={styles.barBackground}>
                <Animated.View style={[
                  styles.drawBar,
                  { width: drawWidth }
                ]} />
              </View>
            </View>
          )}

          {/* Crosshair */}
          {(gameState === 'aiming' || gameState === 'drawing') && (
            <View style={[styles.crosshair, { left: aimPoint.x - 10, top: aimPoint.y - 10 }]}>
              <View style={styles.crosshairH} />
              <View style={styles.crosshairV} />
            </View>
          )}

          {/* State indicator */}
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>
              {gameState === 'aiming' && 'TILT TO AIM • TAP & HOLD TO DRAW'}
              {gameState === 'drawing' && 'TILT TO AIM • RELEASE TO FIRE'}
              {gameState === 'firing' && '...'}
              {gameState === 'scoring' && 'HIT!'}
            </Text>
          </View>
        </View>

        <StatusBar style="light" hidden />
      </View>
    </TouchableWithoutFeedback>
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
  uiContainer: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
  },
  scoreContainer: {
    position: 'absolute',
    top: 40,
    left: 20,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  lastShotText: {
    fontSize: 24,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  windContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
    alignItems: 'center',
  },
  windLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  windArrow: {
    alignItems: 'center',
  },
  windDirection: {
    fontSize: 32,
    color: '#fff',
  },
  windSpeed: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  staminaContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
  },
  drawContainer: {
    position: 'absolute',
    bottom: 160,
    left: 20,
    right: 20,
  },
  barLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  barBackground: {
    height: 12,
    backgroundColor: '#333',
    borderRadius: 6,
    overflow: 'hidden',
  },
  staminaBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  staminaLow: {
    backgroundColor: '#f44336',
  },
  drawBar: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 6,
  },
  stateContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  stateText: {
    fontSize: 16,
    color: '#888',
    letterSpacing: 2,
  },
  crosshair: {
    position: 'absolute',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairH: {
    position: 'absolute',
    width: 20,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  crosshairV: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});
