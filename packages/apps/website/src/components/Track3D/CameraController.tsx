import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, PerspectiveCamera as ThreePerspectiveCamera, ArrowHelper as ThreeArrowHelper } from 'three';
import { CameraMode } from './types';

interface CameraControllerProps {
  mode: CameraMode;
  targetPosition?: [number, number, number];
  targetRotation?: [number, number, number];
  zoomMultiplier?: number;
  enabled?: boolean;
}

/**
 * Controls camera behavior based on mode
 * - orbit: User-controlled rotation around track center
 * - follow: Chase cam following a specific bot
 * - cinematic: Automated sweeping camera movements
 * - overview: Bird's eye view of entire track
 */
export function CameraController({ 
  mode, 
  targetPosition,
  targetRotation,
  zoomMultiplier = 1.0,
  enabled = true 
}: CameraControllerProps) {
  const { camera, scene } = useThree();
  const lookAtRef = useRef(new Vector3());
  const smoothRotationRef = useRef(0);
  const arrowHelperRef = useRef<ThreeArrowHelper | null>(null);
  const previousPositionRef = useRef(new Vector3());
  const smoothDirectionRef = useRef(new Vector3());
  
  useEffect(() => {
    if (!enabled) return;
    
    // Set initial camera position based on mode
    switch (mode) {
      case 'overview':
        camera.position.set(0, 100, 0);
        camera.lookAt(0, 0, 0);
        break;
      case 'cinematic':
        camera.position.set(60, 40, 60);
        camera.lookAt(0, 0, 0);
        break;
      case 'follow':
      case 'orbit':
        // These are handled in useFrame
        break;
    }
  }, [mode, camera, enabled]);
  
  useFrame((state) => {
    if (!enabled) return;
    
    const cam = camera as ThreePerspectiveCamera;
    
    switch (mode) {
      case 'follow':
        if (targetPosition && targetRotation !== undefined) {
          const botPos = new Vector3(targetPosition[0], targetPosition[1], targetPosition[2]);
          
          // Calculate ACTUAL movement direction from previous position
          let rawDirection: Vector3;
          if (previousPositionRef.current.length() > 0) {
            // Direction = current position - previous position (where bot is moving TO)
            const movementVector = new Vector3().subVectors(botPos, previousPositionRef.current);
            const movementDistance = movementVector.length();
            
            // Detect if bot teleported (loop closure) - huge distance change
            const isTeleport = movementDistance > 50; // Threshold for detecting wrap-around
            
            // If bot teleported, use the bot's rotation to determine forward direction
            if (isTeleport) {
              // Use bot's Y rotation as the forward direction (bot's heading)
              const botYRotation = targetRotation[1];
              rawDirection = new Vector3(
                Math.sin(botYRotation),
                0,
                Math.cos(botYRotation)
              );
            } else if (movementDistance > 0.01) {
              // Normal movement - use actual movement direction
              rawDirection = movementVector.normalize();
              // Zero out Y component - we only care about horizontal direction for camera
              rawDirection.y = 0;
              rawDirection.normalize();
            } else {
              // Bot hasn't moved much, use previous smooth direction
              rawDirection = smoothDirectionRef.current.length() > 0 
                ? smoothDirectionRef.current.clone()
                : new Vector3(
                    Math.sin(targetRotation[1]),
                    0,
                    Math.cos(targetRotation[1])
                  );
            }
          } else {
            // First frame, use rotation
            const botYRotation = targetRotation[1];
            rawDirection = new Vector3(
              Math.sin(botYRotation),
              0,
              Math.cos(botYRotation)
            );
          }
          
          // ALWAYS smooth direction - never allow sudden changes
          if (smoothDirectionRef.current.length() > 0) {
            smoothDirectionRef.current.lerp(rawDirection, 0.05);
            smoothDirectionRef.current.normalize();
          } else {
            smoothDirectionRef.current.copy(rawDirection);
          }
          
          const direction = smoothDirectionRef.current;
          
          // Update previous position for next frame
          previousPositionRef.current.copy(botPos);
          
          
          // Position camera behind and above the bot
          const cameraDistance = 30 * zoomMultiplier;
          const cameraHeight = 18 * zoomMultiplier;
          
          const idealCameraPos = new Vector3()
            .copy(botPos)
            .sub(direction.clone().multiplyScalar(cameraDistance)) // Behind
            .add(new Vector3(0, cameraHeight, 0)); // Above
          
          // Don't smooth camera position - follow directly to avoid lag on turns
          cam.position.copy(idealCameraPos);
          
          // Look at the bot
          const idealLookAt = botPos.clone();
          idealLookAt.y += 2;
          
          // Initialize lookAtRef if needed
          if (lookAtRef.current.length() === 0) {
            lookAtRef.current.copy(idealLookAt);
          }
          
          // Smooth only the lookAt for less jarring view changes
          lookAtRef.current.lerp(idealLookAt, 0.2);
          cam.lookAt(lookAtRef.current);
          
          // Update debug arrow
          if (!arrowHelperRef.current) {
            arrowHelperRef.current = new ThreeArrowHelper(
              direction,
              botPos,
              10,
              0xff0000,
              2,
              1
            );
            scene.add(arrowHelperRef.current);
          } else {
            arrowHelperRef.current.position.copy(botPos);
            arrowHelperRef.current.setDirection(direction);
          }
        }
        break;
        
      case 'cinematic':
        // Slowly orbit around the track center
        const time = state.clock.elapsedTime * 0.1;
        const radius = 80;
        cam.position.x = Math.sin(time) * radius;
        cam.position.z = Math.cos(time) * radius;
        cam.position.y = 40 + Math.sin(time * 0.5) * 10;
        cam.lookAt(0, 0, 0);
        break;
        
      case 'overview':
        // Static overhead view, just ensure we're looking down
        cam.lookAt(0, 0, 0);
        break;
        
      case 'orbit':
        // Orbit controls handle this, do nothing
        break;
    }
    
    // Clean up arrow if not in follow mode
    if (mode !== 'follow' && arrowHelperRef.current) {
      scene.remove(arrowHelperRef.current);
      arrowHelperRef.current = null;
    }
  });
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (arrowHelperRef.current) {
        scene.remove(arrowHelperRef.current);
        arrowHelperRef.current = null;
      }
    };
  }, [scene]);
  
  return null;
}
