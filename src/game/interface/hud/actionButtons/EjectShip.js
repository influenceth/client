import { useCallback, useMemo } from 'react';
import { Permission } from '@influenceth/sdk';

import { LaunchShipIcon } from '~/components/Icons';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import useShipDockingManager from '~/hooks/actionManagers/useShipDockingManager';
import theme from '~/theme';

const isVisible = ({ crew, building, lot, ship }) => {
  if (crew && ship && crew?.id !== ship?.Control?.controller?.id) {
    // if someone else's ship is in my building...
    if (ship.Location?.location?.uuid === building?.uuid && crew?.id === building?.Control?.controller?.id) {
      return true;
    }
    // if someone else's ship is on my lot...
    if (ship.Location?.location?.uuid === lot?.uuid && crew?.id === lot?.Control?.controller?.id) {
      return true;
    }
  }
  return false;
};

const EjectShip = ({ accountAddress, asteroid, crew, lot, ship, onSetAction, _disabled }) => {
  const { currentUndockingAction } = useShipDockingManager(ship?.id);
  const handleClick = useCallback(() => {
    onSetAction('LAUNCH_SHIP', { shipId: ship?.id });
  }, [onSetAction, ship?.id]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (lot?.building) {
      // cannot force eject if ship has permission to be there
      // NOTE: do not need to check on lot perms since done implicitly by lot controller check
      const perm = Permission.getPolicyDetails(lot?.building, accountAddress, ship?.Control?.controller?.id)[Permission.IDS.DOCK_SHIP];
      if (perm.crewStatus === 'controller' || perm.crewStatus === 'granted') return 'access restricted';
    }
    return getCrewDisabledReason({ accountAddress, asteroid, crew, requireSurface: false });
  }, [_disabled, accountAddress, asteroid, crew]);

  return (
    <ActionButton
      label="Force Launch Ship"
      overrideColor={theme.colors.error}
      labelAddendum={disabledReason}
      flags={{
        disabled: disabledReason,
        loading: !!currentUndockingAction,
      }}
      icon={<LaunchShipIcon />}
      onClick={handleClick} />
  );
};

export default { Component: EjectShip, isVisible };