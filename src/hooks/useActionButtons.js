import { useEffect, useMemo, useState } from 'react';
import { Asteroid, Building, Inventory, Ship } from '@influenceth/sdk';
import cloneDeep from 'lodash/cloneDeep';

import useAsteroid from '~/hooks/useAsteroid';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import useShip from '~/hooks/useShip';
import useStationedCrews from '~/hooks/useStationedCrews';
import useStore from '~/hooks/useStore';
import { locationsArrToObj } from '~/lib/utils';
import actionButtons from '../game/interface/hud/actionButtons';
import useAuth from './useAuth';

// if selected asteroid (any zoom)
//  - purchase asteroid
//  - scan asteroid
//  - if BELT VIEW
//    - select travel destination
//    - if BELT_FLIGHT_PLAN open
//      - set course  ** TODO: this should be a button on the tray so we know if ship is valid, etc

// if !selected DIFFERENT ship
//  - if i own selected ship OR if i am piloting any ship at lot, offer "launch"
//  - if i am piloting any ship in orbit, offer "land"

// if selected ship (and not IN_FLIGHT)
//  - if my crew can pilot, offer "station crew as pilots" button
//  - if my crew can ride, offer "station crew as passengers" button
//  - if i can eject my crew, offer "eject crew" button
//  - if i can eject guests from ship, offer "eject guest crew" button
//  - if i can toggle emergency mode, offer "toggle emergency mode" button
//  - if i can generate emergency propellant, offer "generate emergency mode" button

// if selected lot (asteroid zoom or closer)
//  - offer core sample button
//  - if OPERATIONAL building,
//    - StationCrew, Extract, Refine's
//    - if i own the building...
//      - eject stationed crew
//  - if PLANNED building
//    - offer "construct" button
//  - if READY_TO_PLAN building, offer "plan" button
//  - if there is a squatter, offer eject crew button
//  - if my crew is on this lot, offer "eject my crew" button
//  - if there is a delivery to/from this lot, offer "transfer to lot" button

// if selected building or selected ship
//  - if can station, offer "station crew"
//  - if has unlocked inventory, offer "surface transfer"
//  - if has incoming delivery, offer "surface transfer"

const useActionButtons = () => {
  const asteroidId = useStore(s => s.asteroids.origin);
  const lotId = useStore(s => s.asteroids.lot);
  const resourceMap = useStore(s => s.asteroids.resourceMap);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomScene = useStore(s => s.asteroids.zoomScene);
  const openHudMenu = useStore(s => s.openHudMenu);
  const setAction = useStore(s => s.dispatchActionDialog);

  // account
  const { account } = useAuth();

  // crew
  const { crew } = useCrewContext();

  // asteroid-level
  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(asteroidId);

  // lot-level
  const { data: lot, isLoading: lotIsLoading } = useLot(lotId);
  const { constructionStatus } = useConstructionManager(lotId); // TODO: could potentially pass in building id here if helpful

  // ship
  const { data: crewedShip, isLoading: crewedShipIsLoading } = useShip(crew?._location?.shipId);  // TODO: do we need this?
  const { data: zoomedToShip, isLoading: zoomedShipIsLoading } = useShip(zoomScene?.type === 'SHIP' ? zoomScene.shipId : undefined);

  // actionable ship
  const lotShip = useMemo(() => {
    let ship = null;

    // if zoomed to ship
    if (zoomedToShip) ship = zoomedToShip;
    // if surface ship on lot
    else if (lot?.surfaceShip) ship = lot.surfaceShip;

    // "shortcuts" -- these ships are of implicit interest, but not explicitly selected in this case
    // if my crew is on a ship on this lot
    else if (crewedShip && crewedShip._location?.lotId === lot?.id) ship = crewedShip;

    // if there is only one owned ship on the lot
    if (!ship) {
      const lotOwnedShips = (lot?.ships || []).filter((s) => s.Control.controller.id === crew?.id);
      if (lotOwnedShips?.length === 1) ship = lotOwnedShips[0]; // if only one owned ship, show it
    }

    // some of these sources don't have location set
    if (ship && !ship._location) {
      ship = cloneDeep(ship);
      ship._location = locationsArrToObj(ship.Location.locations || []);
    }

    return ship;
  }, [zoomedToShip, crewedShip, lot, crew?.id]);

  const { data: crewsOnShip } = useStationedCrews(lotShip?.id);  // TODO: isLoading?
  const guestCrewsOnShip = useMemo(() => crewsOnShip?.filter((c) => c.id !== crew?.id), [crewsOnShip, crew?.id]);

  const [actions, setActions] = useState([]);

  // TODO: should this be useMemo?
  // TODO: could reasonably have buttons determine own visibility and remove some redundant logic here
  // (the only problem is parent wouldn't know how many visible buttons there were)
  useEffect(() => {
    if (asteroidIsLoading || lotIsLoading || crewedShipIsLoading || zoomedShipIsLoading) return;

    const a = [];
    if (asteroid) {

      if (!asteroid.Nft?.owner) {
        a.push(actionButtons.PurchaseAsteroid);
      }

      if (asteroid.Nft?.owner === account) {
        if (crew?.id && asteroid.Control?.controller?.id !== crew?.id) {
          a.push(actionButtons.ControlAsteroid);
        }
      }

      if (asteroid.Celestial.scanStatus < Asteroid.SCAN_STATUSES.RESOURCE_SCANNED) {
        if (asteroid.Control?.controller?.id && asteroid.Control.controller.id === crew?.id) {
          a.push(actionButtons.ScanAsteroid);
        }
      }

      if (zoomStatus === 'out') {
        a.push(actionButtons.SelectTravelDestination);

        // TODO: this should probably only be a button in the BELT_PLAN_FLIGHT tray
        //  so we know a valid ship is selected in the dropdown of that menu
        if (crew && openHudMenu === 'BELT_PLAN_FLIGHT') {
          // a.push(actionButtons.SetCourse); // TODO: add back, not implemented yet
        }
      }

      if (zoomStatus === 'in') {

        // if operational habitat, can recruit there
        if (account && lot && lot.building?.Building?.buildingType === Building.IDS.HABITAT && constructionStatus === 'OPERATIONAL') {
          a.push(actionButtons.RecruitCrewmate);
        }

        // all other actions require a crew
        if (crew) {

          // if my crew is on a ship in orbit, can land if landable
          if (crewedShip && !crewedShip._location?.lotId) {
            // (if no lot is selected or if a usable lot is selected)
            if (!lot || Ship.TYPES[crewedShip.Ship.shipType].landing || lot?.building?.Dock) {
              // (if not zoomed to a different ship)
              if (!(zoomedToShip && zoomedToShip.id !== crewedShip.id)) {
                a.push(actionButtons.LandShip);
              }
            }
          }
          
          if (lotShip && [Ship.STATUSES.AVAILABLE, Ship.STATUSES.IN_FLIGHT].includes(lotShip.Ship?.status)) {

            // TODO: check in buttons that crew is on asteroid
            //  AND check that both in orbit or both on surface


            // if i control the selectedShip (and it is on the surface), can show launch button (may be disabled)
            if (lotShip.Control.controller.id === crew.id && lotShip._location.lotId) {
              a.push(actionButtons.LaunchShip);
            }

            // if crew is on ship, show ejection options
            if (crew._location.shipId === lotShip.id) {
              a.push(actionButtons.EjectCrew);
            
            // else (my crew is not on this ship), allow to station there as pilots or passengers
            } else {
              a.push(lotShip.Control.controller.id === crew.id ? actionButtons.StationCrewAsPilots : actionButtons.StationCrewAsPassengers);
            }

            // if i own the ship...
            if (lotShip.Control.controller.id === crew.id) {
              // ...and there are other crews on the ship, can eject them
              if (guestCrewsOnShip?.length > 0) {
                a.push(actionButtons.EjectGuestCrew);
              }

              // ... and if i am piloting the ship...
              if (crew._location?.shipId === lotShip.id) {

                // ... if in emergency mode or ship has < 10% propellant, can toggle emergency mode
                const propellantInventory = lotShip.Inventories.find((i) => i.slot === Ship.TYPES[lotShip.Ship.shipType].propellantSlot);
                const propellantInventoryMassMax = Inventory.TYPES[propellantInventory?.inventoryType]?.massConstraint;
                if (lotShip.Ship.emergencyAt > 0 || propellantInventory.mass <= 0.1 * propellantInventoryMassMax) {
                  a.push(actionButtons.EmergencyModeToggle);
                }

                // ... if in emergency mode, can generate
                if (lotShip.Ship.emergencyAt > 0) {
                  a.push(actionButtons.EmergencyModeGenerate);
                }
              }
            }
          }

          // if lot is selected
          if (lot) {

            // if asteroid has been scanned, can core sample... but only offer as main button if
            // no building or the building is an extractor (can still zoom to lot and do through
            // resources panel)
            if (asteroid.Celestial.scanStatus === Asteroid.SCAN_STATUSES.RESOURCE_SCANNED) {
              if (!lot.building || lot.building.Extractors?.length > 0) {
                a.push(actionButtons.CoreSample);
              }
            }

            // if there is a building
            // TODO: resourceScan is probably not required for building (i.e. habitat on AP is pre-resource-scan)
            if (lot.building) {

              // if it's operational...
              if (constructionStatus === 'OPERATIONAL') {

                // potentially public functions...
                if (lot.building.Station) {

                  // if my crew is stationed in building, can eject
                  if (crew?._location.buildingId === lot.building.id) {
                    a.push(actionButtons.EjectCrew);

                  // else, can station my crew
                  } else {
                    // console.log('crew loc', crew)
                    a.push(actionButtons.StationCrew);
                  }
                }
              }

              // if i control the building
              if (lot.building.Control?.controller?.id === crew.id) {

                // if it's operational
                if (constructionStatus === 'OPERATIONAL') {
                  if (lot.building.Station) { // TODO: hide/disable if no guests
                    a.push(actionButtons.EjectGuestCrew);
                  }

                  if (lot.building.Extractors?.length > 0) {
                    a.push(actionButtons.Extract);
                  }

                  if (lot.building.DryDocks?.length > 0) {
                    a.push(actionButtons.AssembleShip);
                  }

                  // TODO: these should be different
                  //  (or a single "Refine" button should have dynamic icons based on processor type)
                  const processors = lot.building.Processors || [];
                  if (processors.length) {
                    a.push(actionButtons.Processors);
                  }
                }

                // contruction flows
                if (['PLANNING'].includes(constructionStatus)) {
                  a.push(actionButtons.PlanBuilding);
                }
                if (['PLANNED', 'UNDER_CONSTRUCTION', 'READY_TO_FINISH', 'FINISHING'].includes(constructionStatus)) {
                  a.push(actionButtons.Construct);
                }
                if (['OPERATIONAL', 'DECONSTRUCTING'].includes(constructionStatus)) {
                  a.push(actionButtons.Deconstruct);
                }
                if (['PLANNED', 'CANCELING'].includes(constructionStatus)) {
                  a.push(actionButtons.UnplanBuilding);
                }
              }

            // else (no building), can plan one if asteroid has been scanned
            } else if (constructionStatus === 'READY_TO_PLAN' && asteroid.Celestial.scanStatus === Asteroid.SCAN_STATUSES.RESOURCE_SCANNED) {
              // TODO: cannot plan a building under a ship (disable)
              a.push(actionButtons.PlanBuilding);
            }

            // if this lot or ship has an unlocked inventory, can transfer things from it
            if ((lot.building || lotShip || {}).Inventories?.find((i) => i.status === Inventory.STATUSES.AVAILABLE)) {
              a.push(actionButtons.SurfaceTransferOutgoing);
            }

            // if this lot or ship has incoming deliveries, link to those deliveries
            // TODO: these deliveries should be filtered to only those that are to/from something user controls
            // TODO: commented this out 
            // if ((lot.delivery || []).find((d) => d.delivery.Delivery.status !== Delivery.STATUSES.COMPLETE)) {
            //   a.push(actionButtons.SurfaceTransferIncoming);
            // }
          }
        }
      }
    }

    setActions(a);
  }, [lotShip?.id, asteroid, constructionStatus, crew, lot, openHudMenu, resourceMap?.active, !!resourceMap?.selected, zoomStatus]);

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