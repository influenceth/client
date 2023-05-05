import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { LambertSolver, GM_ADALIA } from '@influenceth/sdk';
import { useThrottle } from '@react-hook/throttle';
import { Vector3 } from 'three';

import ClockContext from '~/contexts/ClockContext';
import useAsteroid from '~/hooks/useAsteroid';
import useStore from '~/hooks/useStore';
import useWebWorker from '~/hooks/useWebWorker';
import { sampleAsteroidOrbit } from '~/lib/geometryUtils';
import theme from '~/theme';

const InfoRow = styled.div``;

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
  start: maxDeltaV * i * 1 / (colors.length - 1),
  end: i === colors.length - 1 ? undefined : maxDeltaV * (i + 1) * 1 / (colors.length - 1),
  color: c
}));

// const colorRange = [new Vector3(0, 255, 255), new Vector3(0, 0, 255)]; // cyan to blue
// const colorRange = [new Vector3(255, 0, 191), new Vector3(0, 0, 255)]; // magenta to blue
// const colorRange = [new Vector3(0, 255, 255), new Vector3(128, 0, 255)]; // cyan to purple
// const colorRange = [new Vector3(255, 0, 191), new Vector3(0, 0, 255), new Vector3(0, 0, 102)]; // three
// const colorRange = [new Vector3(0, 255, 255), new Vector3(0, 0, 255), new Vector3(0, 0, 90)]; // three

// const colorRange = [new Vector3(0, 204, 204), new Vector3(0, 0, 204), new Vector3(0, 0, 102)]; // three
// const colorRange = [new Vector3(255, 0, 255), new Vector3(0, 0, 255), new Vector3(0, 0, 102)]; // three
// const colorRange = [new Vector3(255, 0, 115), new Vector3(0, 0, 255), new Vector3(0, 0, 102)]; // three

const colorRange = [
  new Vector3(255, 255, 255),
  new Vector3(255, 0, 115),
  new Vector3(0, 0, 204),
  new Vector3(0, 0, 102)
]; // four
const deltaVColor = (deltaV) => {
  // if (deltaV > maxDeltaV) return '#000000';
  // const c = colorRange[0].clone();
  // c.lerp(colorRange[1], deltaV / maxDeltaV);
  // const fadeOut = 0;//0.1;
  // if (deltaV > (1 - fadeOut) * maxDeltaV) {
  //   // console.log();
  //   c.lerp(new Vector3(0, 0, 0), (deltaV - (1 - fadeOut) * maxDeltaV) / (fadeOut * maxDeltaV));
  // }
  // return `rgb(${c.x},${c.y},${c.z})`

  // if (deltaV > maxDeltaV) return '#000000';
  // if (deltaV < 0.5 * maxDeltaV) {
  //   const c = colorRange[0].clone();
  //   c.lerp(colorRange[1], deltaV / (0.5 * maxDeltaV));
  //   return `rgb(${c.x},${c.y},${c.z})`
  // } else {
  //   const c = colorRange[1].clone();
  //   c.lerp(colorRange[2], (deltaV - 0.5 * maxDeltaV) / (0.5 * maxDeltaV));
  //   return `rgb(${c.x},${c.y},${c.z})`
  // }

  if (deltaV > maxDeltaV) return '#000000';
  if (deltaV < 0.33 * maxDeltaV) {
    const c = colorRange[0].clone();
    c.lerp(colorRange[1], deltaV / (0.33 * maxDeltaV));
    return `rgb(${c.x},${c.y},${c.z})`
  } else if (deltaV < 0.67 * maxDeltaV) {
    const c = colorRange[1].clone();
    c.lerp(colorRange[2], (deltaV - 0.33 * maxDeltaV) / (0.33 * maxDeltaV));
    return `rgb(${c.x},${c.y},${c.z})`
  } else {
    const c = colorRange[2].clone();
    c.lerp(colorRange[3], (deltaV - 0.67 * maxDeltaV) / (0.33 * maxDeltaV));
    return `rgb(${c.x},${c.y},${c.z})`
  }

  // return bands.find((b) => (
  //   b.start <= deltaV
  //   && (!b.end || b.end > deltaV)
  // )).color;
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

        let previousQuintile = null;
        let currentQuintile;
        const isobuckets = 8;

        for (let i in deltaVs) {
          canvasCtx.fillStyle = deltaVColor(deltaVs[i]);
          canvasCtx.fillRect(col, height - i, 1, -1);
          currentQuintile = Math.floor(isobuckets * deltaVs[i] / maxDeltaV);
          if (previousQuintile !== null && currentQuintile !== previousQuintile) {
            if (currentQuintile < isobuckets && previousQuintile < isobuckets) {
              canvasCtx.fillStyle = (currentQuintile < isobuckets && previousQuintile < isobuckets)
                ? `rgba(0, 0, 0, 0.3)`
                : `rgba(255, 255, 255, 0.15)`;
              canvasCtx.fillRect(col, height - i + 1, 1, 1);
            }
          }
          previousQuintile = currentQuintile;

          // pixelColor = deltaVColor(deltaVs[i]);
          // if (currentRect) {
          //   // if same color, extend current rect
          //   if (currentRect.color === pixelColor) {
          //     currentRect.height++;
          //     continue;

          //   // else, draw previous rect because changing colors
          //   } else {
          //     canvasCtx.fillStyle = currentRect.color;
          //     canvasCtx.fillRect(col, currentRect.start, 1, -currentRect.height);
          //   }
          // }

          // // if get here, start a new rect
          // currentRect = {
          //   color: pixelColor,
          //   start: height - i,
          //   height: 1
          // }
        }

        // // draw remaining rectangle
        // if (currentRect) {
        //   canvasCtx.fillStyle = currentRect.color;
        //   canvasCtx.fillRect(col, currentRect.start, 1, -currentRect.height);
        // }

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
    const solution = await LambertSolver.multiSolver(
      GM_ADALIA,
      oPos.toArray(),
      dPos.toArray(),
      tof * 84000, // tof in days
      oVel.toArray(),
      dVel.toArray(),
    );
    console.log('lambert dest pos', dPos.toArray());
    console.log('lambert', solution);

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
      <canvas ref={setCanvasRef} height={size} width={size} style={{ verticalAlign: 'bottom' }} />
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
  // labels beneath
  //    departure, tof, arrival (relative to "now"),
  //    deltav, propellant
  // "impossible" message
  // in-scene billboards and paths for journey


















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
          minTof={minTof}
          maxTof={maxTof}
          size={345}
        />
      )}

      <InfoRow>
        <label>Propellant Required</label>
        <value note=""></value>
      </InfoRow>

      <InfoRow>
        <label>Departure</label>
        <value note=""></value>
      </InfoRow>

      <InfoRow>
        <label>Arrival</label>
        <value note=""></value>
      </InfoRow>
    </>
  );
};

export default RouteSimulator;
