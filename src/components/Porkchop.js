import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { LambertSolver, GM_ADALIA } from '@influenceth/sdk';
import { useThrottle } from '@react-hook/throttle';
import { Vector3 } from 'three';

import useStore from '~/hooks/useStore';
import useWebWorker from '~/hooks/useWebWorker';
import theme from '~/theme';
import SolutionLabels from './porkchop/SolutionLabels';
import Reticule from './porkchop/Reticule';

const PorkchopWrapper = styled.div`
  overflow: visible;
  position: relative;
`;

const PorkchopContainer = styled.div`
  border: 1px solid #333;
  overflow: hidden;
  position: relative;
`;

const colorRange = [
  new Vector3(255, 255, 255),
  new Vector3(255, 0, 115),
  new Vector3(0, 0, 204),
  new Vector3(0, 0, 102)
];

const deltaVColor = (deltaV, maxDeltaV) => {
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
};

const Porkchop = ({ baseTime, originPath, destinationPath, minDelay, maxDelay, minTof, maxTof, shipParams, size }) => {
  const { processInBackground } = useWebWorker();

  const travelSolution = useStore(s => s.asteroids.travelSolution);
  const dispatchTravelSolution = useStore(s => s.dispatchTravelSolution);

  const [canvasRefIsSet, setCanvasRefIsSet] = useState();
  const [loading, setLoading] = useState(true);
  const [mousePos, setMousePos] = useThrottle(null, 30, true);
  const [selectionPos, setSelectionPos] = useState();

  const canvasRef = useRef();

  const { maxDeltaV } = shipParams;

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

        let previousBucket = null;
        let currentBucket;
        const isobuckets = 8;

        for (let i in deltaVs) {
          canvasCtx.fillStyle = deltaVColor(deltaVs[i], maxDeltaV);
          canvasCtx.fillRect(col, height - i, 1, -1);
          currentBucket = Math.floor(isobuckets * deltaVs[i] / maxDeltaV);
          if (previousBucket !== null && currentBucket !== previousBucket) {
            if (currentBucket < isobuckets && previousBucket < isobuckets) {
              canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
              canvasCtx.fillRect(col, height - i + 1, 1, 1);
            }
          }
          previousBucket = currentBucket;
        }

        batchesProcessed++;
        if (batchesProcessed === expectedBatches) {
          console.log('porkchop ready in', performance.now() - p2);
          setLoading(false);
        }
      })
    }
  }, [canvasRefIsSet, originPath, destinationPath, maxDeltaV]);

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
    setMousePos();

    const { delay, tof } = mouseData;

    const oIndex = delay;
    const oPos = originPath.positions[oIndex];
    const oVel = originPath.velocities[oIndex];

    const dIndex = delay + tof;
    const dPos = destinationPath.positions[dIndex];
    const dVel = destinationPath.velocities[dIndex];

    const solution = await LambertSolver.multiSolver(
      GM_ADALIA,
      oPos.toArray(),
      dPos.toArray(),
      tof * 86400, // tof in days
      oVel.toArray(),
      dVel.toArray(),
    );

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
    <PorkchopWrapper style={{ height: `${size}px`, marginBottom: 40, width: `${size}px` }}>
      <PorkchopContainer
        loading={loading}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseMove}
        style={{ height: `${size}px`, width: `${size}px` }}>
        <canvas ref={setCanvasRef}
          height={maxTof - minTof}
          width={maxDelay - minDelay}
          style={{ verticalAlign: 'bottom', height: `${size}px`, width: `${size}px` }} />
        {selectionPos && <Reticule selected center={selectionPos} fade={!!mousePos} invalid={travelSolution.deltaV > maxDeltaV} />}
        {mousePos && <Reticule center={mousePos} />}
      </PorkchopContainer>
      {selectionPos && <SolutionLabels center={selectionPos} mousePos={mousePos} shipParams={shipParams} />}
    </PorkchopWrapper>
  );
};

export default Porkchop;