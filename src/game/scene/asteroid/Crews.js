import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  ArrowHelper,
  BufferAttribute,
  BufferGeometry,
  Color,
  CubicBezierCurve3,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TextureLoader,
  Vector3
} from 'three';
import { Asteroid, Crewmate, Entity, Lot, Time } from '@influenceth/sdk';
import { useHistory } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';

import { appConfig } from '~/appConfig';
import { BLOOM_LAYER } from '~/game/Postprocessor';
import useBlockTime from '~/hooks/useBlockTime';
import useGetActivityConfig from '~/hooks/useGetActivityConfig';
// import useInterval from '~/hooks/useInterval';
import activities, { hydrateActivities } from '~/lib/activities';
import api from '~/lib/api';
import { getCrewAbilityBonuses, locationsArrToObj } from '~/lib/utils';
import theme from '~/theme';

import frag from './shaders/delivery.frag';
import vert from './shaders/delivery.vert';

const hoverColor = new Color(0xffffff);
const arcColor = new Color(theme.colors.glowGreen);
const hopperColor = new Color(theme.colors.glowGreen);
const spriteBorderColor = new Color(theme.colors.glowGreen);

const Crews = ({ attachTo: overrideAttachTo, asteroidId, cameraAltitude, getLotPosition, radius }) => {
  const blockTime = useBlockTime();
  const getActivityConfig = useGetActivityConfig();
  const queryClient = useQueryClient();
  const history = useHistory();
  const { camera, controls, gl, scene } = useThree();

  const { data: ongoing, isLoading } = useQuery(
    [ 'activities', 'ongoing', asteroidId ],
    async () => {
      const ongoingActivities = await api.getOngoingActivities(
        Entity.packEntity({ label: Entity.IDS.ASTEROID, id: asteroidId }),
        Object.keys(activities).filter((k) => !!activities[k].getVisitedLot)
      );
      await hydrateActivities(ongoingActivities, queryClient)
      return ongoingActivities;
    },
    {
      enabled: !!asteroidId
    }
  );

  const attachTo = useMemo(() => overrideAttachTo || scene, [overrideAttachTo, scene]);
  const textureLoader = useRef(new TextureLoader());

  // Calculates the control point for the bezier curve
  const calculateControlPoint = useCallback((origin, dest, distance, frac = 0.5) => {
    const ratio = 1 + Math.pow(distance / radius, 2);
    return origin.clone().lerp(dest, frac).multiplyScalar(Math.min(ratio, 3.5));
  }, [radius]);

  // static resources to be shared (and dismantled on unmount)
  const arcUniforms = useRef();
  const arcHoverMaterial = useRef();
  const main = useRef();
  const arcMaterial = useRef();
  const hopperGeometry = useRef();
  const hopperMaterial = useRef();
  const spriteBgMaterial = useRef();
  const spriteHoverBgMaterial = useRef();
  const crewMaterials = useRef({});
  useEffect(() => {
    main.current = new Group();
    arcUniforms.current = {
      uTime: { value: 0 },
      uAlpha: { value: 1.0 },
      uCount: { value: 51 },
      uCol: { type: 'c', value: arcColor },
    };
    arcMaterial.current = new ShaderMaterial({
      uniforms: arcUniforms.current,
      fragmentShader: frag,
      vertexShader: vert,
      transparent: true,
      depthWrite: false
    });
    arcHoverMaterial.current = new LineBasicMaterial({ color: hoverColor, opacity: 0.8, transparent: true });
    hopperGeometry.current = new SphereGeometry(100, 32, 32);
    hopperMaterial.current = new MeshBasicMaterial({ color: hopperColor });

    const spriteBgTexture = textureLoader.current.load(`${process.env.PUBLIC_URL}/textures/crew-marker.png`);
    spriteBgMaterial.current = new SpriteMaterial({
      color: spriteBorderColor,
      map: spriteBgTexture,
      // depthTest: false,
      depthWrite: false,
    });
    spriteHoverBgMaterial.current = new SpriteMaterial({
      color: hoverColor,
      map: spriteBgTexture,
      // depthTest: false,
      depthWrite: false,
    });

    attachTo.add(main.current);

    return () => {
      Object.values(crewMaterials.current).forEach((material) => {
        material.map.dispose();
        material.dispose();
      });

      if (arcMaterial.current) {
        arcMaterial.current.dispose();
      }
      if (hopperGeometry.current) {
        hopperGeometry.current.dispose();
      }
      if (hopperMaterial.current) {
        hopperMaterial.current.dispose();
      }
      if (spriteBgTexture) {
        spriteBgTexture.dispose();
      }
      if (spriteBgMaterial.current) {
        spriteBgMaterial.current.dispose();
      }
      if (spriteBgMaterial.current) {
        spriteBgMaterial.current.dispose();
      }

      attachTo.remove(main.current);
    }
  }, []);


  // define the travel params from the ongoing activities
  const ongoingTravel = useMemo(() => {
    const crews = {};
    ongoing?.forEach((activity) => {
      const crew = activity.data.crew;
      const { visitedLot } = getActivityConfig(activity);
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
        } else {
          // console.log('out of range', blockTime, `${startTime} - ${finishTime}`);
        }
      } else {
        // console.log('skip', activity);
      }
    });
    
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
          // depthTest: false,
          depthWrite: false,
        });
      }
    });

    return crews;
  }, [asteroidId, blockTime, ongoing]);

  // actually put the scene elements in place
  const arcs = useRef({});
  const hoppers = useRef({});
  const crewIndicators = useRef({});
  useEffect(() => {
    const order = new Float32Array(Array(51).fill().map((_, i) => i + 1));
    Object.keys(ongoingTravel).forEach((crewId) => {
      const travel = ongoingTravel[crewId];
      const geometry = new BufferGeometry().setFromPoints(travel.curve.getPoints(50));
      geometry.setAttribute('order', new BufferAttribute(order, 1));

      // define group (+ attach userdata)
      const marker = new Group();
      marker.userData = { crewId };

      // 
      // add arcs
      //
      const arc = new Line(geometry, arcMaterial.current);
      marker.add(arc);

      arcs.current[crewId] = arc;


      //
      // place the hoppers on the curve
      //
      if (!travel.hideHopper) {
        const hopperMarker = new Mesh(hopperGeometry.current, hopperMaterial.current);
        hopperMarker.layers.enable(BLOOM_LAYER);
        marker.add(hopperMarker);

        hoppers.current[crewId] = hopperMarker;
      }


      //
      // place the crew indicators
      //

      // (backgrounds could technically be instanced mesh, but adds a lot of complexity)
      if (crewMaterials.current[crewId]) {
        const bgSprite = new Sprite(spriteBgMaterial.current);
        bgSprite.scale.set(850, 1159, 0);
        bgSprite.layers.enable(BLOOM_LAYER);
        bgSprite.renderOrder = 1001;

        const sprite = new Sprite(crewMaterials.current[crewId]);
        sprite.scale.set(750, 1000, 0);
        // sprite.position.set(50, 79, 0);
        sprite.renderOrder = 1002;

        const crewMarker = new Group();
        crewMarker.add(bgSprite);
        crewMarker.add(sprite);
        marker.add(crewMarker);

        crewIndicators.current[crewId] = crewMarker;
      }

      main.current.add(marker)
    });

    return () => {
      for(let i = main.current.children.length - 1; i >= 0; i--) {
        const marker = main.current.children[i];
        for(let j = marker.children.length - 1; j >= 0; j--) {
          const child = marker.children[j];
          // dispose arc geometry
          if (child.isLine && child.geometry) child.geometry?.dispose();
          // TODO: dispose of sprite textures? remove sprite-group children individually?
          marker.remove(child);
        }
        main.current.remove(marker);
      }
      arcs.current = {};
      hoppers.current = {};
      crewIndicators.current = {};
    };
  }, [ongoingTravel]);

  const [hovered, setHovered] = useState();
  useEffect(() => {
    if (hovered) {
      if (arcs.current[hovered]) {
        arcs.current[hovered].material = arcHoverMaterial.current;
      }
      if (crewIndicators.current[hovered]?.children?.[0]) {
        crewIndicators.current[hovered].children[0].material = spriteHoverBgMaterial.current;
        crewIndicators.current[hovered].children[0].material.needsUpdate = true;
      }
      return () => {
        if (arcs.current[hovered]) {
          arcs.current[hovered].material = arcMaterial.current;
        }
        if (crewIndicators.current[hovered]?.children?.[0]) {
          crewIndicators.current[hovered].children[0].material = spriteBgMaterial.current;
        }
      };
    }
  }, [hovered]);

  // listen for click events
  // NOTE: if just use onclick, then fires on drag events too :(
  useEffect(() => {
    if (hovered) {
      const onClick = (e) => {
        history.push(`/crew/${hovered}`);
      };
      gl.domElement.addEventListener('pointerup', onClick, true);
      return () => {
        gl.domElement.removeEventListener('pointerup', onClick, true);
      };
    }
  }, [hovered]);

  const raycaster = useRef(new Raycaster());
  const crewMarkerScale = useMemo(() => Math.max(1, Math.sqrt(cameraAltitude / 7500)), [cameraAltitude]);
  const cameraDirection = useRef(new Vector3());
  const crewIndicatorOffset = useRef(new Vector3());
  const progressPosition = useRef(new Vector3());
  const inverseMatrix = useRef(new Matrix4());
  // const timing = useRef({ total: 0, tally: 0 });
  // useInterval(() => {
  //   console.log(`over ${timing.current.tally} iterations: ${(timing.current.total / timing.current.tally).toFixed(3)}ms`);
  // }, 1000);
  useFrame((state) => {
    // if arcs present, animate them
    if (Object.keys(arcs.current).length) {
      const time = arcUniforms.current.uTime.value;
      arcUniforms.current.uTime.value = time + 1;
    }

    // move things along according to timing progress
    if (Object.keys(ongoingTravel).length) {
      // TODO: vvv this could probably be improved by thinking about screenspace vectors better
      // (i.e. could we just attach the sprites to the root scene and avoid all these transforms)
      // this takes ~0.15ms per frame, perhaps that is tolerable
      const s = performance.now();
      attachTo.updateMatrixWorld();
      inverseMatrix.current.copy(attachTo.matrixWorld).invert();

      const screenUp = new Vector3(0, 1, 0).applyQuaternion(controls.object.quaternion).normalize();
      const localUp = screenUp.applyMatrix4(inverseMatrix.current);

      controls.object.getWorldDirection(cameraDirection.current);
      const localOut = cameraDirection.current.applyMatrix4(inverseMatrix.current);

      crewIndicatorOffset.current.addVectors(
        localUp.setLength(800 * crewMarkerScale), // "up" from hopper
        localOut.setLength(-500) // towards camera (above surface)
      );
      
      // timing.current.total += performance.now() - s;
      // timing.current.tally++;
      // ^^^
      
      Object.keys(ongoingTravel).forEach((crewId) => {
        const travel = ongoingTravel[crewId];
        const progress = ((Date.now() / 1000) - travel.departure) / travel.travelTime;
        travel.curve.getPointAt(Math.min(Math.max(0, progress), 1), progressPosition.current);

        if (hoppers.current[crewId]) {
          hoppers.current[crewId].position.copy(progressPosition.current);
        }

        if (crewIndicators.current[crewId]) {
          crewIndicators.current[crewId].scale.set(crewMarkerScale, crewMarkerScale, crewMarkerScale);
          crewIndicators.current[crewId].position.addVectors(progressPosition.current, crewIndicatorOffset.current);
        }
      });
    }

    // handle mouseovers
    if (main.current.children.length > 0 && state.raycaster) {
      let shouldBeHovered;

      // not sure why useFrame's raycaster isn't working, probably because it's used more than once in the useFrame loop...
      // it catches intersections but then stops detecting the same ones without moving mouse... so we use a fallback 
      // raycaster while highlighted (but not all the time because it's expensive)
      let safeRaycaster = state.raycaster;
      if (hovered && raycaster.current) {
        raycaster.current.setFromCamera(state.pointer, state.camera);
        safeRaycaster = raycaster.current;
      }

      const intersections = safeRaycaster.intersectObject(main.current);
      if (intersections.length > 0) {
        let target = intersections[0].object;
        while(target.parent && !target.userData.crewId) {
          target = target.parent;
        }
        shouldBeHovered = target.userData.crewId;
      }
      if (hovered !== shouldBeHovered) {
        setHovered(shouldBeHovered);
      }
    }
  }, 0.5);

  return null;
};

export default Crews;
