import { useCallback, useEffect } from 'react';
import {FaCubes as InfrastructureIcon } from 'react-icons/fa';

import { ResourceIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import useStore from '~/hooks/useStore';
import useAsteroidAbundances from '~/hooks/useAsteroidAbundances';
import { LeftActionButton, Rule } from '../HUD';

const ResourceMapToggle = () => {
  const asteroidId = useStore(s => s.asteroids.origin);
  const resourceMap = useStore(s => s.asteroids.resourceMap);
  const zoomToPlot = useStore(s => s.asteroids.zoomToPlot);
  const dispatchResourceMapSelect = useStore(s => s.dispatchResourceMapSelect);
  const dispatchResourceMapToggle = useStore(s => s.dispatchResourceMapToggle);

  const { data: asteroid } = useAsteroid(asteroidId);
  const asteroidAssets = useAsteroidAbundances(asteroid);

  const toggleResourceMode = useCallback((which) => {
    if (which) {
      dispatchResourceMapSelect(resourceMap?.selected || asteroidAssets[0]?.resources[0]?.i);
      dispatchResourceMapToggle(true);
    } else {
      dispatchResourceMapToggle(false);
    }
  }, [asteroidAssets, dispatchResourceMapSelect, dispatchResourceMapToggle, resourceMap]);

  useEffect(() => {
    if (asteroid) {
      // if scanned but current resourcemap resource has zero abundance on this asteroid, switch to a present resource
      if (asteroid.scanned) {
        if (!(asteroidAssets || []).find((a) => a.resources.find((r) => Number(r.i) === resourceMap?.selected))) {
          dispatchResourceMapSelect(asteroidAssets[0]?.resources[0]?.i);
        };

      // else if not scanned but resourceMap is active, deselect (and deactivate)
      } else if(resourceMap?.active) {
        dispatchResourceMapSelect();
        dispatchResourceMapToggle(false);
      }
    }
  }, [asteroidAssets, resourceMap]);

  if (!(asteroid?.scanned && !zoomToPlot)) return null;
  return (
    <>
      <LeftActionButton
        active={resourceMap?.active}
        data-arrow-color="transparent"
        data-for="global"
        data-place="right"
        data-tip="Resource View"
        onClick={() => toggleResourceMode(true)}>
        <ResourceIcon />
      </LeftActionButton>
      <LeftActionButton
        active={!resourceMap?.active}
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