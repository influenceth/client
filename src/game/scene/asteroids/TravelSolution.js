import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CatmullRomCurve3, Color, Vector3, Vector4 } from 'three';
// import { KeplerianOrbit } from '@influenceth/sdk';

import lambertSolver, { getOrbitalElements, minDeltaVSolver } from '~/lib/lambertSolver';
import theme from '~/theme';
import constants from '~/lib/constants';
import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import ClockContext from '~/contexts/ClockContext';


// TODO: update the sdk with this
class KeplerianOrbit {
  constructor (elements) {
    this.a = elements.a; // Semi-major axis
    this.e = elements.e; // Eccentricity
    this.i = elements.i; // Inclination
    this.o = elements.o; // Longitude of ascending node
    this.w = elements.w; // Argument of periapsis
    this.m = elements.m; // Mean anomoly at epoch
  }

  /**
    * The distance in AU from center of the ellipse to the object
    * @param t Angular parameter (in radians)
    */
  getRadius (t) {
    const a = this.a;
    const e = this.e;
    return a * (1 - Math.pow(e, 2)) / (1 + e * Math.cos(t));
  }

  /**
   * Returns Cartesian coordinates at a specific angular parameter
   * @param t Angular parmeter (in radians)
   */
  getPosByAngle (t) {
    const i = this.i;
    const o = this.o;
    const w = this.w;

    // Distance to the point from the orbit focus.
    const r = this.getRadius(t);

    // Cartesian transformation
    const x = r * (Math.cos(o) * Math.cos(t + w) - Math.sin(o) * Math.sin(t + w) * Math.cos(i));
    const y = r * (Math.sin(o) * Math.cos(t + w) + Math.cos(o) * Math.sin(t + w) * Math.cos(i));
    const z = r * (Math.sin(t + w) * Math.sin(i));

    const point = { x, y, z };
    return point;
  }

  /**
   * Returns an numPoints sized array of uniformly (in radians) separated points along the orbit path
   * @param numPoints Number of points to create along an orbit
   */
  getSmoothOrbit (numPoints) {
    const points = [];
    const delta = 2 * Math.PI / numPoints;
    let angle = 0;

    for (let i = 0; i < numPoints; i++) {
      points.push(this.getPosByAngle(angle));
      angle += delta;
    }

    return points;
  }

  /**
   * Retrieves the orbital period in days
   */
  getPeriod () {
    const thirdLaw = 0.000006421064256; // GM / 4*pi*pi for ~86% solar mass Adalia
    return Math.sqrt(Math.pow(this.a, 3) / thirdLaw);
  }

  /**
   * Retrieves Cartesian coordinates in AU at a specified elapsed time
   * @param elapsed Time in days (in-game) since game START_TIMESTAMP
   */
  getPositionAtTime (elapsed) {
    const a = this.a;
    const e = this.e;
    const i = this.i;
    const o = this.o;
    const w = this.w;
    const m = this.m;

    // Calculate the longitude of perihelion
    const p = w + o;

    // Calculate mean motion based on assumption that mass of asteroid <<< Sun
    const k = 0.015921477825967683; // Gaussian constant (units are days and AU)
    const n = k / Math.sqrt(Math.pow(Math.abs(a), 3)); // Mean motion

    // Calculate the mean anomoly at elapsed time
    const M = m + (n * elapsed);

    // Estimate the eccentric and true anomolies using an iterative approximation
    let v;
    let debug;
    if (e < 1) {
      let E1;
      let E = M;
      let lastDiff = 1;
  
      while (lastDiff > 0.0000001) {
        E1 = M + (e * Math.sin(E));
        lastDiff = Math.abs(E1 - E);
        E = E1;
      }

      v = 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2));
  
    } else {
      debug = true;

      let F1;
      let F = M; // Initial guess for hyperbolic eccentric anomaly
      let lastDiff = 1;
      let maxIterations = 100;
      let iteration = 0;
      
      while (lastDiff > 0.0000001 && iteration < maxIterations) {
        F1 = F - (e * Math.sinh(F) - F - M) / (e * Math.cosh(F) - 1);
        lastDiff = Math.abs(F1 - F);
        F = F1;
        iteration++;
      }

      v = 2 * Math.atan(Math.tanh(F / 2) / Math.sqrt((e - 1)/(e + 1)));
    }

    // Calculate in heliocentric polar and then convert to cartesian
    let r = a * (1 - Math.pow(e, 2)) / (1 + e * Math.cos(v)); // Current radius in AU

    const pos = {
      x: r * (Math.cos(o) * Math.cos(v + p - o) - (Math.sin(o) * Math.sin(v + p - o) * Math.cos(i))),
      y: r * (Math.sin(o) * Math.cos(v + p - o) + Math.cos(o) * Math.sin(v + p - o) * Math.cos(i)),
      z: r * Math.sin(v + p - o) * Math.sin(i)
    };

    return {
      x: +pos.x.toFixed(10),
      y: +pos.y.toFixed(10),
      z: +pos.z.toFixed(10)
    };
  }

  getTrueAnomalyAtPos (pos) {
    const e = this.e;
    const i = this.i;
    const o = this.o;
    const w = this.w;

    // Calculate the argument of latitude (u)
    const u = Math.atan2(pos.z / Math.sin(i), (pos.x * Math.cos(o) + pos.y * Math.sin(o)));

    // Calculate the eccentric anomaly (E) or hyperbolic eccentric anomaly (F) based on the type of orbit
    let E, F;
    if (e < 1) {
      // Elliptical orbit
      E = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan((u - w) / 2));
      // Correct E for quadrant ambiguity
      if (u < w) {
        E += 2 * Math.PI;
      }
    } else {
      // Hyperbolic orbit
      F = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan((u - w) / 2));
    }

    // Calculate the true anomaly (v)
    let v;
    if (e < 1) {
      // Elliptical orbit
      v = 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2));
    } else {
      // Hyperbolic orbit
      v = 2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(F / 2));
    }

    return v;
  }
};





// TODO: move to sdk
const G = 6.6743015e-11; // N m2 / kg2
const m = 1.7033730830877265e30; // kg  // TODO: mass of adalia (and probably gravitational constant should be in sdk)
const Gm = G * m;

const TravelSolution = ({}) => {
  const { coarseTime } = useContext(ClockContext);

  const destinationId = useStore(s => s.asteroids.destination);
  const originId = useStore(s => s.asteroids.origin);

  const { data: destination } = useAsteroid(destinationId);
  const { data: origin } = useAsteroid(originId);

  const [prearrival, setPrearrival] = useState();
  const [predeparture, setPredeparture] = useState();
  const [trajectory, setTrajectory] = useState();

  const travelSolution = useStore(s => s.asteroids.travelSolution);
  // {
  //    v0,
  //    deltaV,
  //    baseTime,
  //    delay,
  //    tof
  // }



  useEffect(() => {
    if (!travelSolution || !destination || !origin) {
      setPrearrival();
      setPredeparture();
      setTrajectory();
      return;
    }

    console.log('travelSolution', travelSolution);
    const { v1, originPosition, destinationPosition, departureTime, arrivalTime } = travelSolution;
    if (!v1 || !originPosition) return;

    const solutionOrbitalElements = getOrbitalElements(
      Gm,
      [originPosition[0], originPosition[1], originPosition[2]],
      v1
    );
    solutionOrbitalElements.a = solutionOrbitalElements.a / constants.AU;

    const solutionOrbit = new KeplerianOrbit(solutionOrbitalElements);
    
    const initialAngle = solutionOrbit.getTrueAnomalyAtPos({
      x: originPosition[0],
      y: originPosition[1],
      z: originPosition[2],
    });

    const finalAngle = solutionOrbit.getTrueAnomalyAtPos({
      x: destinationPosition[0],
      y: destinationPosition[1],
      z: destinationPosition[2],
    });
    
    const slnIncrement = (finalAngle - initialAngle) / 100;

    let newPositions = [];
    newPositions.push(...Object.values(originPosition).map((x) => x / constants.AU));
    for (let t = initialAngle; t <= finalAngle; t += slnIncrement) {
      const p = solutionOrbit.getPosByAngle(t);
      newPositions.push(...[ p.x, p.y, p.z ]);
    }
    newPositions.push(...Object.values(destinationPosition).map((x) => x / constants.AU));

    setTrajectory(new Float32Array(newPositions.map((x) => x * constants.AU)));


    // departureTime: baseTime + delay,
    // arrivalTime: baseTime + delay + tof,

    const originPositions = [];
    const originOrbit = new KeplerianOrbit(origin.orbital);
    const originIncrement = (departureTime - coarseTime) / 360;
    for (let t = coarseTime; t < departureTime; t += originIncrement) {
      const p = originOrbit.getPositionAtTime(t);
      originPositions.push(...[ p.x, p.y, p.z ]);
    }
    setPredeparture(new Float32Array(originPositions.map((x) => x * constants.AU)));

    const destinationPositions = [];
    const destinationOrbit = new KeplerianOrbit(destination.orbital);
    const destinationIncrement = (arrivalTime - coarseTime) / 360;
    for (let t = coarseTime; t < arrivalTime; t += destinationIncrement) {
      const p = destinationOrbit.getPositionAtTime(t);
      destinationPositions.push(...[ p.x, p.y, p.z ]);
    }
    setPrearrival(new Float32Array(destinationPositions.map((x) => x * constants.AU)));

  }, [coarseTime, travelSolution]);



  // TODO: originDelay curve
  // TODO: originDelay marker
  // TODO: destination arrival curve
  // TODO: arrival marker



  return (
    <>
      {trajectory && (
        <line userData={{ bloom: true }}>
          <bufferGeometry>
            <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ trajectory, 3 ]} />
          </bufferGeometry>
          <lineBasicMaterial color={0xffff00} />
        </line>
      )}

      {predeparture && (
        <line userData={{ bloom: true }}>
          <bufferGeometry>
            <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ predeparture, 3 ]} />
          </bufferGeometry>
          <lineBasicMaterial color={0x72c1dc} />
        </line>
      )}

      {prearrival && (
        <line userData={{ bloom: true }}>
          <bufferGeometry>
            <bufferAttribute attachObject={[ 'attributes', 'position' ]} args={[ prearrival, 3 ]} />
          </bufferGeometry>
          <lineBasicMaterial color={0xff5555} />
        </line>
      )}

      {false && (
        <mesh position={new Vector3(travelSolution.destinationPosition[0], travelSolution.destinationPosition[1], travelSolution.destinationPosition[2])}>
          <sphereGeometry args={[3e9]} />
          <meshBasicMaterial color={0x00ff00} transparent opacity={0.5} />
        </mesh>
      )}
    </>
  );
};

export default TravelSolution;


