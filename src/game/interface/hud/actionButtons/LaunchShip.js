import { useCallback, useEffect, useMemo, useState } from 'react';
import { Entity } from '@influenceth/sdk';

import { LaunchShipIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import useCrewContext from '~/hooks/useCrewContext';
import useReadyAtWatcher from '~/hooks/useReadyAtWatcher';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import useShipDockingManager from '~/hooks/actionManagers/useShipDockingManager';

const isVisible = ({ crew, ship }) => {
  return crew && ship
    && ship.Control?.controller?.id === crew.id
    && ship._location.lotId  // on surface
};

const LaunchShip = ({ asteroid, lot, onSetAction, _disabled, ...props }) => {
  const { crew } = useCrewContext();

  const crewedShip = useMemo(() => lot?.ships?.find((s) => s.id === crew?._location?.shipId), [crew?._location?.shipId]);
  const ship = useMemo(() => props.ship || crewedShip, [crewedShip, props.ship]);
  
  const { currentUndockingAction } = useShipDockingManager(ship?.id);
  const { currentDeliveries } = useDeliveryManager(ship?.id ? { destination: { label: Entity.IDS.SHIP, id: ship?.id } } : {});
  const shipReady = useReadyAtWatcher(ship?.Ship?.readyAt);

  const handleClick = useCallback(() => {
    onSetAction('LAUNCH_SHIP', { shipId: ship?.id });
  }, [ship?.id]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (ship?.id !== crewedShip?.id) return 'ship is not crewed';
    if (!shipReady) return 'ship is busy';

    // disable if waiting on delivery
    const invReserved = (ship?.Inventories || []).find((i) => i.reservedMass > 0)
      || currentDeliveries?.length > 0;
    if (invReserved) return 'delivery pending';
    return getCrewDisabledReason({ asteroid, crew });
  }, [_disabled, crew, crewedShip, ship, currentDeliveries, shipReady]);

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