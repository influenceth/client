import { useState } from 'react';
import styled from 'styled-components';
import { Canvas, useThree } from '@react-three/fiber';
import utils from 'influence-utils';
import { AmbientLight,
  Color,
  DirectionalLight,
  Group,
  LinearFilter,
  LinearMipMapLinearFilter,
  PerspectiveCamera,
  Scene,
  sRGBEncoding,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three';

import useWebWorker from '~/hooks/useWebWorker';
import AsteroidComposition from './AsteroidComposition';
import AsteroidRendering from './AsteroidRendering';
import AsteroidSpinner from './AsteroidSpinner';

const OPACITY_ANIMATION = 400;

const Graphic = styled.div`
  padding-top: 100%;
  position: relative;
  width: 100%;
  & > * {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: -1;
  }
`;
const GraphicData = styled.div`
  align-items: center;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  font-size: 20px;
  justify-content: center;
  & b {
    color: white;
  }
  & div {
    margin: 8px 0;
  }
  & div {
    text-transform: uppercase;
  }
`;

const OpacityContainer = styled.div`
  opacity: ${p => p.ready};
  transition: opacity ${OPACITY_ANIMATION}ms ease;
`;

const AsteroidName = styled.div`
  background: black;
  border: 1px solid ${p => p.theme.colors.borderBottom};
  border-radius: 1em;
  color: white;
  font-size: 28px;
  padding: 4px 12px;
  text-align: center;
  text-transform: none !important;
  min-width: 60%;
`;

const AsteroidGraphic = ({ asteroid, ...compositionProps }) => {
  const webWorkerPool = useWebWorker();

  const [frameloop, setFrameloop] = useState();
  const [ready, setReady] = useState();
  const [delayedReady, setDelayedReady] = useState();

  const onAnimationChange = (which) => {
    setFrameloop(which ? 'always' : 'never');
  };

  const onReady = () => {
    setReady(true);
    setTimeout(() => {
      setDelayedReady(true);
    }, OPACITY_ANIMATION);
  };

  const test = false;
  return (
    <Graphic>
      <OpacityContainer ready={ready ? 1 : 0}>
        <Canvas
          antialias
          frameloop={asteroid.scanStatus === 'SCANNING' ? 'always' : frameloop}
          outputEncoding={sRGBEncoding}>
          {asteroid.scanStatus === 'SCANNING'
            ? <AsteroidSpinner />
            : <AsteroidComposition
                asteroid={asteroid}
                onAnimationChange={onAnimationChange}
                ready={delayedReady ? 1 : 0}
                {...compositionProps} />
          }
        </Canvas>
      </OpacityContainer>
      <OpacityContainer ready={ready ? 1 : 0}>
        <Canvas antialias frameloop="never" style={{ width: '100%', height: '100%' }}>
          <AsteroidRendering asteroid={asteroid} onReady={onReady} webWorkerPool={webWorkerPool} />
        </Canvas>
      </OpacityContainer>
      <GraphicData>
        <div>
          {utils.toSize(asteroid.radius)} <b>{utils.toSpectralType(asteroid.spectralType)}-type</b>
        </div>
        <AsteroidName>
          {asteroid.customName ? `\`${asteroid.customName}\`` : asteroid.baseName}
        </AsteroidName>
        <div>
          {Number(Math.floor(4 * Math.PI * Math.pow(asteroid.radius / 1000, 2))).toLocaleString()} lots
        </div>
      </GraphicData>
    </Graphic>
  );
}

export default AsteroidGraphic;