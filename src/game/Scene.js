import { useEffect, useMemo, useState } from 'react';
import { useQueryClient, QueryClientProvider } from 'react-query';
import { Object3D, Vector3 } from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { useContextBridge, Stats } from '@react-three/drei';
import styled from 'styled-components';

import { TrackballModControls } from '~/components/TrackballModControls';
import AuthContext from '~/contexts/AuthContext';
import ClockContext from '~/contexts/ClockContext';
import CrewContext from '~/contexts/CrewContext';
import useStore from '~/hooks/useStore';
import constants from '~/lib/constants';
import Star from './scene/Star';
import Planets from './scene/Planets';
import Asteroids from './scene/Asteroids';
import Asteroid from './scene/Asteroid';
import SettingsManager from './scene/SettingsManager';
import Postprocessor from './Postprocessor';
import WebsocketContext from '~/contexts/WebsocketContext';
import { GpuContextLostMessage, GpuContextLostReporter } from './GpuContextLost';

const glConfig = {
  antialias: true,
  shadows: true,
  camera: {
    fov: 75,
    near: 1000000,
    far: constants.MAX_SYSTEM_RADIUS * constants.AU * 2,
    position: [ 4 * constants.AU, 0, 1.5 * constants.AU ]
  },
  // pixelRatio: Math.min(window.devicePixelRatio, 2),
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

const WrappedScene = (props) => {
  const { clock, controls } = useThree();
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);

  // if three is started with frameloop == 'never', clock is not set to autoStart, so we need to set it
  useEffect(() => {
    if (clock && !clock.autoStart) clock.autoStart = true;
  }, []);

  // reset to "zoomed out" control settings if zoomed out to belt view
  useEffect(() => {
    if (!!controls && (zoomStatus === 'zooming-out' || zoomStatus === 'out')) {
      controls.maxDistance = 10 * constants.AU;
      controls.minDistance = 0.3 * constants.AU;
      controls.zoomSpeed = 1.2;
      controls.rotateSpeed = 1.0;
    }
  }, [!!controls, zoomStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  return !controls ? null : (
    <>
      <Star />
      <Planets />
      <Asteroids />
      <Asteroid />
    </>
  );
}

const Scene = (props) => {

  /**
   * Grab reference to queryClient to recreate QueryClientProvider within Canvas element
   * See: https://github.com/pmndrs/react-three-fiber/blob/master/markdown/api.md#gotchas
   */
  const queryClient = useQueryClient();

  // Use ContextBridge to make wallet available within canvas
  const ContextBridge = useContextBridge(
    AuthContext,
    ClockContext,
    CrewContext,
    WebsocketContext
  );

  // Orient such that z is up, perpindicular to the stellar plane
  Object3D.DefaultUp = new Vector3(0, 0, 1);

  const canvasStack = useStore(s => s.canvasStack); // TODO: this might be easier to manage in a dedicated context
  const zoomedFrom = useStore(s => s.asteroids.zoomedFrom);
  const setZoomedFrom = useStore(s => s.dispatchAsteroidZoomedFrom);
  const statsOn = useStore(s => s.graphics.stats);

  const [contextLost, setContextLost] = useState(false);
  const canvasStyle = useMemo(() => (contextLost ? { opacity: 0, pointerEvents: 'none' } : { zIndex: 0 }), [contextLost]);

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

  const frameloop = useMemo(() => canvasStack?.length === 0 ? 'always' : 'never', [canvasStack]);

  return (
    <StyledContainer>
      {statsOn && <Stats />}
      {contextLost && <GpuContextLostMessage />}
      <Canvas {...glConfig} frameloop={frameloop} style={canvasStyle}>
        <GpuContextLostReporter setContextLost={setContextLost} />
        <ContextBridge>
          <SettingsManager />
          <Postprocessor enabled={true} />
          <QueryClientProvider client={queryClient} contextSharing={true}>
            <TrackballModControls>
              <WrappedScene />
            </TrackballModControls>
          </QueryClientProvider>
        </ContextBridge>
      </Canvas>
      {false && /* TODO: remove debug */(
        <div style={{ position: 'fixed', bottom: 72, left: 0, zIndex: 10000 }}>
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
