import { useCallback, useEffect, useMemo, useState } from 'react';

import { LaunchShipIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';
import useCrewContext from '~/hooks/useCrewContext';
import useReadyAtWatcher from '~/hooks/useReadyAtWatcher';

const LaunchShip = ({ lot, onSetAction, _disabled }) => {
  const { crew } = useCrewContext();
  const crewedShip = useMemo(() => lot?.ships?.find((s) => s.id === crew?._location?.shipId), [crew?._location?.shipId, lot?.ships]);
  const ready = useReadyAtWatcher(crewedShip?.Ship?.readyAt);

  const handleClick = useCallback(() => {
    onSetAction('LAUNCH_SHIP', { shipId: crew?._location.shipId });
  }, []);

  // TODO: disable if waiting on delivery
  const disabledReason = useMemo(() => {
    if (!crewedShip) return 'ship is not crewed';
    if (!ready) return 'ship is busy';

    // TODO: should we use currentDeliveries here to capture pending?
    const invReserved = crewedShip?.Inventories?.find((i) => i.reservedMass > 0);
    if (invReserved) return 'delivery pending';
    return null;
  }, [crewedShip, lot, ready]);

  return (
    <ActionButton
      label="Launch Ship"
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason || undefined,
      }}
      icon={<LaunchShipIcon />}
      onClick={handleClick} />
  );
};

export default LaunchShip;