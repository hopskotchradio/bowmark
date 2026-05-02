import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Animated,
  Text,
} from 'react-native';
import { Gyroscope } from 'expo-sensors';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

// Simple entity components
const BowView = ({ drawPower }) => (
  <View style={styles.bowContainer}>
    <View style={[styles.bowString, { right: 100 + drawPower * 0.5 }]} />
    <View style={styles.bowArc} />
    <View style={styles.bowHandle} />
  </View>
);

const ArrowView = ({ drawPower, isFiring }) => {
  const arrowAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (isFiring) {
      Animated.timing(arrowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      arrowAnim.setValue(0);
    }
  }, [isFiring]);
  
  const translateY = arrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.8],
  });
  
  const scale = arrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.5],
  });
  
  const opacity = arrowAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 1, 0],
  });
  
  return (
    <Animated.View style={[
      styles.arrow, 
      { 
        right: 100 + drawPower * 0.5,
        transform: [
          { translateY },
          { scale },
        ],
        opacity,
      }
    ]}>
      <View style={styles.arrowShaft} />
      <View style={styles.arrowHead} />
    </Animated.View>
  );
};

const TargetView = ({ x, y }) => (
  <View style={[styles.target, { left: x - 40, top: y - 40 }]}>
    <View style={[styles.targetRing, { width: 80, height: 80, borderRadius: 40 }]} />
    <View style={[styles.targetRing, { width: 60, height: 60, borderRadius: 30, backgroundColor: '#000' }]} />
    <View style={[styles.targetRing, { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00f' }]} />
    <View style={[styles.targetRing, { width: 20, height: 20, borderRadius: 10, backgroundColor: '#f00' }]} />
  </View>
);

export default function App() {
  const [gameState, setGameState] = useState('aiming'); // aiming, drawing, firing
  const [drawPower, setDrawPower] = useState(0);
  const [score, setScore] = useState(0);
  const [aimOffset, setAimOffset] = useState({ x: 0, y: 0 }); // Gyro-based aim adjustment
  
  // Target position (moves with gyro aim — full screen range)
  // When aimOffset is 0, target is centered on crosshair (screen center)
  const targetX = width / 2 - aimOffset.x * 2;
  const targetY = height / 2 - aimOffset.y * 2;
  
  // Gyro calibration - stores the current aim offset as the new "center"
  const [aimOffsetBase, setAimOffsetBase] = useState({ x: 0, y: 0 });
  const [rawAimOffset, setRawAimOffset] = useState({ x: 0, y: 0 });
  
  const recalibrate = () => {
    // Set current position as the new center
    // aimOffset will become: rawAimOffset - aimOffsetBase
    // So we set aimOffsetBase to rawAimOffset to make current position zero
    setAimOffsetBase({ ...rawAimOffset });
  };
  
  // Gyro setup
  useEffect(() => {
    Gyroscope.setUpdateInterval(16);
    const subscription = Gyroscope.addListener(data => {
      // Gyro data: x = pitch (tilt forward/back), y = roll (tilt left/right)
      const sensitivity = 3;
      
      setRawAimOffset(prev => {
        const newRaw = {
          x: Math.max(-100, Math.min(100, prev.x + data.y * sensitivity)),
          y: Math.max(-80, Math.min(80, prev.y + data.x * sensitivity)),
        };
        
        // Calculate calibrated aim offset
        setAimOffset({
          x: newRaw.x - aimOffsetBase.x,
          y: newRaw.y - aimOffsetBase.y,
        });
        
        return newRaw;
      });
    });
    return () => subscription?.remove();
  }, [aimOffsetBase]);

  // Draw power animation
  const drawAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(drawAnim, {
      toValue: drawPower,
      duration: 16,
      useNativeDriver: false,
    }).start();
  }, [drawPower]);

  // Touch handling - simple press handlers
  const [isPressed, setIsPressed] = useState(false);
  const pressStartY = useRef(0);
  
  const onTouchStart = (evt) => {
    if (gameState === 'aiming') {
      setGameState('drawing');
      setDrawPower(0);
      pressStartY.current = evt.nativeEvent.pageY;
      setIsPressed(true);
    }
  };
  
  const onTouchMove = (evt) => {
    if (gameState === 'drawing' && isPressed) {
      const currentY = evt.nativeEvent.pageY;
      const pullDistance = Math.max(0, currentY - pressStartY.current);
      const power = Math.min(100, pullDistance * 0.3);
      setDrawPower(power);
    }
  };
  
  const onTouchEnd = () => {
    setIsPressed(false);
    if (gameState === 'drawing') {
      fireArrow();
    }
  };

  const fireArrow = () => {
    setGameState('firing');
    
    // Calculate hit based on aim accuracy
    const aimX = targetX + aimOffset.x;
    const aimY = targetY + aimOffset.y;
    const distance = Math.sqrt(
      Math.pow(aimX - width/2, 2) + 
      Math.pow(aimY - height/2, 2) // Crosshair is at screen center
    );
    
    // Power affects accuracy (more power = flatter trajectory = more accurate)
    const accuracyBonus = drawPower * 0.5;
    const effectiveDistance = Math.max(0, distance - accuracyBonus);
    
    // Score based on distance from center
    let points = 0;
    if (effectiveDistance < 20) points = 10;
    else if (effectiveDistance < 40) points = 8;
    else if (effectiveDistance < 60) points = 6;
    else if (effectiveDistance < 80) points = 4;
    else if (effectiveDistance < 100) points = 2;
    
    setScore(s => s + points);
    
    // Reset after delay
    setTimeout(() => {
      setGameState('aiming');
      setDrawPower(0);
    }, 1500);
  };

  const powerWidth = drawAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Sky/background */}
      <View style={styles.sky} />
      
      {/* Target - moves based on gyro aim */}
      <TargetView x={targetX + aimOffset.x} y={targetY + aimOffset.y} />
      
      {/* Ground */}
      <View style={styles.ground} />
      
      {/* First person bow view at bottom - touch area for drawing */}
      <View 
        style={styles.bowTouchArea}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <View style={styles.bowWrapper}>
          <BowView drawPower={drawPower} />
          <ArrowView drawPower={drawPower} isFiring={gameState === 'firing'} />
        </View>
      </View>
      
      {/* UI Overlay */}
      <View style={styles.uiContainer} pointerEvents="none">
        {/* Score and Recalibrate */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{score}</Text>
        </View>
        <View style={styles.recalibrateContainer} pointerEvents="auto">
          <Text style={styles.recalibrateButton} onPress={recalibrate}>
            RECALIBRATE
          </Text>
        </View>
        
        {/* Crosshair — stays centered, target moves behind it */}
        <View style={[styles.crosshair, { 
          left: width/2 - 20, 
          top: height/2 - 20 
        }]}>
          <View style={styles.crosshairH} />
          <View style={styles.crosshairV} />
        </View>
        
        {/* Draw Power Bar */}
        {gameState === 'drawing' && (
          <View style={styles.powerContainer}>
            <Text style={styles.powerLabel}>POWER</Text>
            <View style={styles.powerBackground}>
              <Animated.View style={[styles.powerBar, { width: powerWidth }]} />
            </View>
          </View>
        )}
        
        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            {gameState === 'aiming' && 'TILT TO AIM • TAP & HOLD TO DRAW'}
            {gameState === 'drawing' && 'PULL DOWN • RELEASE TO FIRE'}
            {gameState === 'firing' && '...'}
          </Text>
        </View>
      </View>
      
      <StatusBar style="light" hidden />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB', // Sky blue
  },
  sky: {
    flex: 1,
    backgroundColor: '#87CEEB',
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#228B22', // Forest green
  },
  // Target
  target: {
    position: 'absolute',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetRing: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#333',
  },
  // Bow (first person view)
  bowTouchArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 50,
  },
  bowWrapper: {
    width: 100,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bowContainer: {
    position: 'absolute',
    width: 60,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bowArc: {
    position: 'absolute',
    width: 60,
    height: 120,
    borderWidth: 4,
    borderColor: '#8B4513',
    borderRadius: 30,
    borderRightWidth: 0,
  },
  bowString: {
    position: 'absolute',
    width: 2,
    height: 110,
    backgroundColor: '#ddd',
  },
  bowHandle: {
    position: 'absolute',
    left: -6,
    width: 12,
    height: 30,
    backgroundColor: '#654321',
    borderRadius: 4,
  },
  // Arrow
  arrow: {
    position: 'absolute',
    width: 60,
    height: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowShaft: {
    width: 50,
    height: 2,
    backgroundColor: '#8B4513',
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderTopWidth: 3,
    borderBottomWidth: 3,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#666',
  },
  // UI
  uiContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  scoreContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
  },
  recalibrateContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
  recalibrateButton: {
    fontSize: 14,
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  crosshair: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairH: {
    position: 'absolute',
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
  },
  crosshairV: {
    position: 'absolute',
    width: 2,
    height: 40,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
  },
  powerContainer: {
    position: 'absolute',
    bottom: 200,
    left: 50,
    right: 50,
    alignItems: 'center',
  },
  powerLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
  },
  powerBackground: {
    width: '100%',
    height: 20,
    backgroundColor: '#333',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  powerBar: {
    height: '100%',
    backgroundColor: '#ff4444',
  },
  instructions: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#fff',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
