import { useQueryClient, QueryClientProvider } from 'react-query';
import { Object3D, Vector3, sRGBEncoding } from 'three';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import styled from 'styled-components';

import { TrackballModControls } from '~/components/TrackballModControls';
import Star from './scene/Star';
import Planets from './scene/Planets';
import Asteroids from './scene/Asteroids';
import SettingsManager from './scene/SettingsManager';
import constants from '~/constants';

const StyledContainer = styled.div`
  bottom: 0;
  position: absolute;
  top: 0;
  width: 100%;
`;

const Scene = (props) => {
  // Orient such that z is up, perpindicular to the stellar plane
  Object3D.DefaultUp = new Vector3(0, 0, 1);

  const glConfig = {
    shadows: true,
    camera: {
      fov: 75,
      near: 1000000,
      far: constants.MAX_SYSTEM_RADIUS * constants.AU * 2,
      position: [ 4 * constants.AU, 0, 1.5 * constants.AU ]
    },
    onCreated: (state) => {
      state.raycaster.params.Points = {
        near: 1000000,
        far: constants.MAX_SYSTEM_RADIUS * constants.AU * 2,
        threshold: 0.025 * constants.AU
      };
    }
  };

  /**
   * Grab reference to queryClient to recreate QueryClientProvider within Canvas element
   * See: https://github.com/pmndrs/react-three-fiber/blob/master/markdown/api.md#gotchas
   */
  const queryClient = useQueryClient();

  return (
    <StyledContainer>
      {Number(process.env.REACT_APP_FPS) === 1 && (<Stats />)}
      <Canvas {...glConfig} >
        <SettingsManager />
        <QueryClientProvider client={queryClient} contextSharing={true}>
          <TrackballModControls maxDistance={10 * constants.AU}>
            <Star />
            <Planets />
            <Asteroids />
          </TrackballModControls>
        </QueryClientProvider>
      </Canvas>
    </StyledContainer>
  );
};

export default Scene;
