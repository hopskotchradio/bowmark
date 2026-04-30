import React from 'react';
import { View, StyleSheet } from 'react-native';

export const Bow = ({ position, aimAngle, drawPower }) => {
  return (
    <View 
      style={[
        styles.bow,
        {
          left: position?.x || 80,
          top: position?.y || 200,
          transform: [{ rotate: `${aimAngle || 0}deg` }]
        }
      ]}
    >
      <View style={styles.bowArc} />
      <View style={[styles.string, { right: -drawPower * 0.5 || 0 }]} />
      <View style={styles.handle} />
    </View>
  );
};

const styles = StyleSheet.create({
  bow: {
    position: 'absolute',
    width: 60,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bowArc: {
    width: 60,
    height: 100,
    borderWidth: 4,
    borderColor: '#8B4513',
    borderRadius: 30,
    borderRightWidth: 0,
  },
  string: {
    position: 'absolute',
    width: 2,
    height: 90,
    backgroundColor: '#ddd',
    right: 0,
  },
  handle: {
    position: 'absolute',
    width: 12,
    height: 30,
    backgroundColor: '#654321',
    borderRadius: 4,
    left: -6,
  },
});
