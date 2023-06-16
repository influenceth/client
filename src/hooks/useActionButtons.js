import { useEffect, useMemo, useState } from 'react';
import { Address, Inventory } from '@influenceth/sdk';

import { useBuildingAssets } from '~/hooks/useAssets';
import useAsteroid from '~/hooks/useAsteroid';
import useAsteroidShips from '~/hooks/useAsteroidShips';
import useAuth from '~/hooks/useAuth';
import useConstructionManager from '~/hooks/useConstructionManager';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import useShip from '~/hooks/useShip';
import useStore from '~/hooks/useStore';
import actionButtons from '../game/interface/hud/actionButtons';

const useActionButtons = () => {
  const { account } = useAuth();
  const buildings = useBuildingAssets();

  const asteroidId = useStore(s => s.asteroids.origin);
  const { lotId } = useStore(s => s.asteroids.lot || {});
  const resourceMap = useStore(s => s.asteroids.resourceMap);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomScene = useStore(s => s.asteroids.zoomScene);
  const openHudMenu = useStore(s => s.openHudMenu);
  const setAction = useStore(s => s.dispatchActionDialog);

  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(asteroidId);
  const { data: ships, isLoading: shipsLoading } = useAsteroidShips(asteroidId);
  const { constructionStatus } = useConstructionManager(asteroidId, lotId);
  const { data: lot, isLoading: lotIsLoading } = useLot(asteroidId, lotId);
  const { data: zoomedToShip, isLoading: shipIsLoading } = useShip(zoomScene?.type === 'SHIP' ? zoomScene.shipId : undefined);
  const { crew } = useCrewContext();

  const crewedShip = useMemo(() => {
    return (ships || []).find((s) => s.hasCrew);
  }, [ships]);
  
  const myLotShips = useMemo(() => {
    return lotId ? (ships || []).filter((s) => s.asteroid === asteroidId && s.lot === lotId && ['LAUNCHING','IN_PORT','ON_SURFACE'].includes(s.status) && s.isOwnedByMe) : [];
  }, [ships, asteroidId, lotId]);
  
  const [actions, setActions] = useState([]);

  // TODO: could reasonably have buttons determine own visibility and remove some redundant logic here
  // (the only problem is parent wouldn't know how many visible buttons there were)
  useEffect(() => {
    if (asteroidIsLoading || lotIsLoading || shipsLoading) return;

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

      } else if (zoomStatus === 'in') {
        // if i have a ship at the selected lot, offer "launch" button
        if (myLotShips?.length > 0) {
          a.push(actionButtons.LaunchShip); // TODO: disable if crew not on ship
        }

        // if my crew is on a ship in orbit on this asteroid offer "land" button
        // (may be disabled if this is not a light transport and not a spaceport)
        if (crewedShip?.status === 'IN_ORBIT' && crewedShip?.asteroid === asteroidId) {
          a.push(actionButtons.LandShip);
        }

        // if i am zoomed to my ship, i have selected a lot with my ship(s), or i have own a ship in orbit, offer "station on ship"
        if (
          (zoomedToShip && zoomedToShip.owner === crew?.i)
          || (lotId && ships && ships.find((s) => s.lot === lotId && s.owner === crew?.i && ['IN_PORT','ON_SURFACE'].includes(s.status)))
          || (!lotId && ships && ships.find((s) => s.owner === crew?.i && s.status === 'IN_ORBIT'))
        ) {

          a.push(actionButtons.StationCrewAsPilots);
        }

        // if i am zoomed to another's ship or i have selected a lot with others' ship(s)
        if (
          (zoomedToShip && zoomedToShip.owner !== crew?.i)
          || (lotId && ships && ships.find((s) => s.lot === lotId && s.owner !== crew?.i && ['IN_PORT','ON_SURFACE'].includes(s.status)))
        ) {
          a.push(actionButtons.StationCrewAsPassengers);
        }
      }
      if (openHudMenu === 'BELT_PLAN_FLIGHT') {
        a.push(actionButtons.SetCourse);
      }
      if (asteroid.scanned && lot && crew && zoomStatus === 'in') {
        a.push(actionButtons.CoreSample);

        // potentially-public/shared buildings
        if (constructionStatus === 'OPERATIONAL' && lot.building?.capableType) {
          const buildingAsset = buildings[lot.building.capableType];
          if (buildingAsset.capabilities.includes('habitation')) {
            a.push(actionButtons.StationCrew);
          }
        }

        // buildings i own
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
  }, [asteroid, constructionStatus, crew, lot, openHudMenu, resourceMap?.active, !!resourceMap?.selected, ships, zoomStatus]);

  return {
    actions,
    props: {
      asteroid,
      crew,
      lot,
      onSetAction: setAction,
      _disabled: asteroidIsLoading || lotIsLoading || shipsLoading
    }
  }
};

export default useActionButtons;