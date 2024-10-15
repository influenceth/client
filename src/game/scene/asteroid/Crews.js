import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CubicBezierCurve3,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Line,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  Raycaster,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TextureLoader,
  Vector3
} from 'three';
import { Address, Asteroid, Crewmate, Entity, Lot, Time } from '@influenceth/sdk';
import { useHistory } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import cloneDeep from 'lodash/cloneDeep';

import { appConfig } from '~/appConfig';
import { BLOOM_LAYER } from '~/game/Postprocessor';
import useBlockTime from '~/hooks/useBlockTime';
import useGetActivityConfig from '~/hooks/useGetActivityConfig';
import activities, { hydrateActivities } from '~/lib/activities';
import api from '~/lib/api';
import { getCrewAbilityBonuses, locationsArrToObj } from '~/lib/utils';
import theme from '~/theme';

import frag from './shaders/delivery.frag';
import vert from './shaders/delivery.vert';
import useStore from '~/hooks/useStore';
import useCrewContext from '~/hooks/useCrewContext';
import useSession from '~/hooks/useSession';

// TODO: remove this when done testing
import debugData from './debugData';
const now = Math.floor(Date.now() / 1000);
const debug = debugData
  .filter((d) => !!d.data.crew.Crew)
  .slice(0, 250)
  .map((d) => {
    const behind = Math.floor(Math.random() * 10 * 3600);
    const ahead = Math.floor(Math.random() * 10 * 3600);
    d.event.timestamp = now - behind;
    d.data.crew.Crew.lastReadyAt = now - behind;
    d.data.crew.Crew.readyAt = now + ahead;
    return d;
  });
// console.log(debugData);

const hopperRadius = 400;
const arcColor = new Color(theme.colors.glowGreen);
const hopperColor = new Color(theme.colors.glowGreen);
const spriteBorderColor = new Color(theme.colors.glowGreen);
const activeCrewColor = new Color(0xffffff);
const hoverColor = new Color(theme.colors.success);

const Crews = ({ attachTo: overrideAttachTo, asteroidId, cameraAltitude, getLotPosition, radius }) => {
  const blockTime = useBlockTime();
  const getActivityConfig = useGetActivityConfig();
  const queryClient = useQueryClient();
  const history = useHistory();
  const { controls, gl, scene } = useThree();
  const { crew, crewMovementActivity } = useCrewContext();
  const { accountAddress } = useSession();

  const activeCrewsDisplay = useStore((s) => s.gameplay.activeCrewsDisplay);
  
  const attachTo = useMemo(() => overrideAttachTo || scene, [overrideAttachTo, scene]);
  const textureLoader = useRef(new TextureLoader());

  // Calculates the control point for the bezier curve
  const calculateControlPoint = useCallback((origin, dest, distance, frac = 0.5) => {
    const ratio = 1 + Math.pow(distance / radius, 2);
    return origin.clone().lerp(dest, frac).multiplyScalar(Math.min(ratio, 3.5));
  }, [radius]);


  // TODO: would be nice to include a crew filter on this rather than post-processing to
  //  apply the activeCrewsDisplay filter... then we could also drop crewMovementActivity probably
  //  and just use this with the crews included
  const { data: ongoing, isLoading } = useQuery(
    [ 'activities', 'ongoing', asteroidId ],
    async () => {
      // const ongoingActivities = await api.getOngoingActivities(
      //   Entity.packEntity({ label: Entity.IDS.ASTEROID, id: asteroidId }),
      //   Object.keys(activities).filter((k) => !!activities[k].getVisitedLot)
      // );
      // TODO: remove below, reinstate above when done testing
      const ongoingActivities = cloneDeep(debug);
      await hydrateActivities(ongoingActivities, queryClient)
      return ongoingActivities;
    },
    {
      enabled: !!(asteroidId && activeCrewsDisplay !== 'selected')
    }
  );

  // define the travel params from the ongoing activities
  const ongoingTravel = useMemo(() => {
    const crews = {};

    // make sure selected crew is included (in case not on page OR in 'selected' mode)
    const ongoingActivities = ongoing || [];
    if (crewMovementActivity?.data?.crew?.id && !ongoingActivities.find((a) => a.data.crew.id === crewMovementActivity.data.crew.id)) {
      const crewLocation = locationsArrToObj(crewMovementActivity.data.crew.Location?.locations || []) || {};
      if (crewLocation.asteroidId === asteroidId) {
        ongoingActivities.push(crewMovementActivity);
      }
    }    

    ongoing?.forEach((activity) => {
      const crew = activity.data.crew;
      if (activeCrewsDisplay === 'selected' && accountAddress && crew.id !== crewMovementActivity?.data?.crew?.id) return;
      if (activeCrewsDisplay === 'delegated' && accountAddress && !Address.areEqual(crew.Crew.delegatedTo, accountAddress)) return;

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
    });

    return crews;
  }, [accountAddress, activeCrewsDisplay, asteroidId, blockTime, crewMovementActivity, ongoing]);

  // static stuffs
  const main = useRef(new Group());
  const arcTime = useRef({ value: 0 });
  const hopperGeometry = useRef();
  const hopperMaterial = useRef();
  const activeCrewMarker = useRef();
  const highlightedCrewMarker = useRef();
  const activeCrewArc = useRef();
  const highlightedCrewArc = useRef();
  const nullArcGeometry = useRef(() => new BufferGeometry().setFromPoints([new Vector3(0, 0, 0)]));
  useEffect(() => {
    // init hopper geometry and material for instanced mesh
    hopperGeometry.current = new SphereGeometry(hopperRadius, 32, 32);
    hopperMaterial.current = new ShaderMaterial({
      uniforms: { uTime: arcTime.current, },
      vertexShader: `
        attribute vec3 aInstanceColor;
        attribute float aOffset;
        varying vec3 vInstanceColor;
        varying float vOffset;

        void main() {
          vInstanceColor = aInstanceColor;
          vOffset = aOffset;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vInstanceColor;
        varying float vOffset;
        void main() {
          // float opacity = (sin((uTime + vOffset) / 33.) + 1.) * 0.4 + 0.1;
          float opacity = min(1.,(sin((uTime + vOffset) / 30.) + 1.) * 0.75 + 0.1); // cuts off the top at 1, so fully "on" for longer
          gl_FragColor = vec4(vInstanceColor, opacity);
        }
      `,
      transparent: true,
    });

    // add basic scaffolding to the scene...
    attachTo.add(main.current);

    // add 2x trajectory arcs
    const arcOrder = new BufferAttribute(new Float32Array(Array(51).fill().map((_, i) => i + 1)), 1);
    [activeCrewArc.current, highlightedCrewArc.current] = [0, 1].map((i) => {
      const geometry = new BufferGeometry().setFromPoints(nullArcGeometry.current);
      geometry.setAttribute('order', arcOrder);
      return new Line(
        geometry,
        new ShaderMaterial({
          uniforms: {
            uTime: arcTime.current,
            uAlpha: { value: 1.0 },
            uCount: { value: 51 },
            uCol: { type: 'c', value: i === 0 ? activeCrewColor : arcColor },
          },
          fragmentShader: frag,
          vertexShader: vert,
          transparent: true,
          depthWrite: false
        })
      );
    });
    main.current.add(activeCrewArc.current);
    main.current.add(highlightedCrewArc.current);

    // add 2x crew indicators
    [activeCrewMarker.current, highlightedCrewMarker.current] = [0, 1].map((i) => {
      const bgSprite = new Sprite(
        new SpriteMaterial({
          color: i === 0 ? activeCrewColor : spriteBorderColor,
          map: textureLoader.current.load(`${process.env.PUBLIC_URL}/textures/crew-marker.png`),
          // depthTest: false,
          depthWrite: false,
        })
      );
      bgSprite.scale.set(850, 1159, 0);
      bgSprite.layers.enable(BLOOM_LAYER); // need this to hide bloomed things behind it (weird sprite thing)
      bgSprite.renderOrder = 1001;

      const sprite = new Sprite(
        new SpriteMaterial({
          color: 0xffffff,
          map: null,
          // depthTest: false,
          depthWrite: false,
          opacity: 0
        })
      );
      sprite.scale.set(750, 1000, 0);
      // sprite.position.set(50, 79, 0);
      sprite.renderOrder = 1002;

      const crewMarker = new Group();
      crewMarker.add(bgSprite);
      crewMarker.add(sprite);
      return crewMarker;
    });
    main.current.add(activeCrewMarker.current);
    main.current.add(highlightedCrewMarker.current);


    //
    // cleanup
    //
    return () => {
      if (hopperGeometry.current) {
        hopperGeometry.current.dispose();
      }
      if (hopperMaterial.current) {
        hopperMaterial.current.dispose();
      }
      main.current.traverse((node) => {
        if (node) {
          if (node.material) {
            if (node.material.map) {
              node.material.map.dispose();
            }
            node.material.dispose();
          }
          if (node.geometry) {
            node.geometry.dispose();
          }
          main.current.remove(node);
        }
      });
      attachTo.remove(main.current);
    };
  }, []);

  // add hoppers for everything
  const hoppersMesh = useRef();
  const hopperColors = useRef();
  const hopperTally = useMemo(() => Object.values(ongoingTravel).filter((h) => !h.hideHopper).length, [ongoingTravel]);
  useEffect(() => {
    const offsets = new Float32Array(hopperTally);
    for (let i = 0; i < hopperTally; i++) offsets[i] = i;

    hopperColors.current = new Float32Array(hopperTally * 3);
    for (let i = 0; i < hopperTally; i++) {
      hopperColors.current[3 * i + 0] = hopperColor.r;
      hopperColors.current[3 * i + 1] = hopperColor.g;
      hopperColors.current[3 * i + 2] = hopperColor.b;
    }

    hoppersMesh.current = new InstancedMesh(hopperGeometry.current, hopperMaterial.current, hopperTally);
    hoppersMesh.current.geometry.setAttribute('aOffset', new InstancedBufferAttribute(offsets, 1));
    hoppersMesh.current.geometry.setAttribute('aInstanceColor', new InstancedBufferAttribute(hopperColors.current, 3));
    hoppersMesh.current.layers.enable(BLOOM_LAYER);
    
    activeCrewHopperIndex.current = -1;

    main.current.add(hoppersMesh.current);

    return () => {
      hoppersMesh.current.geometry.dispose();
      hoppersMesh.current.dispose();

      main.current.remove(hoppersMesh.current);
    };
  }, [hopperTally]);

  // handle textures for active crew indicator
  useEffect(() => {
    if (activeCrewMarker.current?.children?.[1]?.material) {
      if (crew?.id) {
        activeCrewMarker.current.children[1].material.map = textureLoader.current.load(`${appConfig.get('Api.influenceImage')}/v2/crews/${crew.id}/captain/image.png?bustOnly=true`);
        activeCrewMarker.current.children[1].material.opacity = 1;
        activeCrewMarker.current.children[1].material.needsUpdate = true;
      }
    }
    return () => {
      if (activeCrewMarker.current?.children?.[1]?.material) {
        if (activeCrewMarker.current.children[1].material.map) {
          activeCrewMarker.current.children[1].material.map.dispose();
        }

        activeCrewMarker.current.children[1].material.map = null;
        activeCrewMarker.current.children[1].material.opacity = 0;
        activeCrewMarker.current.children[1].material.needsUpdate = true;
      }
    }
  }, [crew?.id]);

  // add geometry for the active crew arc
  useEffect(() => {
    if (activeCrewArc.current) {
      activeCrewArc.current.geometry.setFromPoints(nullArcGeometry.current);
      if (ongoingTravel[crew?.id]?.curve) {
        activeCrewArc.current.geometry.setFromPoints(ongoingTravel[crew.id].curve.getPoints(50));
      }
    }
  }, [crew?.id, ongoingTravel]);

  // handle highlighted crew indicator and arc
  const [hovered, setHovered] = useState();
  const [selected, setSelected] = useState();
  const highlightedCrewId = hovered || selected;
  useEffect(() => {
    if (highlightedCrewArc.current && highlightedCrewMarker.current) {
      if (ongoingTravel[highlightedCrewId]?.curve) {
        highlightedCrewArc.current.geometry.setFromPoints(ongoingTravel[highlightedCrewId].curve.getPoints(50));

        if (highlightedCrewMarker.current?.children?.[0]?.material) {
          highlightedCrewMarker.current.children[0].material.opacity = 1;
          highlightedCrewMarker.current.children[0].material.needsUpdate = true;
        }
        if (highlightedCrewMarker.current?.children?.[1]?.material) {
          highlightedCrewMarker.current.children[1].material.map = textureLoader.current.load(`${appConfig.get('Api.influenceImage')}/v2/crews/${highlightedCrewId}/captain/image.png?bustOnly=true`);
          highlightedCrewMarker.current.children[1].material.opacity = 1;
          highlightedCrewMarker.current.children[1].material.needsUpdate = true;
        }
      }
    }
    return () => {
      if (highlightedCrewArc.current) {
        highlightedCrewArc.current.geometry.setFromPoints(nullArcGeometry.current);
      }
      if (highlightedCrewMarker.current?.children?.[0]?.material) {
        highlightedCrewMarker.current.children[0].material.opacity = 0;
        highlightedCrewMarker.current.children[0].material.needsUpdate = true;
      }
      if (highlightedCrewMarker.current?.children?.[1]?.material) {
        if (highlightedCrewMarker.current.children[1].material.map) {
          highlightedCrewMarker.current.children[1].material.map.dispose();
        }
        
        highlightedCrewMarker.current.children[1].material.map = null;
        highlightedCrewMarker.current.children[1].material.opacity = 0;
        highlightedCrewMarker.current.children[1].material.needsUpdate = true;
      }
    };
  }, [highlightedCrewId, ongoingTravel]);

  // handle card hover on highlighted crew
  const [cardHovered, setCardHovered] = useState();
  useEffect(() => {
    if (highlightedCrewMarker.current?.children?.[0]?.material) {
      highlightedCrewMarker.current.children[0].material.color.set(cardHovered ? hoverColor : spriteBorderColor);
    }
  }, [cardHovered]);

  // listen for click events (toggle hopper selection, click through to crew page)
  useEffect(() => {
    if (hovered || selected) {
      const onClick = (e) => {
        if (cardHovered) {
          history.push(`/crew/${selected}`)
        } else {
          setSelected(hovered === selected ? undefined : hovered);
        }
      };
      gl.domElement.addEventListener('pointerup', onClick, true);
      return () => {
        gl.domElement.removeEventListener('pointerup', onClick, true);
      };
    }
  }, [cardHovered, hovered, selected]);

  const crewMarkerScale = useMemo(() => Math.max(1, Math.sqrt(cameraAltitude / 7500)), [cameraAltitude]);
  const shouldBeActiveCrewHopperIndex = useMemo(() => 
    Object.keys(ongoingTravel).filter((c) => !ongoingTravel[c].hideHopper).findIndex((c) => Number(c) === crew?.id),
    [crew, ongoingTravel]
  );

  const raycaster = useRef(new Raycaster());
  const unselector = useRef();
  const cameraDirection = useRef(new Vector3());
  const crewIndicatorOffset = useRef(new Vector3());
  const activeCrewHopperIndex = useRef();
  const progressPosition = useRef(new Vector3());
  const inverseMatrix = useRef(new Matrix4());
  const instanceDummy = useRef(new Object3D());
  // const timing = useRef({ total: 0, tally: 0 });
  // useInterval(() => {
  //   console.log(`over ${timing.current.tally} iterations: ${(timing.current.total / timing.current.tally).toFixed(3)}ms`);
  // }, 1000);
  useFrame((state) => {
    // if arcs present, animate them
    if (arcTime.current) {
      arcTime.current.value += 1;
    }

    // move things along according to timing progress
    if (Object.keys(ongoingTravel).length) {
      // TODO: vvv this could probably be improved by thinking about screenspace vectors better
      // (i.e. could we just attach the sprites to the root scene and avoid all these transforms)
      // this takes ~0.15ms per frame, perhaps that is tolerable
      // const s = performance.now();
      attachTo.updateMatrixWorld();
      inverseMatrix.current.copy(attachTo.matrixWorld).invert();

      const screenUp = new Vector3(0, 1, 0).applyQuaternion(controls.object.quaternion).normalize();
      const localUp = screenUp.applyMatrix4(inverseMatrix.current);

      controls.object.getWorldDirection(cameraDirection.current);
      const localOut = cameraDirection.current.applyMatrix4(inverseMatrix.current);

      crewIndicatorOffset.current.addVectors(
        localUp.setLength(3 * hopperRadius * crewMarkerScale), // "north" from hopper
        localOut.setLength(-500) // towards camera (above surface)
      );
      
      // timing.current.total += performance.now() - s;
      // timing.current.tally++;
      // ^^^
      
      const hopperScale = crewMarkerScale * 0.25; // TODO: play with this
      const updateColors = shouldBeActiveCrewHopperIndex !== activeCrewHopperIndex.current;
      const crewsWithHoppers = Object.keys(ongoingTravel).filter((c) => !ongoingTravel[c].hideHopper);
      if (crewsWithHoppers.length > 0) {
        crewsWithHoppers.forEach((crewId, hopperIndex) => {
          const travel = ongoingTravel[crewId];
          const progress = ((Date.now() / 1000) - travel.departure) / travel.travelTime;
          travel.curve.getPointAt(Math.min(Math.max(0, progress), 1), progressPosition.current);

          instanceDummy.current.position.copy(progressPosition.current);
          instanceDummy.current.scale.set(hopperScale, hopperScale, hopperScale);
          instanceDummy.current.updateMatrix();
          hoppersMesh.current.setMatrixAt(hopperIndex, instanceDummy.current.matrix);

          if (updateColors) {
            const color = hopperIndex === shouldBeActiveCrewHopperIndex ? activeCrewColor : hopperColor;
            hopperColors.current[3 * hopperIndex + 0] = color.r;
            hopperColors.current[3 * hopperIndex + 1] = color.g;
            hopperColors.current[3 * hopperIndex + 2] = color.b;
          }

          if (Number(crewId) === crew?.id) {
            if (activeCrewMarker.current) {
              activeCrewMarker.current.scale.set(crewMarkerScale, crewMarkerScale, crewMarkerScale);
              activeCrewMarker.current.position.addVectors(progressPosition.current, crewIndicatorOffset.current);
            }
          }
          if (highlightedCrewMarker.current) {
            if (Number(crewId) === Number(highlightedCrewId)) {
              highlightedCrewMarker.current.scale.set(crewMarkerScale, crewMarkerScale, crewMarkerScale);
              highlightedCrewMarker.current.position.addVectors(progressPosition.current, crewIndicatorOffset.current);
            }
          }
        });

        if (updateColors) {
          hoppersMesh.current.geometry.attributes.aInstanceColor.needsUpdate = true;
          activeCrewHopperIndex.current = shouldBeActiveCrewHopperIndex;
        }
        hoppersMesh.current.instanceMatrix.needsUpdate = true;
      }

      // handle mouseovers
      if (main.current?.children?.length > 0 && state.raycaster) {

        // not sure why useFrame's raycaster isn't working, probably because it's used more than once in the useFrame loop...
        // it catches intersections but then stops detecting the same ones without moving mouse... so we use a fallback 
        // raycaster while highlighted (but not all the time because it's expensive)
        let safeRaycaster = state.raycaster;
        if (hovered && raycaster.current) {
          raycaster.current.setFromCamera(state.pointer, state.camera);
          safeRaycaster = raycaster.current;
        }

        const intersections = safeRaycaster.intersectObject(hoppersMesh.current);
        const shouldBeHovered = intersections.length > 0 && crewsWithHoppers[intersections[0].instanceId];
        if (hovered !== shouldBeHovered) {
          if (shouldBeHovered) {
            clearTimeout(unselector.current);
            unselector.current = null;

            setHovered(shouldBeHovered);
          } else if (!unselector.current) {
            unselector.current = setTimeout(() => {
              setHovered();
              unselector.current = null;
            }, 500);
          }
        }

        const cardIntersections = safeRaycaster.intersectObject(highlightedCrewMarker.current);
        setCardHovered(cardIntersections.length > 0);
      }
    }
  }, 0.5);

  return null;
};

export default Crews;
