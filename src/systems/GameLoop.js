import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const GRAVITY = 0.4;
const AIR_RESISTANCE = 0.998;

export const GameLoop = (entities, { touches, dispatch }) => {
  const { bow, target, arrow, gameState, gyro, stamina, wind, callbacks } = entities;
  
  // Handle touch input for drawing
  touches.forEach(t => {
    if (t.type === 'start' && gameState.value === 'aiming') {
      gameState.value = 'drawing';
      bow.drawPower = 0;
      callbacks?.onStateChange?.('drawing');
    }
    if (t.type === 'move' && gameState.value === 'drawing') {
      bow.drawPower = Math.min(100, bow.drawPower + 1.5);
      callbacks?.onDrawUpdate?.(bow.drawPower);
    }
    if (t.type === 'end' && gameState.value === 'drawing') {
      gameState.value = 'firing';
      callbacks?.onStateChange?.('firing');
      
      // Spawn arrow with velocity based on draw power
      const power = Math.max(0.3, bow.drawPower / 100);
      const angleRad = (bow.aimAngle * Math.PI) / 180;
      const baseVelocity = 18;
      
      entities.arrow = {
        position: { 
          x: bow.position.x + Math.cos(angleRad) * 30,
          y: bow.position.y + Math.sin(angleRad) * 30
        },
        velocity: {
          x: Math.cos(angleRad) * power * baseVelocity,
          y: Math.sin(angleRad) * power * baseVelocity,
        },
        angle: bow.aimAngle,
        active: true,
      };
      
      callbacks?.onArrowUpdate?.(entities.arrow);
      bow.drawPower = 0;
      callbacks?.onDrawUpdate?.(0);
    }
  });

  // Gyro aiming (only when aiming or drawing)
  if (gameState.value === 'aiming' || gameState.value === 'drawing') {
    // Map gyro rotation to aim angle
    // Gyro gives radians/sec, accumulate for angle
    const sensitivity = 3;
    const targetAngle = gyro.y * sensitivity * 60;
    bow.aimAngle = Math.max(-75, Math.min(75, targetAngle));
    
    // Drain stamina while drawing
    if (gameState.value === 'drawing') {
      stamina.value = Math.max(0, stamina.value - 0.8);
      callbacks?.onStaminaUpdate?.(stamina.value);
      
      if (stamina.value <= 0) {
        gameState.value = 'aiming';
        bow.drawPower = 0;
        callbacks?.onStateChange?.('aiming');
        callbacks?.onDrawUpdate?.(0);
      }
    }
  }

  // Arrow physics
  if (arrow?.active) {
    // Apply gravity
    arrow.velocity.y += GRAVITY;
    
    // Apply wind (subtle effect)
    arrow.velocity.x += wind.x * 0.008;
    arrow.velocity.y += wind.y * 0.008;
    
    // Air resistance
    arrow.velocity.x *= AIR_RESISTANCE;
    arrow.velocity.y *= AIR_RESISTANCE;
    
    // Update position
    arrow.position.x += arrow.velocity.x;
    arrow.position.y += arrow.velocity.y;
    
    // Update angle based on velocity trajectory
    arrow.angle = Math.atan2(arrow.velocity.y, arrow.velocity.x) * (180 / Math.PI);
    
    // Collision detection with target
    const dx = arrow.position.x - target.position.x;
    const dy = arrow.position.y - target.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < target.radius && arrow.velocity.x > 0) {
      // Hit!
      arrow.active = false;
      gameState.value = 'scoring';
      callbacks?.onStateChange?.('scoring');
      
      // Calculate score based on ring (bullseye = 10)
      const distRatio = distance / target.radius;
      const points = distRatio < 0.2 ? 10 :
                     distRatio < 0.4 ? 8 :
                     distRatio < 0.6 ? 6 :
                     distRatio < 0.8 ? 4 : 2;
      
      callbacks?.onScore?.(points);
      
      // Reset for next shot
      setTimeout(() => {
        gameState.value = 'aiming';
        entities.arrow = null;
        stamina.value = 100;
        callbacks?.onStateChange?.('aiming');
        callbacks?.onStaminaUpdate?.(100);
        callbacks?.onArrowUpdate?.(null);
      }, 1200);
    }
    
    // Check out of bounds
    const outOfBounds = (
      arrow.position.x > width + 50 ||
      arrow.position.x < -50 ||
      arrow.position.y > height + 50 ||
      arrow.position.y < -50
    );
    
    if (outOfBounds) {
      arrow.active = false;
      gameState.value = 'missed';
      callbacks?.onStateChange?.('missed');
      
      // Reset after delay
      setTimeout(() => {
        gameState.value = 'aiming';
        entities.arrow = null;
        stamina.value = 100;
        callbacks?.onStateChange?.('aiming');
        callbacks?.onStaminaUpdate?.(100);
        callbacks?.onArrowUpdate?.(null);
      }, 1000);
    }
  }

  // Regenerate stamina when not drawing
  if (gameState.value === 'aiming' && stamina.value < 100) {
    stamina.value = Math.min(100, stamina.value + 0.5);
    callbacks?.onStaminaUpdate?.(stamina.value);
  }

  return entities;
};
