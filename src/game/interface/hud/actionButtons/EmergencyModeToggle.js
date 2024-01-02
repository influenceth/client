import { useCallback, useMemo } from 'react';

import { EmergencyModeEnterIcon, EmergencyModeExitIcon } from '~/components/Icons';
import useShip from '~/hooks/useShip';
import useShipEmergencyManager from '~/hooks/actionManagers/useShipEmergencyManager';
import ActionButton from './ActionButton';
import useReadyAtWatcher from '~/hooks/useReadyAtWatcher';

const EmergencyModeToggle = ({ crew, onSetAction, _disabled }) => {
  const manager = useShipEmergencyManager();
  const { data: crewedShip } = useShip(crew?._location?.shipId);
  const ready = useReadyAtWatcher(crewedShip?.Ship?.readyAt);

  const handleClick = useCallback(() => {
    onSetAction('EMERGENCY_MODE_TOGGLE');
  }, [onSetAction]);

  const disabledReason = useMemo(() => {
    if (!crewedShip) return 'ship is not crewed';
    if (crewedShip?._location.lotId) return 'must be in orbit';
    if (!ready) return 'ship is busy';
    return null;
  }, [crewedShip, ready]);

  return (
    <ActionButton
      label={`${crewedShip?.Ship?.emergencyAt > 0 ? 'Exit' : 'Enter'} Emergency Mode`}
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason || undefined,
        loading: manager.isActivating || manager.isDeactivating,
      }}
      icon={crewedShip?.Ship?.emergencyAt > 0 ? <EmergencyModeExitIcon /> : <EmergencyModeEnterIcon />}
      onClick={handleClick} />
  );
};

export default EmergencyModeToggle;