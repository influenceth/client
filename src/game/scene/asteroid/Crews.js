import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Asteroid, Crewmate, Entity, Lot, Time } from '@influenceth/sdk';

import { appConfig } from '~/appConfig';
import { BLOOM_LAYER } from '~/game/Postprocessor';
import useActionCrew from '~/hooks/useActionCrew';
import useCrewContext from '~/hooks/useCrewContext';
import useGetActivityConfig from '~/hooks/useGetActivityConfig';
import activities, { hydrateActivities } from '~/lib/activities';
import api from '~/lib/api';
import { getCrewAbilityBonuses, locationsArrToObj } from '~/lib/utils';
import theme from '~/theme';

import frag from './shaders/delivery.frag';
import vert from './shaders/delivery.vert';
import { useTexture } from '@react-three/drei';
import useBlockTime from '~/hooks/useBlockTime';
import { useQuery, useQueryClient } from 'react-query';

const arcColor = new Color(theme.colors.glowGreen);
const hopperColor = new Color(theme.colors.glowGreen);
const spriteBorderColor = new Color(theme.colors.glowGreen);

const Crews = ({ attachTo: overrideAttachTo, asteroidId, cameraAltitude, getLotPosition, radius }) => {
  const { camera, scene } = useThree();
  const blockTime = useBlockTime();
  const getActivityConfig = useGetActivityConfig();
  const queryClient = useQueryClient();

  const { data: ongoing, isLoading } = useQuery(
    [ 'activities', 'ongoing', asteroidId ],
    async () => {
      const activities = await api.getOngoingActivities(
        Entity.packEntity({ label: Entity.IDS.ASTEROID, id: asteroidId }),
        Object.keys(activities).filter((k) => !!activities[k].getVisitedLot)
      );
      await hydrateActivities(activities, queryClient)
      return activities;
    },
    {
      enabled: !!asteroidId
    }
  );

  // const { crewMovementActivity } = useCrewContext();
  // const ongoing = useMemo(() => [crewMovementActivity].filter(Boolean), [crewMovementActivity]);

  // const [ongoing, setOngoing] = useState([]);
  // useEffect(() => {
  //   hydrateActivities(ongoingRaw, queryClient).then(() => {
  //     setOngoing(ongoingRaw);
  //   });
  // }, []);

  const attachTo = useMemo(() => overrideAttachTo || scene, [overrideAttachTo, scene]);
  const textureLoader = useRef(new TextureLoader());

  // Calculates the control point for the bezier curve
  const calculateControlPoint = useCallback((origin, dest, distance, frac = 0.5) => {
    const ratio = 1 + Math.pow(distance / radius, 2);
    return origin.clone().lerp(dest, frac).multiplyScalar(Math.min(ratio, 3.5));
  }, [radius]);

  const crewMaterials = useRef({});

  const ongoingTravel = useMemo(() => {
    const crews = {};
    ongoing?.forEach((activity) => {
      const crew = activity.data.crew;
      const { visitedLot } = getActivityConfig(activity);
      console.log('visitedLot', visitedLot);
      if (crew && visitedLot) {
        const startTime = Math.max(activity.event.timestamp, crew.Crew.lastReadyAt);
        const finishTime = crew.Crew.readyAt;
        if (startTime <= blockTime && finishTime > blockTime) {
          const crewTravelBonus = getCrewAbilityBonuses(Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, crew);
          const crewDistBonus = getCrewAbilityBonuses(Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, crew);
          const station = locationsArrToObj(crew.Location.locations || []) || {};
          const visitedLotIndex = Lot.toIndex(visitedLot);

          const nowSec = Math.floor(Date.now() / 1000);

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

          // one-way travel
          const isOneWay = activity.event.name === 'CrewStationed';
          if (isOneWay) {
            crews[crew.id] = {
              origin: visitedLotIndex,
              destination: station.lotIndex,
              departure: startTime,
              travelTime: travelTime,
            }
          }

          // first leg of round trip + time on site
          else if (nowSec < finishTime - travelTime) {
            crews[crew.id] = {
              origin: station.lotIndex,
              destination: visitedLotIndex,
              departure: startTime,
              travelTime: travelTime,
              hideHopper: (nowSec > startTime + travelTime),
            }
          }
          
          // second leg of round trip
          else {
            crews[crew.id] = {
              origin: visitedLotIndex,
              destination: station.lotIndex,
              departure: finishTime - travelTime,
              travelTime: travelTime,
            }
          }
        }
      } else {
        console.log('skip', activity);
      }
    });
    console.log(crews);
    
    // add curve and texture to crews
    Object.keys(crews).forEach((crewId) => {
      const origin = new Vector3(...getLotPosition(crews[crewId].origin));
      const destination = new Vector3(...getLotPosition(crews[crewId].destination));
      const distance = Asteroid.getLotDistance(asteroidId, crews[crewId].origin, crews[crewId].destination) * 1000;
      crews[crewId].curve = new CubicBezierCurve3(
        origin,
        calculateControlPoint(origin, destination, distance, 1/3),
        calculateControlPoint(origin, destination, distance, 2/3),
        destination
      );
      if (!crewMaterials.current[crewId]) {
        crewMaterials.current[crewId] = new SpriteMaterial({
          color: 0xffffff,
          map: textureLoader.current.load(`${appConfig.get('Api.influenceImage')}/v2/crews/${crewId}/captain/image.png?bustOnly=true`),
          depthTest: false,
          depthWrite: false,
        })
      }
    });

    return crews;
  }, [asteroidId, blockTime, ongoing]);

  const arcs = useRef([]);
  const hoppers = useRef([]);
  const crewIndicators = useRef([]);
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
  const hopperGeometry = useRef(new SphereGeometry(100, 32, 32));
  const hopperMaterial = useRef(new MeshBasicMaterial({ color: hopperColor }));
  const spriteBgMaterial = useRef(
    new SpriteMaterial({
      color: spriteBorderColor,
      map: textureLoader.current.load(`${process.env.PUBLIC_URL}/textures/crew-marker.png`),
      depthTest: false,
      depthWrite: false,
    })
  );

  // unload of static resources
  useEffect(() => {
    return () => {
      Object.values(crewMaterials.current).forEach((material) => {
        material.map.dispose();
        material.dispose();
      });

      if (arcMaterial.current) {
        hopperGeometry.current.dispose();
      }
      if (hopperGeometry.current) {
        hopperGeometry.current.dispose();
      }
      if (hopperMaterial.current) {
        hopperMaterial.current.dispose();
      }
      if (spriteBgMaterial.current) {
        spriteBgMaterial.current.map.dispose();
        spriteBgMaterial.current.dispose();
      }
    }
  }, []);

  const markers = useRef({});
  useEffect(() => {
    const order = new Float32Array(Array(51).fill().map((_, i) => i + 1));
    Object.keys(ongoingTravel).forEach((crewId) => {
      const travel = ongoingTravel[crewId];
      const geometry = new BufferGeometry().setFromPoints(travel.curve.getPoints(50));
      const marker = {};
      geometry.setAttribute('order', new BufferAttribute(order, 1));

      // 
      // add arcs
      //
      const curveGeom = new Line(geometry, arcMaterial.current);
      arcs.current.push(curveGeom);
      attachTo.add(curveGeom);

      //
      // place the hoppers on the curve
      //
      if (!travel.hideHopper) {
        const hopperMarker = new Mesh(hopperGeometry.current, hopperMaterial.current);
        hopperMarker.layers.enable(BLOOM_LAYER);
        attachTo.add(hopperMarker);

        hoppers.current[crewId] = hopperMarker;
      }

      //
      // place the crew indicators
      //

      // (backgrounds could technically be instanced mesh, but adds a lot of complexity)
      if (crewMaterials.current[crewId]) {
        const bgSprite = new Sprite(spriteBgMaterial.current);
        bgSprite.scale.set(850, 1159, 1);
        bgSprite.layers.enable(BLOOM_LAYER);
        bgSprite.renderOrder = 999;

        const sprite = new Sprite(crewMaterials.current[crewId]);
        sprite.scale.set(750, 1000, 0);
        sprite.position.set(0, 0, 80);
        sprite.renderOrder = 1000;

        const crewMarker = new Group();
        crewMarker.add(bgSprite);
        crewMarker.add(sprite);
        attachTo.add(crewMarker);

        crewIndicators.current[crewId] = crewMarker;
      }
    });

    return () => {
      if (arcs.current) {
        arcs.current.forEach((arc) => {
          arc.geometry.dispose();
          attachTo.remove(arc);
        });
      }
      if (hoppers.current) {
        Object.values(hoppers.current).forEach((hopper) => {
          attachTo.remove(hopper);
        });
      }
      if (crewIndicators.current) {
        Object.values(crewIndicators.current).forEach((crewIndicatorGroup) => {
          // (keeps throwing error so commented out for now)
          // crewIndicatorGroup.traverse((child) => {
          //   crewIndicatorGroup.remove(child);
          // });

          attachTo.remove(crewIndicatorGroup);
        });
      }
    };
  }, [ongoingTravel]);

  const crewMarkerScale = useMemo(() => Math.max(1, Math.sqrt(cameraAltitude / 7500)), [cameraAltitude]);

  useFrame((state, delta) => {
    // if arcs present, animate them
    if (arcs.current && arcs.current.length) {
      const time = arcUniforms.current.uTime.value;
      arcUniforms.current.uTime.value = time + 1;
    }

    Object.keys(ongoingTravel).forEach((crewId) => {
      const travel = ongoingTravel[crewId];
      const progress = ((Date.now() / 1000) - travel.departure) / travel.travelTime;
      const progressPosition = travel.curve.getPointAt(Math.min(Math.max(0, progress), 1)).clone();

      if (hoppers.current[crewId]) {
        hoppers.current[crewId].position.copy(progressPosition);
      }

      if (crewIndicators.current[crewId]) {
        crewIndicators.current[crewId].scale.set(crewMarkerScale, crewMarkerScale, crewMarkerScale);
      
        const abovePosition = progressPosition.clone().add(camera.up.clone().setLength(800 * crewMarkerScale));
        crewIndicators.current[crewId].position.copy(abovePosition);
      }
    });
  }, 0.5);

  return null;
};

export default Crews;
