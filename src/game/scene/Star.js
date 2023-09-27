import { useEffect, useRef } from 'react';
import { Color, Vector3 } from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Lensflare, LensflareElement } from '~/lib/graphics/Lensflare';

import useStore from '~/hooks/useStore';
import constants from '~/lib/constants';
import config from './star/lensflareConfig';

// Setup initial lensflare to be modified by renders
const lensflare = new Lensflare();
const lensflareElements = config.map((c) => new LensflareElement(null, c[1], c[2] * 0.66, new Color(...c[3]), c[4]));
lensflareElements.push(new LensflareElement(null, 6, 0));
lensflareElements.forEach((e) => lensflare.addElement(e));

const worldPos = new Vector3();

const Star = () => {
  const path = `${process.env.PUBLIC_URL}/textures/star/`;
  const textures = useTexture([
    `${path}lensflare1.png`,
    `${path}lensflare2.png`,
    `${path}lensflare3.png`,
    `${path}star1.png`
  ]);

  const lensflareOn = useStore(s => s.graphics.lensflare);

  const mesh = useRef();
  const distance = useRef();
  const { camera } = useThree();

  // Update lensflare elements with textures after loaded
  useEffect(() => {
    config.forEach((c, i) => {
      lensflareElements[i].texture = textures[c[0]];
    });
    lensflareElements[lensflareElements.length - 1].texture = textures[3];
  }, [ textures ]);

  // On each frame calculate view distance, then update alpha and size for lensflare elements as needed
  useFrame((state, delta) => {
    const viewDistance = mesh.current.getWorldPosition(worldPos).distanceTo(camera.position);
    if (viewDistance !== distance.current) {
      distance.current = viewDistance;
      const stdDist = 3 * viewDistance / constants.AU / constants.MAX_SYSTEM_RADIUS;
      const intensity = 1 / Math.pow(stdDist + 1, 2);
      const alpha = 5 * intensity;
      const size = 200 * intensity;

      config.forEach((c, i) => {
        lensflareElements[i].size = c[1] * size;
        lensflareElements[i].alpha = c[4] * alpha;
      });
      lensflareElements[lensflareElements.length - 1].size = 6 * size;
    }
  });

  return (
    <group position={[ 0, 0, 0 ]}>
      <mesh ref={mesh}>
        <sphereGeometry args={[ 500000000, 10, 10 ]} />
        <meshBasicMaterial color="white" depthWrite={false} />
      </mesh>
      {lensflareOn && <primitive object={lensflare} />}
    </group>
  )
};

export default Star;
