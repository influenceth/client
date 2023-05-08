import { useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import ClockContext from '~/contexts/ClockContext';
import useAsteroid from '~/hooks/useAsteroid';
import useStore from '~/hooks/useStore';
import { sampleAsteroidOrbit } from '~/lib/geometryUtils';
import { formatFixed, orbitTimeToGameTime } from '~/lib/utils';
import Porkchop from '~/components/Porkchop';

const InfoRow = styled.div`
  align-items: center;
  border-bottom: 1px solid #222;
  display: flex;
  flex-direction: row;
  height: 32px;
  line-height: 0;
  label {
    text-transform: uppercase;
  }
`;

const Value = styled.span`
  flex: 1;
  text-align: right;
  ${p => p.note && `
    &:before {
      content: "${p.note}";
      color: ${p.theme.colors.main};
      font-size: 75%;
      margin-right: 8px;
    }
  `}
`;

const resolution = 1;
const minDelay = 0;
const maxDelay = 365;
const minTof = Math.max(resolution, 1);
const maxTof = minTof + 365;

const maxDeltaV = 48000;//1.2 * 48000;  // 48000 is planned max

const RouteSimulator = () => {
  const { coarseTime } = useContext(ClockContext);
  
  const originId = useStore(s => s.asteroids.origin);
  const destinationId = useStore(s => s.asteroids.destination);
  const dispatchReorientCamera = useStore(s => s.dispatchReorientCamera);
  const timeOverride = useStore(s => s.timeOverride);
  const travelSolution = useStore(s => s.asteroids.travelSolution);

  const { data: origin } = useAsteroid(originId);
  const { data: destination } = useAsteroid(destinationId);

  const [baseTime, setBaseTime] = useState();

  useEffect(() => {
    dispatchReorientCamera(true);
    return () => {
      dispatchReorientCamera(true);
    }
  }, []);

  useEffect(() => {
    if (!baseTime || Math.abs(timeOverride?.speed) <= 1) {
      setBaseTime(coarseTime);
    }
  }, [coarseTime]);

  const { originPath, destinationPath } = useMemo(() => {
    if (!origin || !destination || !baseTime) return {};
    // TODO: could do each of these in a worker as well
    //  (might as well move to porkchop at that point)
    const p1 = performance.now();
    const paths = {
      originPath: sampleAsteroidOrbit(
        baseTime,
        origin.orbital,
        minDelay,
        maxDelay,
        resolution
      ),
      destinationPath: sampleAsteroidOrbit(
        baseTime,
        destination.orbital,
        minDelay + minTof,
        maxDelay + maxTof,
        resolution
      )
    };
    console.log('time to sample trajectories', performance.now() - p1);
    return paths;
  }, [baseTime, origin, destination]);

  return (
    <>
      {originPath && destinationPath && (
        <Porkchop
          baseTime={baseTime}
          originPath={originPath}
          destinationPath={destinationPath}
          minDelay={minDelay}
          maxDelay={maxDelay}
          maxDeltaV={maxDeltaV}
          minTof={minTof}
          maxTof={maxTof}
          size={345}
        />
      )}

      {travelSolution && (
        <>
          <InfoRow>
            <label>Delta-V Required</label>
            <Value note="">
              {formatFixed(travelSolution.deltaV, 1)} m/s
            </Value>
          </InfoRow>

          <InfoRow>
            <label>Departure</label>
            <Value note={`${formatFixed(travelSolution.departureTime - coarseTime, 1)}h from now`}>
              {orbitTimeToGameTime(travelSolution.departureTime).toLocaleString(undefined, { minimumFractionDigits: 2 })} DAYS
            </Value>
          </InfoRow>

          <InfoRow>
            <label>Arrival</label>
            <Value note={`${formatFixed(travelSolution.arrivalTime - coarseTime, 1)}h from now`}>
              {orbitTimeToGameTime(travelSolution.arrivalTime).toLocaleString(undefined, { minimumFractionDigits: 2 })} DAYS
            </Value>
          </InfoRow>
        </>
      )}
    </>
  );
};

export default RouteSimulator;
