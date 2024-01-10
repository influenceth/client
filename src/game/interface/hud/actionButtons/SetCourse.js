import { useCallback, useMemo } from 'react';

import { SetCourseIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import useShipTravelManager from '~/hooks/actionManagers/useShipTravelManager';

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
  const { travelStatus } = useShipTravelManager(crew?._location?.shipId);
  const travelSolution = useStore(s => s.asteroids.travelSolution);
  
  const handleClick = useCallback(() => {
    onSetAction('SET_COURSE', { travelSolution });
  }, [travelSolution]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (!crew?._location?.shipId) return 'crew is not on ship';
    if (travelStatus === 'READY') {
      if (!travelSolution) return 'no travel solution';
      if (travelSolution.invalid) return 'invalid travel solution';
      if (travelSolution.originId !== crew?._location?.asteroidId) return 'invalid travel origin';
      if (ship?.Ship?.transitDeparture > 0) return 'ship is in flight';
      if (ship?._location?.lotId) return 'ship is docked';
      return getCrewDisabledReason({ asteroid, crew });
    }
    return '';
  }, [_disabled, asteroid, crew, ship, travelSolution?.invalid]);

  return (
    <ActionButton
      label="Set Course"
      labelAddendum={disabledReason}
      flags={{
        attention: crew && travelSolution && !travelSolution.invalid,
        disabled: disabledReason,
      }}
      icon={<SetCourseIcon />}
      onClick={handleClick} />
  );
};

export default { Component: SetCourse, isVisible };