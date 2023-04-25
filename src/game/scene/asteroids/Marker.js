import { useEffect, useState } from 'react';
import { useTexture } from '@react-three/drei';
import { AdditiveBlending, DoubleSide } from 'three';

import frag from './marker/marker.frag';
import vert from './marker/marker.vert';
import constants from '~/lib/constants';
import theme from '~/theme';

const markerMaxRadius = constants.AU / 50;
const initialUniforms = {
  uMaxRadius: { type: 'f', value: markerMaxRadius }
};

const Marker = (props) => {
  const { asteroidPos } = props;
  const [ points, setPoints ] = useState(asteroidPos);
  const planeTexture = useTexture(`${process.env.PUBLIC_URL}/textures/circleFaded.png`);
  const asteroidTexture = useTexture(`${process.env.PUBLIC_URL}/textures/marker.png`);
  const selectedTexture = useTexture(`${process.env.PUBLIC_URL}/textures/heavyMarker.png`);

  useEffect(() => {
    if (asteroidPos && asteroidPos.length > 0) {
      const newPoints = new Float32Array(2 * 3);
      newPoints.set(asteroidPos);
      newPoints.set([ asteroidPos[0], asteroidPos[1], 0 ], 3);
      setPoints(newPoints);
      console.log('setPoints', newPoints);
    }
  }, [ asteroidPos ]);

  if (points?.length !== 6) return null;
  return (
    <group>
      <points>
        <bufferGeometry>
          <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ points.slice(0, 3), 3 ]} />
        </bufferGeometry>
        {props.selected
          ? (
            <pointsMaterial
              map={selectedTexture}
              size={35}
              depthWrite={false}
              sizeAttenuation={false}
              transparent={true} />
          )
          : (
            <pointsMaterial
              blending={AdditiveBlending}
              color={theme.colors.main}
              map={asteroidTexture}
              size={20}
              opacity={0.8}
              depthWrite={false}
              sizeAttenuation={false}
              transparent={true} />
          )
        }
      </points>
      <line>
        <bufferGeometry>
          <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ points, 3 ]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={theme.colors.main}
          depthWrite={false}
          opacity={0.5}
          transparent={true} />
      </line>
      <points>
        <bufferGeometry>
          <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ points.slice(3), 3 ]} />
        </bufferGeometry>
        <pointsMaterial
          blending={AdditiveBlending}
          color={theme.colors.main}
          map={planeTexture}
          size={9}
          opacity={0.75}
          depthWrite={false}
          sizeAttenuation={false}
          transparent={true} />
      </points>
      <mesh position={[ ...points.slice(3) ]}>
        <circleGeometry args={[ markerMaxRadius, 20 ]} />
        <shaderMaterial
          uniforms={initialUniforms}
          transparent={true}
          depthWrite={false}
          fragmentShader={frag}
          vertexShader={vert}
          side={DoubleSide} />
      </mesh>
    </group>
  );
};

export default Marker;
