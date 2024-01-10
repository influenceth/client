import { useCallback, useEffect, useMemo, useState } from 'react';
import { Entity } from '@influenceth/sdk';

import { LaunchShipIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';
import useCrewContext from '~/hooks/useCrewContext';
import useReadyAtWatcher from '~/hooks/useReadyAtWatcher';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import useShipDockingManager from '~/hooks/actionManagers/useShipDockingManager';

const isVisible = ({ crew, ship }) => {
  return crew && ship
    && ship.Control?.controller?.id === crew.id
    && ship._location.lotId  // on surface
};

const LaunchShip = ({ lot, onSetAction, _disabled }) => {
  const { crew } = useCrewContext();
  const { currentUndockingAction } = useShipDockingManager(crew?._location?.shipId);
  const { currentDeliveries } = useDeliveryManager({ destination: { label: Entity.IDS.SHIP, id: crew?._location?.shipId } });
  const crewedShip = useMemo(() => lot?.ships?.find((s) => s.id === crew?._location?.shipId), [crew?._location?.shipId, lot?.ships]);
  const ready = useReadyAtWatcher(crewedShip?.Ship?.readyAt);

  const handleClick = useCallback(() => {
    onSetAction('LAUNCH_SHIP', { shipId: crew?._location.shipId });
  }, []);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (!crewedShip) return 'ship is not crewed';
    if (!ready) return 'ship is busy';

    // disable if waiting on delivery
    const invReserved = crewedShip?.Inventories?.find((i) => i.reservedMass > 0)
      || currentDeliveries?.length > 0;
    if (invReserved) return 'delivery pending';
    return null;
  }, [_disabled, crewedShip, currentDeliveries, lot, ready]);

  return (
    <ActionButton
      label="Launch Ship"
      labelAddendum={disabledReason}
      flags={{
        disabled: disabledReason,
        loading: !!currentUndockingAction,
      }}
      icon={<LaunchShipIcon />}
      onClick={handleClick} />
  );
};

export default { Component: LaunchShip, isVisible };