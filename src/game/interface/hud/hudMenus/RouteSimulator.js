import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { KeplerianOrbit } from '@influenceth/sdk';
import { Vector3 } from 'three';

import ClockContext from '~/contexts/ClockContext';
import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import constants from '~/lib/constants';
import { minDeltaVSolver } from '~/lib/lambertSolver';
import { sampleAsteroidOrbit } from '~/lib/geometryUtils';
import useWebWorker from '~/hooks/useWebWorker';
import { useRef } from 'react';

const resolution = 1;
const minDelay = 0;
const maxDelay = 365;
const minTof = Math.max(resolution, 1);
const maxTof = minTof + 365;

const maxDeltaV = 2 * 48000;  // 48000 is planned max

const deltaVColor = (deltaV) => {
  return deltaV > maxDeltaV ? '0,0,0' :
    (deltaV > 0.9 * maxDeltaV ? '64,0,0' : (
      (deltaV > 0.8 * maxDeltaV ? '96,0,0' : (
        (deltaV > 0.6 * maxDeltaV ? '128,0,0' : (
          (deltaV > 0.4 * maxDeltaV ? '255,0,0' : (
            (deltaV > 0.2 * maxDeltaV ? '255,128,0' : (
              (deltaV > 0.1 * maxDeltaV ? '255,196,0' : (
                (deltaV > 0 ? '255,255,0' : '255,255,255')
              ))
            ))
          ))
        ))
      ))
    ))
};

const PorkchopWrapper = styled.div`
  border: 1px solid #333;
  position: relative;
`;
const Porkchop = ({ originPath, destinationPath, minDelay, maxDelay, minTof, maxTof, ...props }) => {
  const { processInBackground } = useWebWorker();
  const [canvasRefIsSet, setCanvasRefIsSet] = useState();
  const [loading, setLoading] = useState(true);
  
  const canvasRef = useRef();

  const setCanvasRef = useCallback((canvas) => {
    canvasRef.current = canvas;
    setCanvasRefIsSet(true);
  }, []);

  useEffect(() => {
    if (!canvasRefIsSet) return;
    if (!originPath || !destinationPath) return;
    setLoading(true);
    
    const width = maxDelay - minDelay + 1;
    const height = maxTof - minTof + 1;

    const p2 = performance.now();

    let canvasCtx = canvasRef.current.getContext('2d');
    canvasCtx.clearRect(0, 0, width, height);

    let batchesProcessed = 0;
    let expectedBatches = width;
    for (let delay = minDelay; delay <= maxDelay; delay++) {
      processInBackground({
        topic: 'calculatePorkchop',
        data: {
          originPath,
          destinationPath,
          minDelay: delay,
          maxDelay: delay,
          minTof,
          maxTof,
        }
      }, ({ deltaVs }) => {
        // console.log('drawing', delay, performance.now() - p2);

        // TODO: preprocess to minimize # of rectangles to draw (at least per column)
        // TODO: don't need to draw black areas if clear in advance
        const col = delay - minDelay;
        let currentRect = null;
        let pixelColor;

        for (let i in deltaVs) {
          canvasCtx.fillStyle = `rgba(${deltaVColor(deltaVs[i])},1)`;
          canvasCtx.fillRect(col, height - i, 1, 1);

          pixelColor = deltaVColor(deltaVs[i]);
          if (currentRect) {
            // if same color, extend current rect
            if (currentRect.color === pixelColor) {
              currentRect.height++;
              continue;

            // else, draw previous rect because changing colors
            } else {
              canvasCtx.fillStyle = `rgba(${currentRect.color},1)`;
              canvasCtx.fillRect(col, currentRect.start, 1, -currentRect.height);
            }
          }

          // if get here, start a new rect
          currentRect = {
            color: pixelColor,
            start: height - i,
            height: 1
          }
        }

        // draw remaining rectangle
        if (currentRect) {
          canvasCtx.fillStyle = `rgba(${currentRect.color},1)`;
          canvasCtx.fillRect(col, currentRect.start, 1, -currentRect.height);
        }

        batchesProcessed++;
        if (batchesProcessed === expectedBatches) {
          console.log('porkchop ready in', performance.now() - p2);
          setLoading(false);
        }
      })
    }
  }, [canvasRefIsSet, originPath, destinationPath]);

  return (
    <PorkchopWrapper loading={loading}>
      <canvas ref={setCanvasRef} height={345} width={345} />
    </PorkchopWrapper>
  );
};




const RouteSimulator = () => {
  const { coarseTime } = useContext(ClockContext);
  
  const originId = useStore(s => s.asteroids.origin);
  const destinationId = useStore(s => s.asteroids.destination);
  const dispatchReorientCamera = useStore(s => s.dispatchReorientCamera);
  const timeOverride = useStore(s => s.timeOverride);

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











  // TODO:
  //  - envmap for buildings



  // TODO:
  // address color splits as represented
  // selection reticule
  //  + labels beneath
  //      departure, tof, arrival (relative to "now"),
  //      deltav, propellant
  // draw selection
  // "impossible" message

  // action dialogs?








  









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

  const sampleOrbital = useCallback((orbital, minOffset, maxOffset, increment) => {
    const positions = [];
    const velocities = [];
    const orbit = new KeplerianOrbit(orbital);
    for (let delay = minOffset; delay < maxOffset + 1; delay += increment) {
      const p = orbit.getPositionAtTime(baseTime + delay)
      positions[delay] = new Vector3(p.x, p.y, p.z);
      positions[delay].multiplyScalar(constants.AU);

      // set velocity of previous based on this position
      if (positions[delay - increment]) {
        velocities[delay - increment] = (new Vector3()).subVectors(
          positions[delay],
          positions[delay - increment]
        );
        velocities[delay - increment].divideScalar(increment * 86400);
      }
    }
    return { positions, velocities };
  }, [baseTime]);

  

  // TODO: definitely do this in a worker
  // const calculatePorkchop = useCallback(async () => {
  //   if (!origin || !destination) return;
  //   const p1 = performance.now();
  //   const originPath = sampleOrbital(
  //     origin.orbital,
  //     minDelay,
  //     maxDelay,
  //     resolution
  //   );
  //   const destinationPath = sampleOrbital(
  //     destination.orbital,
  //     minDelay + minTof,
  //     maxDelay + maxTof,
  //     resolution
  //   );
  //   console.log('time to calc trajectories', performance.now() - p1);

  //   const p2 = performance.now();    

  //   const G = 6.6743015e-11; // N m2 / kg2
  //   const m = 0.86 * 1.98847e30; // kg  // TODO: mass of adalia (and probably gravitational constant should be in sdk)
  //   const Gm = G * m;
  //   const lamberts = [];
  //   for (let delay = minDelay; delay <= maxDelay; delay += resolution) {
  //     const originPosition = originPath.positions[delay];
  //     const originVelocity = originPath.velocities[delay];
  //     for (let tof = minTof; tof <= maxTof; tof += resolution) {
  //       const destinationPosition = destinationPath.positions[delay + tof];
  //       const destinationVelocity = destinationPath.velocities[delay + tof];
  //       if (originVelocity && destinationVelocity) {
  //         const { v1, deltaV } = await minDeltaVSolver(
  //           Gm,
  //           originPosition.toArray(),
  //           destinationPosition.toArray(),
  //           tof * 86400,  // tof is in days
  //           originVelocity.toArray(),
  //           destinationVelocity.toArray(),
  //         );
  //         lamberts.push({ delay, tof, v1, deltaV });
  //       }
  //     }
  //   }
  //   setSolutions(lamberts);
  //   console.log('time to calc solutions', performance.now() - p2);
  // }, [origin, destination]);

  // const paths = useMemo(() => {
  //   if (!solutions) return []
  //   console.log('solutions', solutions);
  //   return [];
  // }, [solutions]);

  const getOpacity = useCallback((deltaV) => {
    return deltaV > maxDeltaV ? '0,0,0' :
      (deltaV > 0.9 * maxDeltaV ? '64,0,0' : (
        (deltaV > 0.8 * maxDeltaV ? '96,0,0' : (
          (deltaV > 0.6 * maxDeltaV ? '128,0,0' : (
            (deltaV > 0.4 * maxDeltaV ? '255,0,0' : (
              (deltaV > 0.2 * maxDeltaV ? '255,128,0' : (
                (deltaV > 0.1 * maxDeltaV ? '255,196,0' : (
                  (deltaV > 0 ? '255,255,0' : '255,255,255')
                ))
              ))
            ))
          ))
        ))
      ))
    return Math.max(0, Math.min(1 - (deltaV / 100000), 1));
  }, []);

  return (
    <>
      {originPath && destinationPath && (
        <Porkchop
          originPath={originPath}
          destinationPath={destinationPath}
          minDelay={minDelay}
          maxDelay={maxDelay}
          minTof={minTof}
          maxTof={maxTof}
        />
      )}

{/* 
      <svg width={75} height={75} viewBox="0 0 100 100" style={{ border: '1px solid #CCC' }}>
        {solutions
        .filter((s) => s.deltaV < 1e6)
        .map(({ delay, tof, deltaV }) => (
          <rect
            key={`${delay}_${tof}`}
            x={100 * delay / maxDelay}
            y={100 * (maxTof - tof) / maxTof}
            width={pathDimX}
            height={pathDimY}
            data-dv={deltaV}
            fill={`rgba(${getOpacity(deltaV)},1)`} />
        ))}
      </svg>
      */}
    </>
  );
};

export default RouteSimulator;
