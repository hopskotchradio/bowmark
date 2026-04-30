import React from 'react';
import { View, StyleSheet } from 'react-native';

export const Target = ({ position, radius = 40 }) => {
  const r = radius;
  
  return (
    <View 
      style={[
        styles.target,
        {
          left: position?.x || 300,
          top: position?.y || 200,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
        }
      ]}
    >
      <View style={[styles.ring, { width: r * 1.6, height: r * 1.6, borderRadius: r * 0.8, backgroundColor: '#fff' }]} />
      <View style={[styles.ring, { width: r * 1.2, height: r * 1.2, borderRadius: r * 0.6, backgroundColor: '#000' }]} />
      <View style={[styles.ring, { width: r * 0.8, height: r * 0.8, borderRadius: r * 0.4, backgroundColor: '#00f' }]} />
      <View style={[styles.ring, { width: r * 0.4, height: r * 0.4, borderRadius: r * 0.2, backgroundColor: '#f00' }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  target: {
    position: 'absolute',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
