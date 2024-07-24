import { useCallback, useMemo } from 'react';
import { Entity, Permission } from '@influenceth/sdk';

import { EjectPassengersIcon } from '~/components/Icons';
import useEjectCrewManager from '~/hooks/actionManagers/useEjectCrewManager';
import useStationedCrews from '~/hooks/useStationedCrews';
import theme from '~/theme';
import ActionButton, { getCrewDisabledReason } from './ActionButton';

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
const EjectGuestCrew = ({ asteroid, blockTime, crew, lot, ship, onSetAction, dialogProps = {}, _disabled }) => {
  const [station, entityId] = useMemo(() => {
    const station = ship || lot?.building;
    const entityId = { id: station.id, label: station.label };
    return [station, entityId];
  }, [ship, lot]);

  const { currentEjections } = useEjectCrewManager(entityId);
  const { data: allStationedCrews } = useStationedCrews(entityId);
  const allGuestCrews = useMemo(() => (allStationedCrews || []).filter((c) => c.id !== crew?.id), [allStationedCrews, crew?.id]);

  const handleClick = useCallback(() => {
    onSetAction('EJECT_GUEST_CREW', { origin: station, ...dialogProps });
  }, [station, onSetAction, dialogProps]);

  const activeEjections = useMemo(() => {
    return currentEjections?.filter((e) => e.vars.ejected_crew.id === crew?.id);
  }, [currentEjections, crew?.id]);

  // Differentiate between a Habitat and a ship
  const actionLabel = useMemo(() => {
    return `Force Eject ${entityId?.label === Entity.IDS.SHIP ? 'Passenger' : 'Resident'} Crew`;
  }, [entityId]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (allGuestCrews?.length === 0) return 'no guests';
    if (station) {
      if (dialogProps?.guestId) {
        const targetCrew = allGuestCrews.find((c) => c.id === dialogProps?.guestId);
        const perm = Permission.getPolicyDetails(station, targetCrew, blockTime)[Permission.IDS.STATION_CREW];
        if ((perm && (perm.crewStatus === 'controller' || perm.crewStatus === 'granted'))) return 'guest has permission';
      } else {
        const atLeastOneCrewIsEjectable = allGuestCrews.find((c) => {
          const perm = Permission.getPolicyDetails(station, c, blockTime)[Permission.IDS.STATION_CREW];
          return !(perm && (perm.crewStatus === 'controller' || perm.crewStatus === 'granted'));
        });
        if (!atLeastOneCrewIsEjectable) return 'all guests have permission';
      }
    }

    // TODO: does controller need to be on asteroid? on entity?
    return getCrewDisabledReason({ crew });
  }, [_disabled, allGuestCrews, asteroid, blockTime, crew, station]);

  return (
    <ActionButton
      label={actionLabel}
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