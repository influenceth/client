import { useEffect, useState } from 'react';
import { Address } from '@influenceth/sdk';

import { useBuildingAssets } from '~/hooks/useAssets';
import useAsteroid from '~/hooks/useAsteroid';
import useAuth from '~/hooks/useAuth';
import useConstructionManager from '~/hooks/useConstructionManager';
import useCrew from '~/hooks/useCrew';
import usePlot from '~/hooks/usePlot';
import useStore from '~/hooks/useStore';
import actionButtons from './actionButtons';

const useActionButtons = () => {
  const { account } = useAuth();
  const buildings = useBuildingAssets();

  const asteroidId = useStore(s => s.asteroids.origin);
  const { plotId } = useStore(s => s.asteroids.plot || {});
  const resourceMap = useStore(s => s.asteroids.resourceMap);
  const setAction = useStore(s => s.dispatchActionDialog);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);

  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(asteroidId);
  const { constructionStatus } = useConstructionManager(asteroidId, plotId);
  const { data: plot, isLoading: plotIsLoading } = usePlot(asteroidId, plotId);
  const { crew } = useCrew();

  const [actions, setActions] = useState([]);


  // TODO: could reasonably have buttons determine own visibility and remove some redundant logic here
  // (the only problem is parent wouldn't know how many visible buttons there were)
  useEffect(() => {
    if (asteroidIsLoading || plotIsLoading) return;

    const a = [];
    if (asteroid) {
      if (!asteroid.owner) {
        a.push(actionButtons.PurchaseAsteroid);
      }
      if (!asteroid.scanned) {
        if (account && asteroid.owner && Address.areEqual(account, asteroid.owner)) {
          a.push(actionButtons.ScanAsteroid);
        }
      } else if (plot && crew && zoomStatus === 'in') {
        if (resourceMap?.active && resourceMap?.selected) {
          a.push(actionButtons.NewCoreSample);
          a.push(actionButtons.ImproveCoreSample);
        }

        if (plot.occupier === crew.i) {
          if (constructionStatus === 'OPERATIONAL' && plot.building?.capableType) {
            const buildingAsset = buildings[plot.building.capableType];
            if (buildingAsset.capabilities.includes('extraction')) {
              a.push(actionButtons.Extract);
            }
          } else if (['PLANNED', 'UNDER_CONSTRUCTION', 'READY_TO_FINISH', 'FINISHING'].includes(constructionStatus)) {
            a.push(actionButtons.Construct);
          } else if (['READY_TO_PLAN', 'PLANNING'].includes(constructionStatus)) {
            a.push(actionButtons.PlanBuilding);
          }

          if (constructionStatus === 'OPERATIONAL' && plot?.building?.inventories) {
            a.push(actionButtons.SurfaceTransfer);
          }

          if (['PLANNED', 'CANCELING'].includes(constructionStatus)) {
            a.push(actionButtons.UnplanBuilding);
          }
          if (['OPERATIONAL', 'DECONSTRUCTING'].includes(constructionStatus)) {
            a.push(actionButtons.Deconstruct);
          }
        } else if (!plot.occupier || constructionStatus === 'READY_TO_PLAN') {
          a.push(actionButtons.PlanBuilding);
        }
      }
    }

    setActions(a);
  }, [asteroid, constructionStatus, crew, plot, resourceMap?.active, !!resourceMap?.selected, zoomStatus]);

  return {
    actions,
    props: {
      asteroid,
      crew,
      plot,
      onSetAction: setAction,
      _disabled: asteroidIsLoading || plotIsLoading
    }
  }
};

export default useActionButtons;