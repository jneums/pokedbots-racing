import { Canvas } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface AttackAnimationsProps {
  attacks: Array<{
    id: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
    isRanged: boolean;
    isCrit: boolean;
  }>;
  gridWidth: number;
  gridHeight: number;
}

function Projectile({ 
  from, 
  to, 
  isCrit 
}: { 
  from: { x: number; y: number }; 
  to: { x: number; y: number }; 
  isCrit: boolean;
}) {
  const glowRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now());
  
  useEffect(() => {
    const duration = 400; // 0.4s
    
    const animate = () => {
      const elapsed = Date.now() - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Lerp position for both meshes
      const x = from.x + (to.x - from.x) * progress;
      const y = from.y + (to.y - from.y) * progress;
      
      if (glowRef.current) {
        glowRef.current.position.x = x;
        glowRef.current.position.y = y;
        if (glowRef.current.material instanceof THREE.MeshBasicMaterial) {
          glowRef.current.material.opacity = 0.6 * (1 - progress);
        }
      }
      
      if (coreRef.current) {
        coreRef.current.position.x = x;
        coreRef.current.position.y = y;
        if (coreRef.current.material instanceof THREE.MeshBasicMaterial) {
          coreRef.current.material.opacity = 1 - progress;
        }
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [from, to]);
  
  const color = isCrit ? '#f97316' : '#3b82f6';
  
  return (
    <group>
      {/* Outer glow */}
      <mesh ref={glowRef} position={[from.x, from.y, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
      {/* Core */}
      <mesh ref={coreRef} position={[from.x, from.y, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="white" transparent />
      </mesh>
    </group>
  );
}

function MeleeSlash({
  from,
  to,
  isCrit
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  isCrit: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());
  
  useEffect(() => {
    if (!groupRef.current) return;
    
    const duration = 300;
    
    const animate = () => {
      if (!groupRef.current) return;
      
      const elapsed = Date.now() - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Fade out
      groupRef.current.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.opacity = progress < 0.3 ? 1.0 : 1.0 * (1 - (progress - 0.3) / 0.7);
        } else if (child instanceof THREE.Line && child.material instanceof THREE.LineBasicMaterial) {
          child.material.opacity = progress < 0.3 ? 1.0 : 1.0 * (1 - (progress - 0.3) / 0.7);
        }
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [from, to]);
  
  const color = isCrit ? '#fb923c' : '#ef4444';
  
  // Calculate direction
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);
  
  // Draw a thick line with an arrow head
  const points = [
    new THREE.Vector3(from.x, from.y, 0),
    new THREE.Vector3(to.x, to.y, 0)
  ];
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  return (
    <group ref={groupRef}>
      {/* Main slash line */}
      <line>
        <bufferGeometry attach="geometry" {...geometry} />
        <lineBasicMaterial color={color} linewidth={5} transparent opacity={1.0} />
      </line>
      {/* Arrow cone at target */}
      <mesh position={[to.x, to.y, 0]} rotation={[0, 0, angle - Math.PI / 2]}>
        <coneGeometry args={[0.2, 0.4, 8]} />
        <meshBasicMaterial color={color} transparent opacity={1.0} />
      </mesh>
      {/* Glow circle at attacker */}
      <mesh position={[from.x, from.y, 0]}>
        <circleGeometry args={[0.15, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

export function AttackAnimations({ attacks, gridWidth, gridHeight }: AttackAnimationsProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <Canvas
        orthographic
        camera={{ 
          zoom: 1,
          position: [0, 0, 10],
          left: 0,
          right: gridWidth,
          top: 0,
          bottom: gridHeight,
          near: 0.1,
          far: 1000
        }}
      >
        {attacks.map((attack) => {
          // Use grid coordinates directly, just add 0.5 to center in each cell
          const fromX = attack.from.x + 0.5;
          const fromY = attack.from.y + 0.5;
          const toX = attack.to.x + 0.5;
          const toY = attack.to.y + 0.5;
          
          if (attack.isRanged) {
            return (
              <Projectile 
                key={attack.id}
                from={{ x: fromX, y: fromY }}
                to={{ x: toX, y: toY }}
                isCrit={attack.isCrit}
              />
            );
          } else {
            return (
              <MeleeSlash
                key={attack.id}
                from={{ x: fromX, y: fromY }}
                to={{ x: toX, y: toY }}
                isCrit={attack.isCrit}
              />
            );
          }
        })}
      </Canvas>
    </div>
  );
}
