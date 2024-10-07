import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CubicBezierCurve3,
  Line,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
  Vector3
} from 'three';
import { Asteroid, Crewmate, Lot, Time } from '@influenceth/sdk';

import useActionCrew from '~/hooks/useActionCrew';
import useCrewContext from '~/hooks/useCrewContext';
import useGetActivityConfig from '~/hooks/useGetActivityConfig';
import { getCrewAbilityBonuses } from '~/lib/utils';
import theme from '~/theme';

import frag from './shaders/delivery.frag';
import vert from './shaders/delivery.vert';

const Crews = ({ attachTo: overrideAttachTo, asteroidId, radius, getLotPosition }) => {
  const getActivityConfig = useGetActivityConfig();
  const { crew: liveCrew, crewMovementActivity } = useCrewContext();

  const actionCrew = useActionCrew(crewMovementActivity ? {
    _cachedData: crewMovementActivity.data,
    startTime: crewMovementActivity._startTime || crewMovementActivity.event.timestamp
  } : null);

  const crew = useMemo(() => actionCrew || liveCrew || {}, [liveCrew, actionCrew]);

  const [crewTravelBonus, crewDistBonus] = useMemo(() => {
    const bonusIds = [
      Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME,
      Crewmate.ABILITY_IDS.FREE_TRANSPORT_DISTANCE,
    ];
    const abilities = getCrewAbilityBonuses(bonusIds, crew);
    return bonusIds.map((id) => abilities[id] || {});
  }, [crew]);

  const travel = useMemo(() => {
    console.log('crewMovementActivity', crewMovementActivity);
    if (!crewMovementActivity) return {};

    const station = crew?._location;
    const { visitedLot } = getActivityConfig(crewMovementActivity);
    console.log({ station, visitedLot });
    if (station && visitedLot && station.asteroidId === asteroidId) {
      const visitedLotIndex = Lot.toIndex(visitedLot);
      const travelTime = Time.toRealDuration(
        Asteroid.getLotTravelTime(
          asteroidId,
          station.lotIndex,
          visitedLotIndex,
          crewTravelBonus.totalBonus,
          crewDistBonus.totalBonus
        ) || 0,
        crew._timeAcceleration
      );

      const nowSec = Math.floor(Date.now() / 1000);

      // one-way travel
      const isOneWay = crewMovementActivity.event.name === 'CrewStationed';
      if (isOneWay) {
        return {
          origin: visitedLotIndex,
          destination: station.lotIndex,
          departure: crewMovementActivity._startTime,
          travelTime: travelTime,
        }
      }

      // first leg of round trip + time on site
      console.log({ nowSec, start: crewMovementActivity._startTime, finish: crewMovementActivity._finishTime, travelTime });
      if (nowSec < crewMovementActivity._finishTime - travelTime) {
        return {
          origin: station.lotIndex,
          destination: visitedLotIndex,
          departure: crewMovementActivity._startTime,
          travelTime: travelTime,
        }

      // second leg of round trip
      } else {
        console.log('finish', crewMovementActivity);
        return {
          origin: visitedLotIndex,
          destination: station.lotIndex,
          departure: crewMovementActivity._finishTime - travelTime,
          travelTime: travelTime,
        }
      }
    }

    return null;
  }, [crewMovementActivity, crewDistBonus, crewTravelBonus]);

  const { scene } = useThree();
  const attachTo = useMemo(() => overrideAttachTo || scene, [overrideAttachTo, scene]);

  const arcs = useRef([]);
  const arcUniforms = useRef({
    uTime: { value: 0 },
    uAlpha: { value: 1.0 },
    uCount: { value: 51 },
    uCol: { type: 'c', value: new Color(theme.colors.success) },
  });
  const curve = useRef();
  const crewMarker = useRef();

  const material = useRef(
    new ShaderMaterial({
      uniforms: arcUniforms.current,
      fragmentShader: frag,
      vertexShader: vert,
      transparent: true,
      depthWrite: false
    })
  );


  // Calculates the control point for the bezier curve
  const calculateControlPoint = useCallback((origin, dest, distance, frac = 0.5) => {
    const ratio = 1 + Math.pow(distance / radius, 2);
    return origin.clone().lerp(dest, frac).multiplyScalar(Math.min(ratio, 3.5));
  }, [radius]);
  
  useEffect(() => {
    if (!travel) return;
    
    try {
      const origin = new Vector3(...getLotPosition(travel.origin));
      const destination = new Vector3(...getLotPosition(travel.destination));
      const distance = Asteroid.getLotDistance(asteroidId, travel.origin, travel.destination) * 1000;

      curve.current = new CubicBezierCurve3(
        origin,
        calculateControlPoint(origin, destination, distance, 1/3),
        calculateControlPoint(origin, destination, distance, 2/3),
        destination
      );

      const geometry = new BufferGeometry().setFromPoints(curve.current.getPoints(50));
      const order = new Float32Array(Array(51).fill().map((_, i) => i+1));
      geometry.setAttribute('order', new BufferAttribute(order, 1));

      const curveGeom = new Line(geometry, material.current);
      attachTo.add(curveGeom);
      arcs.current.push(curveGeom);

      crewMarker.current = new Mesh(
        new SphereGeometry(1000, 32, 32),
        new MeshBasicMaterial({ color: theme.colors.success })
      );
      attachTo.add(crewMarker.current);

    } catch (e) {
      console.error(e);
    }

    return () => {
      curve.current = null;
      arcs.current?.forEach((arc) => attachTo.remove(arc));
      arcs.current = [];

      crewMarker.current?.geometry.dispose();
      crewMarker.current?.material.dispose();
      attachTo.remove(crewMarker.current);
    };
  }, [asteroidId, attachTo, getLotPosition, travel]);

  useFrame((state, delta) => {
    // if arcs present, animate them
    if (arcs.current && arcs.current.length) {
      const time = arcUniforms.current.uTime.value;
      arcUniforms.current.uTime.value = time + 1;
    }

    if (crewMarker.current && curve.current && travel) {
      const progress = ((Date.now() / 1000) - travel.departure) / travel.travelTime;
      crewMarker.current.position.copy(
        curve.current.getPointAt(Math.min(Math.max(0, progress), 1))
      );
    }
  }, 0.5);

  return null;
};

export default Crews;
