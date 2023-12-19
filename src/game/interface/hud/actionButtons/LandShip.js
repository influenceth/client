import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dock, Ship } from '@influenceth/sdk';

import { LandShipIcon } from '~/components/Icons';
import ActionButton from './ActionButton';
import useCrewContext from '~/hooks/useCrewContext';
import useReadyAtWatcher from '~/hooks/useReadyAtWatcher';
import useShip from '~/hooks/useShip';

const LandShip = ({ lot, onSetAction, _disabled }) => {
  const { crew } = useCrewContext();
  const { data: crewedShip } = useShip(crew?._location?.shipId)
  const ready = useReadyAtWatcher(crewedShip?.readyAt);
  
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
    if (!crewedShip) return 'ship is not crewed';
    if (!ready) return 'ship is busy';
    if (lot) {
      if (lot?.building) {
        if (!lot.building?.Dock) return 'building has no dock';
        if (lot.building.Dock.dockedShips >= Dock.TYPES[lot.building.Dock.dockType].cap) return 'dock is full';
      } else if (!Ship.TYPES[crewedShip.Ship.shipType]?.landing) return 'ship type requires a dock';
    }
    return null;
  }, [crewedShip, ready]);

  return (
    <ActionButton
      label={`${lot?.building?.Dock ? 'Dock' : 'Land'} Ship`}
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason || undefined,
      }}
      icon={<LandShipIcon />}
      onClick={handleClick} />
  );
};

export default LandShip;