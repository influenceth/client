import { useEffect, useState } from 'react';
import { Address, Inventory } from '@influenceth/sdk';

import { useBuildingAssets } from '~/hooks/useAssets';
import useAsteroid from '~/hooks/useAsteroid';
import useAuth from '~/hooks/useAuth';
import useConstructionManager from '~/hooks/useConstructionManager';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import actionButtons from './actionButtons';

const useActionButtons = () => {
  const { account } = useAuth();
  const buildings = useBuildingAssets();

  const asteroidId = useStore(s => s.asteroids.origin);
  const { lotId } = useStore(s => s.asteroids.lot || {});
  const resourceMap = useStore(s => s.asteroids.resourceMap);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const setAction = useStore(s => s.dispatchActionDialog);

  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(asteroidId);
  const { constructionStatus } = useConstructionManager(asteroidId, lotId);
  const { data: lot, isLoading: lotIsLoading } = useLot(asteroidId, lotId);
  const { crew } = useCrewContext();

  const [actions, setActions] = useState([]);


  // TODO: could reasonably have buttons determine own visibility and remove some redundant logic here
  // (the only problem is parent wouldn't know how many visible buttons there were)
  useEffect(() => {
    if (asteroidIsLoading || lotIsLoading) return;

    const a = [];
    if (asteroid) {
      if (!asteroid.owner) {
        a.push(actionButtons.PurchaseAsteroid);
      }
      if (!asteroid.scanned) {
        if (account && asteroid.owner && Address.areEqual(account, asteroid.owner)) {
          a.push(actionButtons.ScanAsteroid);
        }
      }
      a.push(actionButtons.SelectTravelDestination);
      if (asteroid.scanned && lot && crew && zoomStatus === 'in') {
        a.push(actionButtons.CoreSample);

        if (lot.occupier === crew.i) {
          if (constructionStatus === 'OPERATIONAL' && lot.building?.capableType) {
            const buildingAsset = buildings[lot.building.capableType];
            if (buildingAsset.capabilities.includes('extraction')) {
              a.push(actionButtons.Extract);
            }
          } else if (['PLANNED', 'UNDER_CONSTRUCTION', 'READY_TO_FINISH', 'FINISHING'].includes(constructionStatus)) {
            a.push(actionButtons.Construct);
          } else if (['READY_TO_PLAN', 'PLANNING'].includes(constructionStatus)) {
            a.push(actionButtons.PlanBuilding);
          }

          // NOTE: this will need to change once using contruction inventories, and when that happens, it
          //  is worth nothing that lot?.building?.inventories is undefined until it is used (this is
          //  probably worth addressing on the server)
          if (constructionStatus === 'OPERATIONAL' && Inventory.CAPACITIES[lot.building?.capableType || 0][1]) {
            a.push(actionButtons.SurfaceTransferOutgoing);
          }
          if ((lot.building?.deliveries || []).find((d) => d.status !== 'COMPLETE')) {
            a.push(actionButtons.SurfaceTransferIncoming);
          }

          if (['PLANNED', 'CANCELING'].includes(constructionStatus)) {
            a.push(actionButtons.UnplanBuilding);
          }
          if (['OPERATIONAL', 'DECONSTRUCTING'].includes(constructionStatus)) {
            a.push(actionButtons.Deconstruct);
          }
        } else if (!lot.occupier || constructionStatus === 'READY_TO_PLAN') {
          a.push(actionButtons.PlanBuilding);
        }
      }
    }

    setActions(a);
  }, [asteroid, constructionStatus, crew, lot, resourceMap?.active, !!resourceMap?.selected, zoomStatus]);

  return {
    actions,
    props: {
      asteroid,
      crew,
      lot,
      onSetAction: setAction,
      _disabled: asteroidIsLoading || lotIsLoading
    }
  }
};

export default useActionButtons;