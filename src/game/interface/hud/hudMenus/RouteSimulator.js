import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { KeplerianOrbit } from '@influenceth/sdk';
import { useThrottle } from '@react-hook/throttle';
import { Vector3 } from 'three';

import ClockContext from '~/contexts/ClockContext';
import useAsteroid from '~/hooks/useAsteroid';
import useStore from '~/hooks/useStore';
import useWebWorker from '~/hooks/useWebWorker';
import constants from '~/lib/constants';
import { minDeltaVSolver } from '~/lib/lambertSolver';
import { sampleAsteroidOrbit } from '~/lib/geometryUtils';
import theme from '~/theme';

// TODO: move to sdk
const G = 6.6743015e-11; // N m2 / kg2
const m = 1.7033730830877265e30; // kg  // TODO: mass of adalia (and probably gravitational constant should be in sdk)
const Gm = G * m;

const resolution = 1;//0.25;
const minDelay = 0;
const maxDelay = 365;
const minTof = Math.max(resolution, 1);
const maxTof = minTof + 365;

const maxDeltaV = 48000;//1.2 * 48000;  // 48000 is planned max

const colors = [
  [
    'rgb(0,0,0)',
    'rgb(64,0,0)',
    'rgb(96,0,0)',
    'rgb(128,0,0)',
    'rgb(255,0,0)',
    'rgb(255,128,0)',
    'rgb(255,196,0)',
    'rgb(255,255,0)',
  ],
  [
    '#000000',
    '#800060',
    '#800080',
    '#600080',
    '#400080',
    '#200080',
    '#000080',
    '#002080',
    '#004080',
    '#006080',
    '#008080',
  ],
  [
    '#000000',
    '#99006e',
    '#800080',
    '#560073',
    '#340073',
    '#00146b',
    '#003f6b',
    '#007369',
    '#377300',
    '#807c00',
    '#805300',
  ],
][1];

const bands = colors.reverse().map((c, i) => ({
  start: maxDeltaV * i * 1 / colors.length,
  end: i === colors.length - 1 ? undefined : maxDeltaV * (i + 1) * 1 / colors.length,
  color: c
}));

const deltaVColor = (deltaV) => {
  return bands.find((b) => (
    b.start <= deltaV
    && (!b.end || b.end > deltaV)
  )).color;


  // return deltaV > maxDeltaV ? '0,0,0' :
  //   (deltaV > 0.9 * maxDeltaV ? '64,0,0' : (
  //     (deltaV > 0.8 * maxDeltaV ? '96,0,0' : (
  //       (deltaV > 0.6 * maxDeltaV ? '128,0,0' : (
  //         (deltaV > 0.4 * maxDeltaV ? '255,0,0' : (
  //           (deltaV > 0.2 * maxDeltaV ? '255,128,0' : (
  //             (deltaV > 0.1 * maxDeltaV ? '255,196,0' : (
  //               (deltaV > 0 ? '255,255,0' : '255,255,255')
  //             ))
  //           ))
  //         ))
  //       ))
  //     ))
  //   ))
};

const PorkchopWrapper = styled.div`
  border: 1px solid #333;
  overflow: hidden;
  position: relative;
`;

const Selector = styled.svg`
  height: 200%;
  left: 0;
  margin-left: -100%;
  margin-top: -100%;
  opacity: 0.5;
  pointer-events: none;
  position: absolute;
  top: 0;
  transition: opacity 250ms ease;
  width: 200%;
  z-index: 1;

  &:last-child {
    opacity: 1;
  }
`;
const Reticule = ({ center, selected }) => {
  const size = 2000;
  const reticuleWidth = 60;
  const reticuleStroke = 5;
  const centerDotRadius = 6;
  const reticuleColor = 'white';
  const lineColor = 'rgba(255,255,255,0.6)';
  const crosshairSize = 15;

  if (!center) return null;
  return (
    <Selector
      viewBox={`0 0 ${size} ${size}`}
      selected={selected}
      style={{
        left: `${100 * center.x}%`,
        top: `${100 * center.y}%`,
      }}>
      <path
        d={`
          M 0 ${size / 2}
          H ${(size - reticuleWidth) / 2}
          m ${reticuleWidth} 0
          H ${size}

          M ${size / 2} 0
          V ${(size - reticuleWidth) / 2}
          m 0 ${reticuleWidth}
          V ${size}
        `}
        stroke={lineColor}
        strokeWidth={3} />

      <path
        d={`
          M ${(size - reticuleWidth) / 2} ${size / 2}
          h -${crosshairSize}
          M ${(size + reticuleWidth) / 2} ${size / 2}
          h ${crosshairSize}

          M ${size / 2} ${(size - reticuleWidth) / 2}
          v -${crosshairSize}
          M ${size / 2} ${(size + reticuleWidth) / 2}
          v ${crosshairSize}
        `}
        stroke={reticuleColor}
        strokeWidth={reticuleStroke}
      />

      <rect
        x={(size - reticuleWidth) / 2}
        y={(size - reticuleWidth) / 2}
        width={reticuleWidth}
        height={reticuleWidth}
        fill="transparent"
        stroke={reticuleColor}
        strokeWidth={reticuleStroke}
      />

      <circle
        cx={size / 2}
        cy={size / 2}
        r={centerDotRadius}
        fill={reticuleColor}
      />
    </Selector>
  )
};

const Porkchop = ({ baseTime, originPath, destinationPath, minDelay, maxDelay, minTof, maxTof, size }) => {
  const { processInBackground } = useWebWorker();

  const dispatchTravelSolution = useStore(s => s.dispatchTravelSolution);

  const [canvasRefIsSet, setCanvasRefIsSet] = useState();
  const [loading, setLoading] = useState(true);
  const [mousePos, setMousePos] = useThrottle(null, 30, true);
  const [selectionPos, setSelectionPos] = useState();
  
  const canvasRef = useRef();

  const setCanvasRef = useCallback((canvas) => {
    canvasRef.current = canvas;
    setCanvasRefIsSet(true);
  }, []);

  useEffect(() => {
    if (!canvasRefIsSet) return;
    if (!originPath || !destinationPath) return;
    setLoading(true);
    setMousePos(null);
    
    const width = maxDelay - minDelay + 1;
    const height = maxTof - minTof + 1;

    const p2 = performance.now();

    let canvasCtx = canvasRef.current.getContext('2d');
    canvasCtx.clearRect(0, 0, width, height);

    let batchesProcessed = 0;
    let expectedBatches = width;

    // let delays = [];
    // for (let delay = minDelay; delay <= maxDelay; delay++) {
    //   delays.push(delay);
    // }
    // delays.sort(() => Math.random() - 0.5)

    // for (let delay of delays) {
    let maxDelayProcessed = minDelay;
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
        if (delay > maxDelayProcessed) {
          maxDelayProcessed = delay;
          canvasCtx.fillStyle = `rgba(${theme.colors.mainRGB},1)`;
          canvasCtx.fillRect(maxDelayProcessed - minDelay + 1, 0, 2, height);
        }

        // TODO: preprocess to minimize # of rectangles to draw (at least per column)
        // TODO: don't need to draw black areas if clear in advance
        const col = delay - minDelay;
        let currentRect = null;
        let pixelColor;

        for (let i in deltaVs) {
          // canvasCtx.fillStyle = `rgba(${deltaVColor(deltaVs[i])},1)`;
          // canvasCtx.fillRect(col, height - i, 1, 1);

          pixelColor = deltaVColor(deltaVs[i]);
          if (currentRect) {
            // if same color, extend current rect
            if (currentRect.color === pixelColor) {
              currentRect.height++;
              continue;

            // else, draw previous rect because changing colors
            } else {
              canvasCtx.fillStyle = currentRect.color;
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
          canvasCtx.fillStyle = currentRect.color;
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

  const getMouseData = useCallback((e) => {
    const data = {
      x: Math.max(0, Math.min(e.nativeEvent.offsetX / size, 1)),
      y: Math.max(0, Math.min(e.nativeEvent.offsetY / size, 1)),
    };
    data.delay = Math.round(minDelay + (maxDelay - minDelay) * data.x);
    data.tof = Math.round(minTof + (maxTof - minTof) * (1 - data.y));
    return data;
  }, [size]);

  const handleClick = useCallback(async (e) => {
    const mouseData = getMouseData(e);
    setSelectionPos(mouseData);

    const { delay, tof } = mouseData;

    const oIndex = delay;
    const oPos = originPath.positions[oIndex];
    const oVel = originPath.velocities[oIndex];

    const dIndex = delay + tof;
    const dPos = destinationPath.positions[dIndex];
    const dVel = destinationPath.velocities[dIndex];

    console.log('lambert tof', tof);
    const solution = await minDeltaVSolver(
      Gm,
      oPos.toArray(),
      dPos.toArray(),
      tof * 84000, // tof in days
      oVel.toArray(),
      dVel.toArray(),
    );

    console.log('lambert dest pos', dPos.toArray());

    // TODO: include positions in state?

    // TODO: should we use absolute times here so not stale until coarseTime > departureTime
    // TODO: clear solution if coarseTime > baseTime
    // TODO: should we freeze time?
    //        should we not clear solution unless cleared (keep flight line, but highlighted orbit lines from now until departure/arrival)
    dispatchTravelSolution({
      ...solution,
      departureTime: baseTime + delay,
      arrivalTime: baseTime + delay + tof,
      originPosition: oPos.toArray(),
      originVelocity: oVel.toArray(),
      destinationPosition: dPos.toArray(),
    });
  }, [originPath, destinationPath]);

  const handleMouseMove = useCallback((e) => {
    if (loading) return;
    if (e.type === 'mousemove') {
      setMousePos(getMouseData(e));
    } else {
      setMousePos();
    }
    return false;
  }, [loading, getMouseData]);

  return (
    <PorkchopWrapper
      loading={loading}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseMove}>
      <canvas ref={setCanvasRef} height={size} width={size} />
      {selectionPos && <Reticule selected center={selectionPos} />}
      {mousePos && <Reticule center={mousePos} />}
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

  // TODO: fix
  // useEffect(() => {
  //   dispatchReorientCamera(true);
  //   return () => {
  //     dispatchReorientCamera(true);
  //   }
  // }, []);

  useEffect(() => {
    if (!baseTime || Math.abs(timeOverride?.speed) <= 1) {
      setBaseTime(coarseTime);
    }
  }, [coarseTime]);










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
          baseTime={baseTime}
          originPath={originPath}
          destinationPath={destinationPath}
          minDelay={minDelay}
          maxDelay={maxDelay}
          minTof={minTof}
          maxTof={maxTof}
          size={345}
        />
      )}
    </>
  );
};

export default RouteSimulator;
