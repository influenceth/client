import { useQueryClient, QueryClientProvider } from 'react-query';
import { Object3D, Vector3 } from 'three';
import { Canvas } from '@react-three/fiber';
import styled from 'styled-components';

import { TrackballModControls } from '~/components/TrackballModControls';
import constants from '~/constants';
import Star from './scene/Star';
import Asteroids from './scene/Asteroids';

const StyledContainer = styled.div`
  bottom: 0;
  position: absolute;
  top: 0;
  width: 100%;
`;

const Scene = (props) => {
  // Orient such that z is up, perpindicular to the stellar plane
  Object3D.DefaultUp = new Vector3(0, 0, 1);

  const config = {
    camera: {
      fov: 75,
      near: 1000000,
      far: constants.MAX_SYSTEM_RADIUS * constants.AU * 2,
      position: [ 4 * constants.AU, 0, 1.5 * constants.AU ]
    },
    shadows: true,
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
      <Canvas {...config} >
        <QueryClientProvider client={queryClient} contextSharing={true}>
          <TrackballModControls maxDistance={10 * constants.AU}>
            <Star />
            <Asteroids />
          </TrackballModControls>
        </QueryClientProvider>
      </Canvas>
    </StyledContainer>
  );
};

export default Scene;
