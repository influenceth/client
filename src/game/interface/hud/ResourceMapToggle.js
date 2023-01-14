import { useCallback, useEffect } from 'react';
import styled from 'styled-components';
import {
  FaCubes as InfrastructureIcon
} from 'react-icons/fa';

import { ResourceIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import useStore from '~/hooks/useStore';
import useAsteroidAbundances from '~/hooks/useAsteroidAbundances';
import { LeftActionButton, Rule } from '../HUD';

const ResourceMapToggle = () => {
  const asteroidId = useStore(s => s.asteroids.origin);
  const showResourceMap = useStore(s => s.asteroids.showResourceMap);
  const zoomToPlot = useStore(s => s.asteroids.zoomToPlot);
  const dispatchResourceMap = useStore(s => s.dispatchResourceMap);

  const { data: asteroid } = useAsteroid(asteroidId);
  const asteroidAssets = useAsteroidAbundances(asteroid);

  const toggleResourceMode = useCallback((which) => {
    if (which) {
      dispatchResourceMap(asteroidAssets[0]?.resources[0]);
    } else {
      dispatchResourceMap();
    }
  }, [asteroidAssets, dispatchResourceMap]);

  // clear emissive map "on" setting if asteroid is not scanned
  // (this only really happens in dev with chain rebuild, but worth the sanity check)
  useEffect(() => {
    if (asteroid) {
      if (!asteroid.scanned && showResourceMap) {
        console.log('AST NOT SCANNED');
        dispatchResourceMap();
      }
    }
  }, [asteroid?.scanned, showResourceMap]);

  if (!(asteroid?.scanned && !zoomToPlot)) return null;
  return (
    <>
      <LeftActionButton
        active={!!showResourceMap}
        data-arrow-color="transparent"
        data-for="global"
        data-place="right"
        data-tip="Resource View"
        onClick={() => toggleResourceMode(true)}>
        <ResourceIcon />
      </LeftActionButton>
      <LeftActionButton
        active={!showResourceMap}
        data-arrow-color="transparent"
        data-for="global"
        data-place="right"
        data-tip="Infrastructure View"
        onClick={() => toggleResourceMode(false)}>
        <InfrastructureIcon />
      </LeftActionButton>
      <Rule visible />
    </>
  );
};

export default ResourceMapToggle;