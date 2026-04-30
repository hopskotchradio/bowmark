import React from 'react';
import { View, StyleSheet } from 'react-native';

export const Arrow = ({ position, angle, velocity }) => {
  const speed = Math.sqrt(velocity?.x ** 2 + velocity?.y ** 2) || 0;
  const opacity = Math.max(0.3, 1 - speed / 1000);
  
  return (
    <View 
      style={[
        styles.arrow,
        {
          left: position?.x || 0,
          top: position?.y || 0,
          transform: [{ rotate: `${angle || 0}deg` }],
          opacity,
        }
      ]}
    >
      <View style={styles.shaft} />
      <View style={styles.head} />
      <View style={styles.fletching} />
    </View>
  );
};

const styles = StyleSheet.create({
  arrow: {
    position: 'absolute',
    width: 40,
    height: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shaft: {
    width: 30,
    height: 2,
    backgroundColor: '#8B4513',
  },
  head: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#666',
  },
  fletching: {
    width: 8,
    height: 6,
    backgroundColor: '#f00',
    borderRadius: 1,
  },
});
