import { useCallback, useMemo } from 'react';
import { Permission, Station } from '@influenceth/sdk';

import { StationCrewIcon, StationPassengersIcon } from '~/components/Icons';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import useStationCrewManager from '~/hooks/actionManagers/useStationCrewManager';

const isVisible = ({ crew, building, ship }) => {
  return crew && (
    (
      building?.Station
      && crew._location?.buildingId !== building.id
    )
    ||
    (
      ship?.Station
      && crew._location?.shipId !== ship.id
    )
  );
};

const StationCrew = ({ asteroid, crew, lot, ship, onSetAction, _disabled }) => {
  const stationEntity = useMemo(() => ship || lot?.building, [ship, lot?.building]);
  const { currentStationing } = useStationCrewManager(stationEntity);

  const crewIsController = stationEntity?.Control?.controller?.id === crew?.id;
  const handleClick = useCallback(() => {
    onSetAction(crewIsController ? 'STATION_CREW' : 'STATION_CREW_AS_GUESTS');
  }, [crewIsController, onSetAction]);

  const disabledReason = useMemo(() => {
    if (_disabled || !stationEntity) return 'loading...';
    if (!currentStationing) {
      const stationConfig = Station.TYPES[stationEntity.Station.stationType];
      if (stationConfig.cap && stationEntity.Station.population + crew._crewmates.length >= stationConfig.cap) {
        return 'station is full';
      }
      return getCrewDisabledReason({ asteroid, crew, permission: Permission.IDS.STATION_CREW, permissionTarget: stationEntity, requireSurface: false });
    }
    return '';
  }, [_disabled, asteroid, crew, crewIsController, currentStationing, stationEntity]);

  const buttonParams = useMemo(() => {
    if (ship) {
      if (crewIsController) {
        return {
          label: 'Station Flight Crew',
          icon: <StationCrewIcon />
        }
      } else {
        return {
          label: 'Station Crew as Passengers',
          icon: <StationPassengersIcon />
        }
      }
    }
    return {
      label: 'Station Crew',
      icon: <StationCrewIcon />
    }
  }, [crewIsController, ship]);

  return (
    <ActionButton
      {...buttonParams}
      labelAddendum={disabledReason}
      flags={{
        disabled: disabledReason,
        loading: !!currentStationing
      }}
      onClick={handleClick} />
  );
};

export default { Component: StationCrew, isVisible };
