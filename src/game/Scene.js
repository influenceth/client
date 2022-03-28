import { useEffect } from 'react';
import { useQueryClient, QueryClientProvider } from 'react-query';
import { Object3D, Vector3 } from 'three';
import { Canvas } from '@react-three/fiber';
import { useContextBridge, Stats } from '@react-three/drei';
import { getWeb3ReactContext } from '@web3-react/core';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import { TrackballModControls } from '~/components/TrackballModControls';
import Star from './scene/Star';
import Planets from './scene/Planets';
import Asteroids from './scene/Asteroids';
import Asteroid from './scene/Asteroid';
import SettingsManager from './scene/SettingsManager';
import constants from '~/lib/constants';

const glConfig = {
  shadows: true,
  camera: {
    fov: 75,
    near: 1000000,
    far: constants.MAX_SYSTEM_RADIUS * constants.AU * 2,
    position: [ 4 * constants.AU, 0, 1.5 * constants.AU ]
  },
  powerPreference: 'default',
  onCreated: (state) => {
    state.raycaster.params.Points = {
      near: 1000000,
      far: constants.MAX_SYSTEM_RADIUS * constants.AU * 2,
      threshold: 0.025 * constants.AU
    };
  }
};

const StyledContainer = styled.div`
  bottom: 0;
  position: absolute;
  top: 0;
  width: 100%;
`;

const Scene = (props) => {
  /**
   * Grab reference to queryClient to recreate QueryClientProvider within Canvas element
   * See: https://github.com/pmndrs/react-three-fiber/blob/master/markdown/api.md#gotchas
   */
  const queryClient = useQueryClient();

  // Use ContextBridge to make wallet available within canvas
  const ContextBridge = useContextBridge(getWeb3ReactContext());

  // Orient such that z is up, perpindicular to the stellar plane
  Object3D.DefaultUp = new Vector3(0, 0, 1);

  const zoomedFrom = useStore(s => s.asteroids.zoomedFrom);
  const setZoomedFrom = useStore(s => s.dispatchAsteroidZoomedFrom);
  const statsOn = useStore(s => s.graphics.stats);

  useEffect(() => {
    if (!zoomedFrom) {
      setZoomedFrom({
        scene: new Vector3(0, 0, 0),
        position: new Vector3(4 * constants.AU, 0, 1.5 * constants.AU),
        up: new Vector3(0, 0, 1)
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StyledContainer>
      {statsOn && (<Stats />)}
      <Canvas {...glConfig} >
        <ContextBridge>
          <SettingsManager />
          <QueryClientProvider client={queryClient} contextSharing={true}>
            <TrackballModControls maxDistance={10 * constants.AU}>
              <Star />
              <Planets />
              {/* TODO: restore
              <Asteroids />
              */}
              <Asteroid />
            </TrackballModControls>
          </QueryClientProvider>
        </ContextBridge>
      </Canvas>
      {false && /* TODO: remove debug */(
        <div style={{ position: 'fixed', bottom: 72, left: 0, }}>
          <div style={{ border: '1px solid white', padding: 4, background: '#222' }}>
            <canvas id="test_canvas" style={{ width: 0, height: 0, verticalAlign: 'bottom' }} />
          </div>
        </div>
      )}
      {false && /* TODO: remove debug */(
        <div id="debug_info" style={{ position: 'fixed', top: -1, left: 95, background: 'black', border: '1px solid white', padding: '8px 4px', fontSize: 11, minWidth: 60, textAlign: 'center' }} />
      )}
    </StyledContainer>
  );
};

export default Scene;
