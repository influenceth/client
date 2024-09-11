import { useCallback, useMemo } from '~/lib/react-debug';

import { EjectMyCrewIcon } from '~/components/Icons';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import useEjectCrewManager from '~/hooks/actionManagers/useEjectCrewManager';

const isVisible = ({ crew, building, ship }) => {
  if (crew) {
    if (ship) {
      // if my crew is on it, do i still need to check that status is available?
      return crew._location.shipId === ship.id;
    }
    if (building) {
      // if my crew is on it, do i still need to check that has Station component?
      return crew?._location.buildingId === building.id;
    }
  }
  return false;
};

// NOTE: this is "eject self"
// (can eject self from ship or building, whether own it or not)
const EjectCrew = ({ crew, ship, onSetAction, _disabled }) => {
  const { currentEjections } = useEjectCrewManager(crew?.Location?.location);
  const handleClick = useCallback(import.meta.url, () => {
    onSetAction('EJECT_CREW');
  }, [onSetAction]);

  const currentEjection = useMemo(import.meta.url, () => {
    return currentEjections?.find((e) => e.vars.ejected_crew.id === crew?.id);
  }, [currentEjections, crew?.id]);

  const disabledReason = useMemo(import.meta.url, () => {
    if (_disabled) return 'loading...';
    if (ship?.Ship?.emergencyAt > 0) return 'emergency mode';
    return getCrewDisabledReason({ crew });
  }, [_disabled, crew]);

  return (
    <ActionButton
      label="Eject My Crew"
      labelAddendum={disabledReason}
      flags={{
        disabled: disabledReason,
        loading: !!currentEjection,
      }}
      icon={<EjectMyCrewIcon />}
      onClick={handleClick} />
  );
};

export default { Component: EjectCrew, isVisible };