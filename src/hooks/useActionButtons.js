import { useEffect, useState } from 'react';
import { Asteroid, Building, Delivery, Inventory, Processor, Ship } from '@influenceth/sdk';

import useAsteroid from '~/hooks/useAsteroid';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import useShip from '~/hooks/useShip';
import useStore from '~/hooks/useStore';
import actionButtons from '../game/interface/hud/actionButtons';
import useShipCrews from './useShipCrews';
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
  const { data: crewedShip, isLoading: crewedShipIsLoading } = useShip(crew?._location?.shipId);
  const { data: zoomedToShip, isLoading: zoomedShipIsLoading } = useShip(zoomScene?.type === 'SHIP' ? zoomScene.shipId : undefined);

  // set ship IF zoomed to ship or zoomed to lot that can only contain one ship (i.e. not a spaceport)
  const ship = zoomedToShip || (lot && lot.building?.Building?.buildingType !== Building.IDS.SPACEPORT ? lot.Ships?.[0] : null);
  const { data: crewsOnShip } = useShipCrews(ship?.id);  // TODO: isLoading?  

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

          // TODO: pilotedShip?
          // if there is a crewedShip and it is selected (or no other ship is selected)
          if (crewedShip && (!ship || crewedShip.id === ship.id)) {

            // if ship on surface and the lot is selected (or no other lot is selected)
            if (crew._location.lotId && (!lotId || lotId === crew._location.lotId)) {
              a.push(actionButtons.LaunchShip);
            }

            // else, if ship is in orbit
            else if (!crew._location.lotId) {
              a.push(actionButtons.LandShip);
            }
          }

          // if ship (or single-ship lot) is selected
          if (ship) {
            // TODO: check in buttons that crew is on asteroid
            //  AND check that both in orbit or both on surface

            // if i own a ship, can pilot it
            if (ship.Control.controller.id === crew.id) {
              a.push(actionButtons.StationCrewAsPilots);

            // if i don't own it, can ride it
            } else {
              a.push(actionButtons.StationCrewAsPassengers);
            }

            // if my crew is on ship, can eject
            if (crew._location.shipId === ship.id) {
              a.push(actionButtons.EjectCrew);
            }

            // if i own the ship and there are other crews on the ship
            if (ship.Control.controller.id === crew.id && crewsOnShip?.length > 0) {
              a.push(actionButtons.EjectGuestCrew);
            }

            // if i am piloting the ship and it is eligible to enter or leave emergency mode
            if (crew._location?.shipId === ship.id && crew.id === ship.Control.controller.id) {

              // if in emergency mode or ship has < 10% propellant, can toggle emergency mode
              const propellantInventory = ship.Inventories.find((i) => i.slot === Ship.TYPES[ship.Ship.shipType].propellantSlot);
              const propellantInventoryMassMax = Inventory.TYPES[propellantInventory?.inventoryType]?.massConstraint;
              if (ship.Ship.operatingMode === Ship.MODES.EMERGENCY || propellantInventory.mass <= 0.1 * propellantInventoryMassMax) {
                a.push(actionButtons.EmergencyModeToggle);
              }

              // if in emergency mode, can generate
              if (ship.Ship.operatingMode === Ship.MODES.EMERGENCY) {
                a.push(actionButtons.EmergencyModeGenerate);
              }
            }
          }

          // if lot is selected
          if (lot) {

            // if asteroid has been scanned, can core sample
            if (asteroid.Celestial.scanStatus === Asteroid.SCAN_STATUSES.RESOURCE_SCANNED) {
              a.push(actionButtons.CoreSample);
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

                  if (lot.building.Extractor?.length > 0) {
                    a.push(actionButtons.Extract);
                  }

                  // TODO: these should be different
                  //  (or a single "Refine" button should have dynamic icons based on processor type)
                  if (lot.building.Processor?.processorType === Processor.IDS.REFINERY) {
                    a.push(actionButtons.Refine);
                  } else if (lot.building.Processor?.processorType === Processor.IDS.FACTORY) {
                    a.push(actionButtons.Refine);
                  } else if (lot.building.Processor?.processorType === Processor.IDS.BIOREACTOR) {
                    a.push(actionButtons.Refine);
                  } else if (lot.building.Processor?.processorType === Processor.IDS.SHIPYARD) {
                    a.push(actionButtons.Refine);
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
            if ((lot.building || ship || {}).Inventories?.find((i) => i.status === Inventory.STATUSES.AVAILABLE)) {
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