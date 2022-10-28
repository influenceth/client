import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  // BufferAttribute,
  AxesHelper,
  CameraHelper,
  DirectionalLight,
  DirectionalLightHelper,
  Vector3
} from 'three';
import gsap from 'gsap';
import { KeplerianOrbit, toSpectralType } from 'influence-utils';

import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import useGetTime from '~/hooks/useGetTime';
import useWebWorker from '~/hooks/useWebWorker';
import Config from '~/lib/asteroidConfig';
import constants from '~/lib/constants';
import QuadtreeTerrainCube from './asteroid/helpers/QuadtreeTerrainCube';
import Plots from './asteroid/Plots';
import Rings from './asteroid/Rings';
import Telemetry from './asteroid/Telemetry';

const {
  MIN_FRUSTUM_AT_SURFACE,
  CHUNK_SPLIT_DISTANCE,
  UPDATE_QUADTREE_EVERY,
} = constants;

const UPDATE_DISTANCE_MULT = CHUNK_SPLIT_DISTANCE * UPDATE_QUADTREE_EVERY;

const MAP_RENDER_TIME_PER_CYCLE = 8;
const INITIAL_ZOOM = 2;
const MIN_ZOOM_DEFAULT = 1.2;
const MAX_ZOOM = 4;
const DIRECTIONAL_LIGHT_DISTANCE = 10;
const MOUSE_THROTTLE = 1000 / 30; // ms

// TODO: remove debug
// let totalRuns = 0;
// let totals = {};
// let startTime;
// let first = true;
// function benchmark(tag) {
//   if (!tag) {
//     startTime = Date.now();
//     totalRuns++;
//   }
//   else {
//     if (!totals[tag]) totals[tag] = { total: 0, max: 0 };
//     const t = Date.now() - startTime;

//     totals[tag].total += t;
//     if (t > totals[tag].max) totals[tag].max = t;
//   }
// }

// TODO: remove debug
// setInterval(() => {
//   if (first) {
//     first = false;
//     totalRuns = 0;
//     totals = {};
//     return;
//   }
//   const b = {};
//   let prevTime = 0;
//   Object.keys(totals).forEach((k) => {
//     const thisTime = Math.round(totals[k].total / totalRuns);
//     const thisMax = totals[k].max;
//     if (k === '_') {
//       b['TOTAL'] = thisTime;
//     } else {
//       b[k] = thisTime - prevTime;
//       prevTime = thisTime;
//       // b[`${k}_MAX`] = thisMax;
//     }
//   });
//   console.log(`b ${totalRuns}`, b);
// }, 5000);

// for terrain benchmarking...
const BENCHMARK_TERRAIN_UPDATES = false;
let taskTotal = 0;
let taskTally = 0;
if (BENCHMARK_TERRAIN_UPDATES) {
  setInterval(() => {
    if (taskTally > 0) {
      console.log(
        `avg update time (over ${taskTally}): ${Math.round(taskTotal / taskTally)}ms`,
      );
    }
  }, 5000);
}

let terrainUpdateStart; // TODO: remove

const Asteroid = (props) => {
  const { controls } = useThree();
  const origin = useStore(s => s.asteroids.origin);
  const { textureSize } = useStore(s => s.getTerrainQuality());
  const { shadowSize, shadowMode } = useStore(s => s.getShadowQuality());
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomedFrom = useStore(s => s.asteroids.zoomedFrom);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const setZoomedFrom = useStore(s => s.dispatchAsteroidZoomedFrom);
  const { data: asteroidData } = useAsteroid(origin);

  const getTime = useGetTime();
  const webWorkerPool = useWebWorker();

  const [cameraNormalized, setCameraNormalized] = useState();
  const [config, setConfig] = useState();
  const [mousableTerrainInitialized, setMousableTerrainInitialized] = useState();
  const [terrainInitialized, setTerrainInitialized] = useState();
  const [terrainUpdateNeeded, setTerrainUpdateNeeded] = useState();

  const debug = useRef(); // TODO: remove
  const geometry = useRef();
  const quadtreeRef = useRef();
  const group = useRef();
  const light = useRef();
  const darkLight = useRef();
  const asteroidOrbit = useRef();
  const rotationAxis = useRef();
  const position = useRef();
  const rotation = useRef(0);
  const settingCameraPosition = useRef();
  const mouseGeometry = useRef();
  const mouseableRef = useRef();
  const mouseIntersect = useRef(new Vector3());
  const lastMouseUpdate = useRef(0);

  const maxStretch = useMemo(
    () => config?.stretch ? Math.max(config.stretch.x, config.stretch.y, config.stretch.z) : 1,
    [config?.stretch]
  );
  // const minStretch = useMemo(
  //   () => config?.stretch ? Math.min(config.stretch.x, config.stretch.y, config.stretch.z) : 1,
  //   [config?.stretch]
  // );
  const ringsPresent = useMemo(() => !!config?.ringsPresent, [config?.ringsPresent]);
  const surfaceDistance = useMemo(
    () => (MIN_FRUSTUM_AT_SURFACE / 2) / Math.tan((controls?.object?.fov / 2) * (Math.PI / 180)),
    [controls?.object?.fov]
  );

  const disposeGeometry = useCallback(() => {
    if (geometry.current && quadtreeRef.current) {
      geometry.current.groups.forEach((g) => {
        quadtreeRef.current.remove(g);
      });
    }
    if (mouseGeometry.current && mouseableRef.current) {
      mouseGeometry.current.groups.forEach((g) => {
        mouseableRef.current.remove(g);
      });
    }
    if (mouseGeometry.current) {
      mouseGeometry.current.dispose();
      mouseGeometry.current = null;
    }
    if (geometry.current) {
      geometry.current.dispose();
      geometry.current = null;
    }
  }, []);

  const disposeLight = useCallback(() => {
    if (group.current && light.current) {
      group.current.remove(light.current);
    }
    if (light.current) {
      light.current.dispose();
      light.current = null;
    }

    if (group.current && darkLight.current) {
      group.current.remove(darkLight.current);
    }
    if (darkLight.current) {
      darkLight.current.dispose();
      darkLight.current = null;
    }
  }, []);

  const onUnload = useCallback(() => {
    setConfig();
    asteroidOrbit.current = null;
    rotationAxis.current = null;
    position.current = null;
    rotation.current = null;
    disposeLight();
    disposeGeometry();
  }, [disposeLight, disposeGeometry]);

  // Update texture generation config when new asteroid data is available
  useEffect(() => {
    // when asteroidData is loaded for selected asteroid...
    if (asteroidData && asteroidData.asteroidId === origin) {

      // init config
      const c = new Config(asteroidData);
      setConfig(c);

      // init orbit, position, and rotation
      const time = getTime();
      asteroidOrbit.current = new KeplerianOrbit(asteroidData.orbital);
      rotationAxis.current = c.seed.clone().normalize();
      position.current = Object.values(asteroidOrbit.current.getPositionAtTime(time)).map(v => v * constants.AU);
      rotation.current = time * c.rotationSpeed * 2 * Math.PI;

      // if geometry.current already exists, dispose first
      if (geometry.current) disposeGeometry();
      geometry.current = new QuadtreeTerrainCube(origin, c, textureSize, webWorkerPool);
      geometry.current.groups.forEach((g) => {
        quadtreeRef.current.add(g);
      });

      if (mouseGeometry.current) disposeGeometry();
      mouseGeometry.current = new QuadtreeTerrainCube(
        origin,
        c,
        null, // textureSize defaults to heightSampling resolution
        webWorkerPool,
        {
          opacity: 0,
          transparent: true
        }
      );
      mouseGeometry.current.groups.forEach((g) => {
        mouseableRef.current.add(g);
      });

    // cleanup if no data
    } else {
      onUnload();
      if (zoomStatus === 'in') updateZoomStatus('zooming-out');
    }

    // return cleanup
    return onUnload;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ asteroidData ]);

  // Configures the light component once the geometry is created
  useEffect(() => {
    if (!(config?.radius && config?.stretch && geometry.current && quadtreeRef.current && position.current)) return;

    // calculate intended shadow mode
    let intendedShadowMode = `${textureSize}`;
    if (shadowMode > 0) {
      intendedShadowMode = `${textureSize}_${shadowSize}`;
    }

    // if no changes, exit now
    if (geometry.current.shadowMode && geometry.current.shadowMode === intendedShadowMode) {
      return;
    }

    // must reinit geometry and lights entirely if already a shadow mode set
    if (geometry.current.shadowMode) {
      disposeGeometry();
      disposeLight();

      geometry.current = new QuadtreeTerrainCube(origin, config, textureSize, webWorkerPool);
      geometry.current.groups.forEach((g) => {
        quadtreeRef.current.add(g);
      });
    }

    // init params
    const posVec = new Vector3(...position.current);
    const lightColor = 0xffeedd;
    const lightDistance = config.radius * DIRECTIONAL_LIGHT_DISTANCE;
    const lightDirection = posVec.clone().normalize();
    const lightIntensity = constants.STAR_INTENSITY / (posVec.length() / constants.AU);

    const darkLightColor = 0xd8ddff;
    const darkLightDistance = config.radius * DIRECTIONAL_LIGHT_DISTANCE;
    const darkLightDirection = posVec.negate().clone().normalize();
    const darkLightIntensity = lightIntensity * 0.25;
    
    const maxRadius = ringsPresent
      ? config.radius * 1.5
      : config.radius * maxStretch;

    // create light
    light.current = new DirectionalLight(lightColor, lightIntensity);
    light.current.position.copy(lightDirection.negate().multiplyScalar(lightDistance));
    group.current.add(light.current);

    // if traditional shadows, update shadow camera
    if (shadowMode > 0) {
      light.current.castShadow = true;
      light.current.shadow.mapSize.width = shadowSize;
      light.current.shadow.mapSize.height = shadowSize;
      // light.current.shadow.bias = 1 / shadowSize;
      light.current.shadow.camera.near = lightDistance - maxRadius;
      light.current.shadow.camera.far = lightDistance + maxRadius;
      light.current.shadow.camera.bottom = light.current.shadow.camera.left = -maxRadius;
      light.current.shadow.camera.right = light.current.shadow.camera.top = maxRadius;
      light.current.shadow.camera.updateProjectionMatrix();
      geometry.current.setShadowsEnabled(true);
    } else {
      geometry.current.setShadowsEnabled(false);
    }

    // create "dark light"
    darkLight.current = new DirectionalLight(darkLightColor, darkLightIntensity);
    darkLight.current.position.copy(darkLightDirection.negate().multiplyScalar(darkLightDistance));
    group.current.add(darkLight.current);

    // set current shadowMode
    geometry.current.shadowMode = intendedShadowMode;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, ringsPresent, shadowMode, shadowSize, textureSize, surfaceDistance]);

  // Zooms the camera to the correct location
  const shouldZoomIn = zoomStatus === 'zooming-in' && controls && config?.radius;
  useEffect(() => {
    if (!shouldZoomIn) return;

    setZoomedFrom({
      scene: controls.targetScene.position.clone(),
      position: controls.object.position.clone(),
      up: controls.object.up.clone()
    });

    const panTo = new Vector3(...position.current);
    group.current?.position.copy(panTo);
    panTo.negate();
    const zoomTo = controls.object.position.clone().normalize().multiplyScalar(config.radius * INITIAL_ZOOM);

    const timeline = gsap.timeline({
      defaults: { duration: 2, ease: 'power4.out' },
      onComplete: () => updateZoomStatus('in')
    });

    // Pan the target scene to center the asteroid
    timeline.to(controls.targetScene.position, { ...panTo }, 0);

    // Zoom in the camera to the asteroid
    timeline.to(controls.object.position, { ...zoomTo }, 0);

    // make sure can see asteroid as zoom
    controls.object.near = 100;
    controls.object.updateProjectionMatrix();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ shouldZoomIn ]);

  const shouldFinishZoomIn = zoomStatus === 'in' && controls && config?.radius;
  useEffect(() => {
    if (!shouldFinishZoomIn) return;

    // Update distances to maximize precision
    controls.minDistance = config.radius * MIN_ZOOM_DEFAULT;
    controls.maxDistance = config.radius * MAX_ZOOM;

    const panTo = new Vector3(...position.current);
    group.current?.position.copy(panTo);
    panTo.negate();
    const zoomTo = controls.object.position.clone().normalize().multiplyScalar(config.radius * INITIAL_ZOOM);
    controls.targetScene.position.copy(panTo);
    controls.object.position.copy(zoomTo);
    controls.object.near = 100;
    controls.object.updateProjectionMatrix();
    controls.noPan = true;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ shouldFinishZoomIn ]);

  // Handle zooming back out
  const shouldZoomOut = zoomStatus === 'zooming-out' && zoomedFrom && controls;
  useEffect(() => {
    if (!shouldZoomOut) return;

    controls.minDistance = 0;
    controls.maxDistance = 10 * constants.AU;

    const timeline = gsap.timeline({
      defaults: { duration: 2, ease: 'power4.in' },
      onComplete: () => {
        controls.targetScene.position.copy(zoomedFrom.scene);
        controls.object.position.copy(zoomedFrom.position);
        controls.object.up.copy(zoomedFrom.up);
        controls.object.near = 1000000;
        controls.object.updateProjectionMatrix();
        controls.noPan = false;
        updateZoomStatus('out');
      }
    });

    // Pan the scene back to the original orientation
    timeline.to(controls.targetScene.position, { ...zoomedFrom.scene }, 0);

    // Zoom the camera out and put it right side up
    timeline.to(controls.object.position, { ...zoomedFrom.position }, 0);
    timeline.to(controls.object.up, { ...zoomedFrom.up }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ shouldZoomOut ]);

  // NOTE: in theory, all distances between sphereCenter's to camera are calculated
  //       in quadtree calculation and could be passed back here, so would be more
  //       performant to re-use that BUT that is also outdated as the camera moves
  //       until the quads are recalculated
  // NOTE: raycasting technically *might* be more accurate here, but it's way less performant
  //       (3ms+ for just closest mesh... if all quadtree children, closer to 20ms)
  const applyingZoomLimits = useRef(0);
  const applyZoomLimits = useCallback((cameraPosition, chunks) => {
    if (!config?.radius) return;
    applyingZoomLimits.current = true;
    setTimeout(() => {
      // vvv BENCHMARK <1ms (even zoomed-in on huge)
      const [closestChunk, closestDistance] = chunks.reduce((acc, c) => {
        const distance = c.sphereCenter.distanceTo(cameraPosition);
        return (!acc || distance < acc[1]) ? [c, distance] : acc;
      }, null);

      const minDistance = Math.min(
        config?.radius * MIN_ZOOM_DEFAULT,  // for smallest asteroids to match legacy (where this > min surface distance)
        closestChunk.sphereCenterHeight + surfaceDistance
      );
      
      // too close, so should animate camera out (jump to surface immediately though)
      if (minDistance > controls?.minDistance && closestDistance < surfaceDistance) {
        controls.minDistance = Math.max(cameraPosition.length(), closestChunk.sphereCenterHeight);
        applyingZoomLimits.current = minDistance - controls?.minDistance;

      // else, can just set
      } else {
        controls.minDistance = minDistance;
        applyingZoomLimits.current = false;
      }
      // ^^^
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surfaceDistance, config?.radius, controls?.minDistance]);

  useEffect(() => {
    if (geometry.current && terrainUpdateNeeded) {
      // vvv BENCHMARK 2ms (zoomed-out), 7-20ms+ (zoomed-in)
      geometry.current.setCameraPosition(terrainUpdateNeeded);
      settingCameraPosition.current = false;
      // ^^^
    }
  }, [terrainUpdateNeeded]);

  // once terrain is loaded, load the mouse-interactive terrain
  // TODO (enhancement): re-use the heightSample buffer from the primary terrain cube
  useEffect(() => {
    if (mouseGeometry.current && terrainInitialized) {
      // if terrain initialized, make exportable
      // TODO (enhancement): ideally would do this in webworker, but just doing once,
      //  so hopefully is not noticeable
      if (mousableTerrainInitialized) {
        // const scale = Math.min(1.02, (config.radius + 100) / config.radius);
        Object.values(mouseGeometry.current.chunks).forEach(({ chunk }) => {
          chunk.makeExportable();
          // chunk._geometry.scale(scale, scale, scale);
        });

      // kick off initialization (from a far away distance so only one chunk per side)
      } else {
        mouseGeometry.current.setCameraPosition(new Vector3(0, 0, constants.AU));
      }
    }
  }, [terrainInitialized, mousableTerrainInitialized]);

  // Positions the asteroid in space based on time changes
  useFrame((state) => {
    if (!asteroidData) return;
    if (!geometry.current?.builder?.ready) return;

    // vvv BENCHMARK <1ms
    // update asteroid position
    const time = getTime();
    if (asteroidOrbit.current && time) {
      position.current = Object.values(asteroidOrbit.current.getPositionAtTime(time)).map(v => v * constants.AU);

      // update object and camera position (if zoomed in)
      if (zoomStatus === 'in') {
        const positionVec3 = new Vector3(...position.current);
        group.current.position.copy(positionVec3);
        positionVec3.negate();
        controls.targetScene.position.copy(positionVec3);
      }

      // update light position (since asteroid has moved around star)
      if (zoomStatus !== 'out') {
        if (light.current) {
          light.current.position.copy(
            new Vector3(...position.current).normalize().negate().multiplyScalar(config.radius * DIRECTIONAL_LIGHT_DISTANCE)
          );
        }
        if (darkLight.current) {
          darkLight.current.position.copy(
            new Vector3(...position.current).normalize().multiplyScalar(config.radius * DIRECTIONAL_LIGHT_DISTANCE)
          );
        }
      }
    }

    // update asteroid rotation
    let updatedRotation = rotation.current;
    if (config?.rotationSpeed && time) {
      updatedRotation = time * config.rotationSpeed * 2 * Math.PI
      // updatedRotation = 0; // TODO: remove
      if (updatedRotation !== rotation.current) {
        quadtreeRef.current.setRotationFromAxisAngle(
          rotationAxis.current,
          updatedRotation
        );
        mouseableRef.current.setRotationFromAxisAngle(
          rotationAxis.current,
          updatedRotation
        );
        // if (debug.current) {  // TODO: remove debug
        //   debug.current.setRotationFromAxisAngle(
        //     rotationAxis.current,
        //     updatedRotation
        //   );
        // }
        rotation.current = updatedRotation;
      }
    }

    // (if currently zooming in, we'll want to setCameraPosition for camera's destination so doesn't
    //  re-render as soon as it arrives)
    const rotatedCameraPosition = zoomStatus === 'in' || !config?.radius
      ? controls.object.position.clone()
      : controls.object.position.clone().normalize().multiplyScalar(config.radius * INITIAL_ZOOM);
    rotatedCameraPosition.applyAxisAngle(rotationAxis.current, -rotation.current);
    // ^^^

    // if builder is not busy, make sure we are showing most recent chunks
    if (geometry.current.builder.isPreparingUpdate()) {
      if (geometry.current.builder.isReadyToFinish()) {
        // vvv BENCHMARK 1ms
        geometry.current.builder.update();

        // let state know terrain has done initial render
        if (!terrainInitialized) setTerrainInitialized(true);
        
        // TODO: remove below
        if (BENCHMARK_TERRAIN_UPDATES) {
          if (taskTally < 5) {  // overwrite first load since so long for workers
            taskTotal = 5 * (Date.now() - terrainUpdateStart);
          } else {
            taskTotal += Date.now() - terrainUpdateStart;
          }
          taskTally++;
          terrainUpdateStart = null;
        }
        // ^^^

        // if (debug.current) {
        //   const vertices = Object.values(geometry.current.chunks)
        //     .map((c) => c.sphereCenter.clone().addScalar(1))
        //     .reduce((acc, cur) => {
        //       acc.push(cur.x);
        //       acc.push(cur.y);
        //       acc.push(cur.z);
        //       return acc;
        //     }, [])
        //   ;
        //   debug.current.geometry.setAttribute('position', new BufferAttribute( new Float32Array(vertices), 3 ) );
        //   debug.current.geometry.attributes.position.needsUpdate = true;
        // }

      // (this is used if maps are generated on main thread instead of worker)
      } else {
        // vvv BENCHMARK 8ms (matches MAP_RENDER_TIME_PER_CYCLE)
        geometry.current.builder.updateMaps(Date.now() + MAP_RENDER_TIME_PER_CYCLE);
        // ^^^
      }
    }
    if (mouseGeometry.current && mouseGeometry.current.builder.isPreparingUpdate()) {
      if (mouseGeometry.current.builder.isReadyToFinish()) {
        mouseGeometry.current.builder.update();
        if (!mousableTerrainInitialized) setMousableTerrainInitialized(true);
      } else {
        mouseGeometry.current.builder.updateMaps(Date.now() + MAP_RENDER_TIME_PER_CYCLE);
      }
    }

    // if zoomed out, let run once to prerender, but then don't run the rest of the frame
    if (geometry.current.cameraPosition && (zoomStatus === 'out' || zoomStatus === 'zooming-out')) return;
    
    // control dynamic zoom limit (zoom out if too low... else, just update boundary)
    if (controls && Object.values(geometry.current?.chunks).length) {
      if (applyingZoomLimits.current) {
        if (applyingZoomLimits.current !== true) {
          const amount = Math.max(5, applyingZoomLimits.current / 10);
          applyingZoomLimits.current = Math.max(0, applyingZoomLimits.current - amount);
          controls.minDistance += amount;
        }
      } else {
        // vvv BENCHMARK <1ms
        applyZoomLimits(rotatedCameraPosition, Object.values(geometry.current.chunks));
        // ^^^
      }
    }
    
    // update quads if not already updating AND one of these is true...
    //  a) camera height changes by UPDATE_DISTANCE_MULT
    //  b) camera position changes by rotational equivalent of UPDATE_DISTANCE_MULT at maxStretch surface
    if (!settingCameraPosition.current && !geometry.current.builder.isBusy() && !geometry.current.builder.isPreparingUpdate()) {
      // vvv BENCHMARK <1ms
      const cameraHeight = rotatedCameraPosition.length();
      const updateQuadtreeEvery = geometry.current.smallestActiveChunkSize * UPDATE_DISTANCE_MULT;
      const updateQuadCube = !geometry.current.cameraPosition
        || Math.abs(geometry.current.cameraPosition.length() - cameraHeight) > updateQuadtreeEvery
        || geometry.current.cameraPosition.distanceTo(rotatedCameraPosition) > updateQuadtreeEvery * cameraHeight / (config.radius * maxStretch)
      ;
      // ^^^

      // initiate update of quads (based on camera position)
      if (updateQuadCube) {
        terrainUpdateStart = Date.now();
        settingCameraPosition.current = true;
        setTerrainUpdateNeeded(rotatedCameraPosition.clone());

        const normalized = rotatedCameraPosition.clone().normalize();
        setCameraNormalized({
          // toFixed allows accuracy without float precision weirdness causing unnecessary re-renders
          string: Object.values(normalized).map((v) => v.toFixed(6)).join(','),
          vector: normalized,
        });
      }
    }

    // raycast
    // TODO: would definitely be cheaper to use single prerendered mesh for this
    //  (but would need to overlay geometry, be transparent)
    // TODO (enhancement): probably don't need to do this every frame
    if (mousableTerrainInitialized && mouseableRef.current.children) {
      const now = Date.now();
      if (now - lastMouseUpdate.current >= MOUSE_THROTTLE) {
        lastMouseUpdate.current = now;
        try {
          const intersections = state.raycaster.intersectObjects(mouseableRef.current.children);
          if (intersections.length) {
            mouseIntersect.current.copy(intersections[0].point);
            mouseIntersect.current.applyAxisAngle(rotationAxis.current, -1 * rotation.current);
            mouseIntersect.current.divide(config.stretch);
            mouseIntersect.current.normalize();
          } else {
            // console.log('no intersection');
            mouseIntersect.current.setLength(0);
          }
        } catch (e) {
          console.warn(e);
        }
      }
    }

    // TODO: remove debug
    // setTimeout(() => {
    //   const debugInfo = document.getElementById('debug_info');
    //   if (!!debugInfo && config?.radius) {
    //     debugInfo.innerText = (controls.object.position.length() / config?.radius).toFixed(2);
    //   } else {
    //     console.log('#debug_info not found!');
    //   }
    // });
  });

  console.log('show plots', config && terrainInitialized && zoomStatus === 'in');
  return (
    <group ref={group}>
      <group ref={quadtreeRef} />
      <group ref={mouseableRef} />

      {config && terrainInitialized && zoomStatus === 'in' && (
        <Plots
          attachTo={quadtreeRef.current}
          axis={rotationAxis.current}
          cameraNormalized={cameraNormalized}
          config={config}
          mouseIntersect={mouseIntersect.current}
          surface={geometry.current} />
      )}

      {config?.radius && zoomStatus !== 'out' && (
        <Telemetry
          axis={rotationAxis.current}
          getPosition={() => position.current}
          getRotation={() => rotation.current}
          hasAccess={false}
          radius={config.radius}
          spectralType={toSpectralType(config.spectralType)}
        />
      )}

      {config?.ringsPresent && geometry.current && zoomStatus !== 'out' && (
        <Rings
          receiveShadow={shadowMode > 0}
          config={config}
          onUpdate={(m) => m.lookAt(rotationAxis?.current)} />
      )}

      {/* TODO: remove all helpers */}
      {false && (
        <mesh>
          <sphereGeometry args={[config?.radius * 1.25]} />
          <meshStandardMaterial color={0x0000ff} opacity={0.8} transparent={true} />
        </mesh>
      )}
      {false && (
        <points ref={debug}>
          <pointsMaterial attach="material" size={500} sizeAttenuation={true} color={0xff0000} />
        </points>
      )}
      {false && darkLight.current && (
        <primitive object={new DirectionalLightHelper(darkLight.current, 2 * config?.radius)} />
      )}
      {false && light.current?.shadow?.camera && <primitive object={new CameraHelper(light.current.shadow.camera)} />}
      {false && <primitive object={new AxesHelper(config?.radius * 2)} />}
      {false && <ambientLight intensity={0.3} />}
    </group>
  );
}

export default Asteroid;