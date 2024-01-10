import { useCallback, useMemo } from 'react';

import { EjectPassengersIcon } from '~/components/Icons';
import useEjectCrewManager from '~/hooks/actionManagers/useEjectCrewManager';
import theme from '~/theme';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import useStationedCrews from '~/hooks/useStationedCrews';

const isVisible = ({ crew, building, ship }) => {
  // TODO: ...and there are other crews in station (guestCrewsOnShip exists)
  //  - hide if policy does not allow guests?
  if (crew) {
    if (ship && !!ship.Station) {
      return ship.Control.controller.id === crew.id;
    }
    if (building && !!building.Station) {
      return building.Control.controller.id === crew.id;
    }
  }
  return false;
};

// NOTE: this is "eject guest(s)"
// (can eject guests from ship or building i control)
const EjectGuestCrew = ({ asteroid, crew, onSetAction, _disabled }) => {
  const { currentEjections } = useEjectCrewManager(crew?.Location?.location);
  const { data: allStationedCrews } = useStationedCrews(crew?.Location?.location);
  const allGuestCrews = useMemo(() => allStationedCrews?.filter((c) => c.id !== crew?.id), [allStationedCrews, crew?.id]);

  const handleClick = useCallback(() => {
    onSetAction('EJECT_GUEST_CREW');
  }, [onSetAction]);

  const activeEjections = useMemo(() => {
    return currentEjections?.filter((e) => e.vars.ejected_crew.id === crew?.id);
  }, [currentEjections, crew?.id]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (allGuestCrews?.length === 0) return 'no guests';
    // TODO: does controller need to be on asteroid? on entity?
    return getCrewDisabledReason({ crew });
  }, [_disabled, allGuestCrews, asteroid, crew]);

  return (
    <ActionButton
      label="Force Eject Passenger Crew"
      labelAddendum={disabledReason}
      flags={{
        disabled: disabledReason,
        loading: activeEjections?.length > 0
      }}
      icon={<EjectPassengersIcon />}
      onClick={handleClick}
      overrideColor={theme.colors.red} />
  );
};

export default { Component: EjectGuestCrew, isVisible };