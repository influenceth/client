import { useCallback, useMemo } from 'react';
import { Dock, Ship } from '@influenceth/sdk';

import { LandShipIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useReadyAtWatcher from '~/hooks/useReadyAtWatcher';
import useShip from '~/hooks/useShip';
import useShipDockingManager from '~/hooks/actionManagers/useShipDockingManager';

import ActionButton, { getCrewDisabledReason } from './ActionButton';

const isVisible = ({ asteroid, crew, crewedShip, lot }) => {
  if (!crew || !crewedShip || !asteroid) return false;
  if (crewedShip.Control?.controller?.id !== crew.id) return false; // not piloting a ship
  if (crewedShip._location?.asteroidId !== asteroid.id) return false; // not at asteroid
  if (crewedShip._location?.lotId) return false; // on surface already
  if (lot?.building && !lot?.building?.Dock) return false;
  return true;
};

const LandShip = ({ asteroid, lot, onSetAction, _disabled }) => {
  const { crew } = useCrewContext();
  const { currentDockingAction } = useShipDockingManager(crew?._location?.shipId);
  const { data: crewedShip } = useShip(crew?._location?.shipId)
  const ready = useReadyAtWatcher(crewedShip?.Ship?.readyAt);

  const handleClick = useCallback(() => {
    onSetAction(
      'LAND_SHIP',
      {
        shipId: crew?._location.shipId,
        preselect: { destinationLotId: lot?.id }
      }
    );
  }, [crew?._location.shipId, lot?.id]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (!crewedShip) return 'ship is not crewed';
    if (!ready) return 'ship is in flight';
    // if no lot selected, can select from dialog
    if (lot) {
      // trying to dock
      if (lot?.building) {
        if (!Ship.TYPES[crewedShip.Ship.shipType]?.docking) return 'ship type cannot dock';
        if (!lot?.building?.Dock) return 'building has no dock';
        if (lot.building.Dock.dockedShips >= Dock.TYPES[lot.building.Dock.dockType].cap) return 'dock is full';

      // trying to land
      } else {
        if (!Ship.TYPES[crewedShip.Ship.shipType]?.landing) return 'ship type requires a dock';
      }
    }
    if (crewedShip.Ship.emergencyAt > 0) return 'in emergency mode';
    return getCrewDisabledReason({ asteroid, crew, requireSurface: false });
  }, [_disabled, crewedShip, lot, ready]);

  return (
    <ActionButton
      label={`${lot?.building?.Dock ? 'Dock' : 'Land'} Ship`}
      labelAddendum={disabledReason}
      flags={{
        disabled: disabledReason,
        loading: !!currentDockingAction,
      }}
      icon={<LandShipIcon />}
      onClick={handleClick} />
  );
};

export default { Component: LandShip, isVisible };