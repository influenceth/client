import { useCallback, useMemo, useEffect } from 'react';
import { Asteroid } from '@influenceth/sdk';

import { SetCourseIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import useShipTravelManager from '~/hooks/actionManagers/useShipTravelManager';
import useTravelSolutionIsValid from '~/hooks/useTravelSolutionIsValid';
import useAsteroid from '~/hooks/useAsteroid';

const isVisible = ({ openHudMenu, /*asteroid, crew, ship, zoomStatus*/ }) => {
  return openHudMenu === 'BELT_PLAN_FLIGHT';
  // crew && (
  //   (asteroid && zoomStatus === 'out') || (
  //     ship
  //     && ship.Control?.controller?.id === crew.id
  //     && !ship._location.lotId  // in orbit
  //   )
  // );
};

const SetCourse = ({ asteroid, crew, ship, onSetAction, _disabled }) => {
  const { currentTravelAction, travelStatus } = useShipTravelManager(crew?._location?.shipId);
  const travelSolutionIsValid = useTravelSolutionIsValid();
  const travelSolution = useStore(s => s.asteroids.travelSolution);
  const { data: destination } = useAsteroid(travelSolution?.destinationId);

  const handleClick = useCallback(() => {
    onSetAction('SET_COURSE', { travelSolution });
  }, [travelSolution]);

  const validDestination = useMemo(() => {
    return destination?.Celestial?.scanStatus >= Asteroid.SCAN_STATUSES.SURFACE_SCANNED;
  }, [destination]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (!crew?._location?.shipId && crew?.Ship?.emergencyAt === 0) return 'crew is not on ship';
    if (travelStatus === 'READY') {
      if (!travelSolution) return 'no travel solution';
      if (travelSolution._isSimulation) return 'simulated solution';
      if (travelSolution.originId !== crew?._location?.asteroidId) return 'invalid travel origin';
      if (!travelSolutionIsValid) return 'invalid travel solution';
      if (ship?.Ship?.transitDeparture > 0) return 'ship is in flight';
      if (ship?._location?.lotId) return 'ship is docked';
      if (!validDestination) return 'destination not scanned';
      return getCrewDisabledReason({ crew });
    }
    return '';
  }, [_disabled, asteroid, crew, ship, travelSolution, travelSolutionIsValid]);

  return (
    <ActionButton
      label="Set Course"
      labelAddendum={disabledReason}
      flags={{
        attention: crew && travelStatus === 'READY' && !disabledReason,
        disabled: disabledReason,
        loading: travelStatus !== 'READY',
        finishTime: currentTravelAction?.finishTime
      }}
      icon={<SetCourseIcon />}
      onClick={handleClick} />
  );
};

export default { Component: SetCourse, isVisible };