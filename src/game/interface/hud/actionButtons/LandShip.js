import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dock, Ship } from '@influenceth/sdk';

import { LandShipIcon } from '~/components/Icons';
import ActionButton from './ActionButton';
import useCrewContext from '~/hooks/useCrewContext';
import useReadyAtWatcher from '~/hooks/useReadyAtWatcher';
import useShip from '~/hooks/useShip';
import useShipDockingManager from '~/hooks/actionManagers/useShipDockingManager';

const isVisible = ({ asteroid, crew, ship }) => {
  return crew && ship
    && ship.Control?.controller?.id === crew.id
    // TODO: if in orbit around asteroid?
    // && asteroid?.id === ship._location.asteroidId
    && !ship._location.lotId  // not on surface
};

const LandShip = ({ lot, onSetAction, _disabled }) => {
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
    return null;
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