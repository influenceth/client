import { DoubleSide } from 'three';

import frag from './stellarPlane/stellarPlane.frag';
import vert from './stellarPlane/stellarPlane.vert';
import constants from '~/lib/constants';

const maxRadius = constants.AU * 9;
const initialUniforms = {
  uMaxRadius: { type: 'f', value: maxRadius }
};

const StellarPlane = () => {
  return (
    <mesh>
      <circleGeometry args={[ constants.AU * 10, 360 ]} />
      <shaderMaterial
        uniforms={initialUniforms}
        transparent={true}
        depthWrite={false}
        fragmentShader={frag}
        vertexShader={vert}
        side={DoubleSide} />
    </mesh>
  );
};

export default StellarPlane;
