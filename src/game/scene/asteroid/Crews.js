import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CubicBezierCurve3,
  Group,
  Line,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TextureLoader,
  Vector3
} from 'three';
import { Asteroid, Crewmate, Lot, Time } from '@influenceth/sdk';

import { appConfig } from '~/appConfig';
import { BLOOM_LAYER } from '~/game/Postprocessor';
import useActionCrew from '~/hooks/useActionCrew';
import useCrewContext from '~/hooks/useCrewContext';
import useGetActivityConfig from '~/hooks/useGetActivityConfig';
import { getCrewAbilityBonuses } from '~/lib/utils';
import theme from '~/theme';

import frag from './shaders/delivery.frag';
import vert from './shaders/delivery.vert';

const arcColor = new Color(theme.colors.glowGreen);
const hopperColor = new Color(theme.colors.glowGreen);
const spriteBorderColor = new Color(theme.colors.glowGreen);

const Crews = ({ attachTo: overrideAttachTo, asteroidId, cameraAltitude, getLotPosition, radius }) => {
  const { camera, scene } = useThree();
  const getActivityConfig = useGetActivityConfig();
  const { crew: liveCrew, crewMovementActivity } = useCrewContext();

  const actionCrew = useActionCrew(crewMovementActivity ? {
    _cachedData: crewMovementActivity.data,
    startTime: crewMovementActivity._startTime || crewMovementActivity.event.timestamp
  } : null);

  const arcs = useRef([]);
  const arcUniforms = useRef({
    uTime: { value: 0 },
    uAlpha: { value: 1.0 },
    uCount: { value: 51 },
    uCol: { type: 'c', value: arcColor },
  });
  const arcMaterial = useRef(
    new ShaderMaterial({
      uniforms: arcUniforms.current,
      fragmentShader: frag,
      vertexShader: vert,
      transparent: true,
      depthWrite: false
    })
  );

  const curve = useRef();

  const hopperMarker = useRef();
  const crewMarker = useRef();

  const crew = useMemo(() => actionCrew || liveCrew || {}, [liveCrew, actionCrew]);

  const [crewTravelBonus, crewDistBonus] = useMemo(() => {
    console.log('rememo crew');
    const bonusIds = [
      Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME,
      Crewmate.ABILITY_IDS.FREE_TRANSPORT_DISTANCE,
    ];
    const abilities = getCrewAbilityBonuses(bonusIds, crew);
    return bonusIds.map((id) => abilities[id] || {});
  }, [crew]);

  const travel = useMemo(() => {
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
      if (nowSec < crewMovementActivity._finishTime - travelTime) {
        return {
          origin: station.lotIndex,
          destination: visitedLotIndex,
          departure: crewMovementActivity._startTime,
          travelTime: travelTime,
          hideHopper: (nowSec > crewMovementActivity._startTime + travelTime),
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

  const attachTo = useMemo(() => overrideAttachTo || scene, [overrideAttachTo, scene]);

  

  // Calculates the control point for the bezier curve
  const calculateControlPoint = useCallback((origin, dest, distance, frac = 0.5) => {
    const ratio = 1 + Math.pow(distance / radius, 2);
    return origin.clone().lerp(dest, frac).multiplyScalar(Math.min(ratio, 3.5));
  }, [radius]);
  
  useEffect(() => {
    if (!travel) return;
    
    try {

      //
      // calculate the curve, use it to draw the arc
      // 
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

      const curveGeom = new Line(geometry, arcMaterial.current);
      arcs.current.push(curveGeom);
      attachTo.add(curveGeom);

      //
      // place the hopper on the curve
      //
      if (!travel.hideHopper) {
        hopperMarker.current = new Mesh(
          new SphereGeometry(100, 32, 32),
          new MeshBasicMaterial({ color: hopperColor, })
        );
        hopperMarker.current.layers.enable(BLOOM_LAYER);
        attachTo.add(hopperMarker.current);
      }

      //
      // place the crew indicator
      //

      const textureLoader = new TextureLoader();
      const crewImageTexture = textureLoader.load(`${appConfig.get('Api.influenceImage')}/v2/crews/${crew.id}/captain/image.png?bustOnly=true`);
      const crewBackgroundTexture = textureLoader.load(`${process.env.PUBLIC_URL}/textures/crew-marker.png`);

      const bgSprite = new Sprite(
        new SpriteMaterial({
          color: spriteBorderColor,
          map: crewBackgroundTexture,
          // depthTest: true,
          depthTest: false,
          depthWrite: false,
          // transparent: true
        })
      );
      bgSprite.scale.set(850, 1159, 1);
      bgSprite.layers.enable(BLOOM_LAYER);
      bgSprite.renderOrder = 999;

      const sprite = new Sprite(
        new SpriteMaterial({
          color: 0xffffff,
          map: crewImageTexture,
          depthTest: false,
          depthWrite: false,
          // depthTest: true,
          // depthWrite: true,
          // transparent: false
        })
      );
      sprite.scale.set(750, 1000, 0);
      sprite.position.set(0, 0, 80);
      sprite.renderOrder = 1000000;

      crewMarker.current = new Group();
      crewMarker.current.add(bgSprite);
      crewMarker.current.add(sprite);
      attachTo.add(crewMarker.current);

    } catch (e) {
      console.error(e);
    }

    return () => {
      curve.current = null;
      arcs.current?.forEach((arc) => {
        // TODO: dispose anything?
        attachTo.remove(arc)
      });
      arcs.current = [];

      if (hopperMarker.current) {
        attachTo.remove(hopperMarker.current);
        hopperMarker.current.geometry.dispose();
        hopperMarker.current.material.dispose();
      }

      if (crewMarker.current) {
        attachTo.remove(crewMarker.current);
        crewMarker.current.traverse((child) => {
          if (child.material) child.material.dispose();
          child = null;
        });
        crewMarker.current = null;
      }
    };
  }, [asteroidId, attachTo, getLotPosition, travel]);

  const crewMarkerScale = useMemo(() => Math.max(1, Math.sqrt(cameraAltitude / 7500)), [cameraAltitude]);

  useFrame((state, delta) => {
    // if arcs present, animate them
    if (arcs.current && arcs.current.length) {
      const time = arcUniforms.current.uTime.value;
      arcUniforms.current.uTime.value = time + 1;
    }

    // move hopper and crew markers along with progress
    let progressPosition;
    if (travel) {
      const progress = ((Date.now() / 1000) - travel.departure) / travel.travelTime;
      progressPosition = curve.current.getPointAt(Math.min(Math.max(0, progress), 1)).clone();
    }

    if (hopperMarker.current && curve.current) {
      hopperMarker.current.position.copy(progressPosition);
    }

    if (crewMarker.current && curve.current) {
      crewMarker.current.scale.set(crewMarkerScale, crewMarkerScale, crewMarkerScale);
      const abovePosition = progressPosition.clone().add(camera.up.clone().setLength(800 * crewMarkerScale));
      crewMarker.current.position.copy(abovePosition);
    }
  }, 0.5);

  return null;
};

export default Crews;
