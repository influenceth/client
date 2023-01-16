import { useCallback, useEffect, useRef } from 'react';
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
  const mapResourceId = useStore(s => s.asteroids.mapResourceId);
  const zoomToPlot = useStore(s => s.asteroids.zoomToPlot);
  const dispatchResourceMap = useStore(s => s.dispatchResourceMap);

  const { data: asteroid } = useAsteroid(asteroidId);
  const asteroidAssets = useAsteroidAbundances(asteroid);

  const toggleResourceMode = useCallback((which) => {
    if (which) {
      dispatchResourceMap(asteroidAssets[0]?.resources[0]?.i);
    } else {
      dispatchResourceMap();
    }
  }, [asteroidAssets, dispatchResourceMap]);

  useEffect(() => {
    if (asteroid) {
      // if asteroid is loaded and resourceMap is on, make sure it is a valid selection
      // if asteroid is not actually scanned OR if asteroid has zero abundance for selection
      if (mapResourceId) {
        if (asteroid.scanned) {
          if (asteroidAssets.find((a) => a.resources.find((r) => Number(r.i) === mapResourceId))) {
            return;
          }
        }
        dispatchResourceMap();
      }
    }
  }, [asteroidAssets, mapResourceId]);

  if (!(asteroid?.scanned && !zoomToPlot)) return null;
  return (
    <>
      <LeftActionButton
        active={!!mapResourceId}
        data-arrow-color="transparent"
        data-for="global"
        data-place="right"
        data-tip="Resource View"
        onClick={() => toggleResourceMode(true)}>
        <ResourceIcon />
      </LeftActionButton>
      <LeftActionButton
        active={!mapResourceId}
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