import { useRef, useEffect, useState } from 'react';
import { Group, Vector3, Sprite as ThreeSprite, SpriteMaterial, CanvasTexture, Texture } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-racing/ic-js';

interface BotRendererProps {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  label: string;
  nftId: number;
  faction?: string;
  isHighlighted?: boolean;
}

/**
 * Renders a single bot as a 3D object on the track
 * Shows the bot avatar as a sprite/billboard
 */
export function BotRenderer({
  position,
  rotation,
  color,
  label,
  nftId,
  isHighlighted = false,
}: BotRendererProps) {
  const groupRef = useRef<Group>(null);
  const spriteRef = useRef<ThreeSprite>(null);
  const labelRef = useRef<any>(null);
  const { camera } = useThree();
  const [texture, setTexture] = useState<Texture | null>(null);
  
  // Generate avatar URL using proper token identifier
  const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', nftId);
  const avatarUrl = generateExtThumbnailLink(tokenId);
  const fallbackUrl = `https://ui-avatars.com/api/?name=Bot${nftId}&background=random&size=200`;
  
  // Load texture from image
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 256;
    canvas.height = 256;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 256, 256);
      const tex = new CanvasTexture(canvas);
      setTexture(tex);
    };
    
    img.onerror = () => {
      // Try fallback
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = 'anonymous';
      fallbackImg.onload = () => {
        ctx.drawImage(fallbackImg, 0, 0, 256, 256);
        const tex = new CanvasTexture(canvas);
        setTexture(tex);
      };
      fallbackImg.src = fallbackUrl;
    };
    
    img.src = avatarUrl;
  }, [avatarUrl, fallbackUrl]);
  
  // Billboard effect - make sprite always face camera
  useFrame(() => {
    if (spriteRef.current) {
      const spriteWorldPos = new Vector3();
      spriteRef.current.getWorldPosition(spriteWorldPos);
      
      const direction = new Vector3();
      direction.subVectors(camera.position, spriteWorldPos).normalize();
      
      const angle = Math.atan2(direction.x, direction.z);
      spriteRef.current.rotation.y = angle;
    }
    
    if (labelRef.current) {
      const labelWorldPos = new Vector3(...position);
      labelWorldPos.y += 0.5;
      
      const direction = new Vector3();
      direction.subVectors(camera.position, labelWorldPos).normalize();
      
      const angle = Math.atan2(direction.x, direction.z);
      labelRef.current.rotation.y = angle;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Label above avatar */}
      <group ref={labelRef} position={[0, 6.5, 0]}>
        <Html
          center
          distanceFactor={12}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div style={{
            color: 'white',
            fontSize: '38px',
            fontWeight: 'bold',
            textShadow: '0 4px 16px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,1)',
            whiteSpace: 'nowrap',
            padding: '10px 20px',
            backgroundColor: isHighlighted ? `${color}55` : 'rgba(0,0,0,0.9)',
            border: isHighlighted ? `3px solid ${color}` : '3px solid rgba(255,255,255,0.4)',
            borderRadius: '12px',
          }}>
            {label}
          </div>
        </Html>
      </group>
      
      {/* Bot avatar as sprite */}
      {texture && (
        <sprite ref={spriteRef} position={[0, 3, 0]} scale={[4, 4, 1]}>
          <spriteMaterial map={texture} transparent />
        </sprite>
      )}
    </group>
  );
}
