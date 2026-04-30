import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const GRAVITY = 0.3;
const AIR_RESISTANCE = 0.995;

export const GameLoop = (entities, { touches, dispatch, events }) => {
  const { bow, target, arrow, gameState, gyro, stamina, wind } = entities;
  
  // Handle touch input for drawing
  touches.forEach(t => {
    if (t.type === 'start') {
      gameState.value = 'drawing';
      bow.drawPower = 0;
    }
    if (t.type === 'move' && gameState.value === 'drawing') {
      bow.drawPower = Math.min(100, bow.drawPower + 2);
    }
    if (t.type === 'end' && gameState.value === 'drawing') {
      gameState.value = 'firing';
      // Spawn arrow
      const power = bow.drawPower / 100;
      const angleRad = (bow.aimAngle * Math.PI) / 180;
      entities.arrow = {
        position: { ...bow.position },
        velocity: {
          x: Math.cos(angleRad) * power * 25,
          y: Math.sin(angleRad) * power * 25,
        },
        angle: bow.aimAngle,
        active: true,
      };
      bow.drawPower = 0;
    }
  });

  // Gyro aiming
  if (gameState.value === 'aiming' || gameState.value === 'drawing') {
    // Map gyro Y rotation to aim angle (-45 to +45 degrees)
    const sensitivity = 2;
    bow.aimAngle = Math.max(-60, Math.min(60, gyro.y * sensitivity * 45));
    
    // Drain stamina while drawing
    if (gameState.value === 'drawing') {
      stamina.value = Math.max(0, stamina.value - 0.5);
      if (stamina.value <= 0) {
        gameState.value = 'aiming';
        bow.drawPower = 0;
      }
    }
  }

  // Arrow physics
  if (arrow?.active) {
    // Apply gravity
    arrow.velocity.y += GRAVITY;
    
    // Apply wind
    arrow.velocity.x += wind.x * 0.01;
    arrow.velocity.y += wind.y * 0.01;
    
    // Air resistance
    arrow.velocity.x *= AIR_RESISTANCE;
    arrow.velocity.y *= AIR_RESISTANCE;
    
    // Update position
    arrow.position.x += arrow.velocity.x;
    arrow.position.y += arrow.velocity.y;
    
    // Update angle based on velocity
    arrow.angle = Math.atan2(arrow.velocity.y, arrow.velocity.x) * (180 / Math.PI);
    
    // Collision with target
    const dx = arrow.position.x - target.position.x;
    const dy = arrow.position.y - target.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < target.radius) {
      arrow.active = false;
      gameState.value = 'scoring';
      // Calculate score based on ring hit
      const score = distance < target.radius * 0.2 ? 10 :
                    distance < target.radius * 0.4 ? 8 :
                    distance < target.radius * 0.6 ? 6 :
                    distance < target.radius * 0.8 ? 4 : 2;
      dispatch({ type: 'score', score });
      
      // Reset after delay
      setTimeout(() => {
        gameState.value = 'aiming';
        entities.arrow = null;
        stamina.value = 100;
      }, 1500);
    }
    
    // Out of bounds
    if (arrow.position.x > width || arrow.position.y > height || arrow.position.y < 0) {
      arrow.active = false;
      gameState.value = 'aiming';
      entities.arrow = null;
      stamina.value = 100;
    }
  }

  // Reset stamina when not drawing
  if (gameState.value === 'aiming') {
    stamina.value = Math.min(100, stamina.value + 0.2);
  }

  return entities;
};
