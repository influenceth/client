import { useMemo } from 'react';
import styled from 'styled-components';
import { Asteroid, Inventory } from '@influenceth/sdk';

import useAsteroid from '~/hooks/useAsteroid';
import usePlot from '~/hooks/usePlot';
import useProjectionLayer from "~/hooks/useProjectionLayer";
import useStore from '~/hooks/useStore';
import { formatFixed } from '~/lib/utils';

const Tooltip = styled.div.attrs(props => ({
  style: {
    left: `${props.position?.x || 0}px`,
    top: `${props.position?.y || 0}px`,
  },
}))`
  background: navy;
  color: white;
  padding: 10px 20px;
  pointer-events: none;
  position: fixed;
  z-index: 1;
`;

const AbundanceTooltip = ({ plotId, position }) => {
  const asteroidId = useStore(s => s.asteroids.origin);
  const resourceId = useStore(s => s.asteroids.resourceMap?.active && s.asteroids.resourceMap?.selected);
  const { data: asteroid } = useAsteroid(asteroidId);

  const abundance = useMemo(() => {
    if (!(asteroid && plotId && resourceId)) return 0;
    return Asteroid.getAbundanceAtLot(
      asteroid.i,
      BigInt(asteroid.resourceSeed),
      Number(plotId),
      resourceId,
      asteroid.resources[resourceId]
    );
  }, [asteroid, plotId, resourceId]);

  if (!(asteroid && plotId && resourceId)) return null;
  return (
    <Tooltip position={position}>
      {asteroid ? `${Inventory.RESOURCES[resourceId].name}: ${formatFixed(100 * abundance, 1)}%` : 'Loading...'}
    </Tooltip>
  );
};

const ProjectionLayer = () => {
  const { projection } = useProjectionLayer();

  // TODO: throttle position updates by pixel

  return projection
    ? <AbundanceTooltip {...projection} />
    : null;
};

export default ProjectionLayer;
