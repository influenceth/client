import { useEffect, useMemo, useState } from 'react';
import { Address, Inventory } from '@influenceth/sdk';

import { useBuildingAssets } from '~/hooks/useAssets';
import useAsteroid from '~/hooks/useAsteroid';
import useAuth from '~/hooks/useAuth';
import useConstructionManager from '~/hooks/useConstructionManager';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import actionButtons from './actionButtons';

// TODO: need a ships hook probably
//  but for now, since don't know structure of that data...
const ships = [{
  i: 123,
  type: 1,
  status: 'ON_SURFACE', // IN_FLIGHT, IN_ORBIT, LAUNCHING, LANDING, ON_SURFACE
  asteroid: 1000,
  lot: 123,
  hasCrew: true
}];

const useActionButtons = () => {
  const { account } = useAuth();
  const buildings = useBuildingAssets();

  const asteroidId = useStore(s => s.asteroids.origin);
  const { lotId } = useStore(s => s.asteroids.lot || {});
  const resourceMap = useStore(s => s.asteroids.resourceMap);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const openHudMenu = useStore(s => s.openHudMenu);
  const setAction = useStore(s => s.dispatchActionDialog);

  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(asteroidId);
  const { constructionStatus } = useConstructionManager(asteroidId, lotId);
  const { data: lot, isLoading: lotIsLoading } = useLot(asteroidId, lotId);
  const { crew } = useCrewContext();

  const crewedShip = useMemo(() => {
    return ships.find((s) => s.hasCrew);
  }, [ships]);

  const lotShips = useMemo(() => {
    return lotId ? ships.filter((s) => s.asteroid === asteroidId && s.lot === lotId) : [];
  }, [ships, asteroidId, lotId]);
  

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
      if (zoomStatus === 'out') {
        a.push(actionButtons.SelectTravelDestination);
        if (openHudMenu === 'BELT_PLAN_FLIGHT') {
          a.push(actionButtons.SetCourse);
        }
      } else if (zoomStatus === 'in') {
        if (lotShips?.length > 0) {
          a.push(actionButtons.LaunchShip);
        } else if (crewedShip?.status === 'IN_ORBIT' && crewedShip?.asteroid === asteroidId) {
          a.push(actionButtons.LandShip);
        }
      }
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
  }, [asteroid, constructionStatus, crew, lot, openHudMenu, resourceMap?.active, !!resourceMap?.selected, zoomStatus]);

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