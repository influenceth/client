import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Box3, Sphere, DoubleSide, AxesHelper, CameraHelper, DirectionalLight, DirectionalLightHelper, BufferAttribute, MeshPhongMaterial, PlaneGeometry, Mesh, Group } from 'three';
import { CSM } from 'three/examples/jsm/csm/CSM';
import { CSMHelper } from 'three/examples/jsm/csm/CSMHelper';
import gsap from 'gsap';
import { KeplerianOrbit } from 'influence-utils';

import useStore, { middleware } from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import useWebWorker from '~/hooks/useWebWorker';
import Config from '~/lib/asteroidConfig';
import constants from '~/lib/constants';
import QuadtreeTerrainCube from './asteroid/helpers/QuadtreeTerrainCube';
import Rings from './asteroid/Rings';

const {
  MIN_FRUSTUM_AT_SURFACE,
  CHUNK_SPLIT_DISTANCE,
  UPDATE_QUADTREE_EVERY,
  ENABLE_CSM
} = constants;
const UPDATE_DISTANCE_MULT = CHUNK_SPLIT_DISTANCE * UPDATE_QUADTREE_EVERY;

const MAP_RENDER_TIME_PER_CYCLE = 8;
const INITIAL_ZOOM = 2;
const MIN_ZOOM_DEFAULT = 1.2;
const MAX_ZOOM = 4;
const DEBUG_CSM = false;

// TODO: remove debug
let totalRuns = 0;
let totals = {};
let startTime;
let first = true;
function benchmark(tag) {
  if (!tag) {
    startTime = Date.now();
    totalRuns++;
  }
  else {
    if (!totals[tag]) totals[tag] = { total: 0, max: 0 };
    const t = Date.now() - startTime;

    totals[tag].total += t;
    if (t > totals[tag].max) totals[tag].max = t;
  }
}

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

let taskTotal = 0;
let taskTally = 0;
setInterval(() => {
  if (taskTally > 0) {
    console.log(
      `avg update time (over ${taskTally}): ${Math.round(taskTotal / taskTally)}ms`,
    );
  }
}, 5000);

let terrainUpdateStart; // TODO: remove

const Asteroid = (props) => {
  const { camera, controls, gl, raycaster, scene } = useThree();
  const origin = useStore(s => s.asteroids.origin);
  const time = useStore(s => s.time.precise);
  const { textureSize } = middleware.terrainQuality(useStore(s => s.graphics.textureQuality));
  const { shadowSize, shadowMode } = middleware.shadowQuality(useStore(s => s.graphics.shadowQuality));
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomedFrom = useStore(s => s.asteroids.zoomedFrom);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const setZoomedFrom = useStore(s => s.dispatchAsteroidZoomedFrom);
  const { data: asteroidData } = useAsteroid(origin);

  const webWorkerPool = useWebWorker();

  const [config, setConfig] = useState();
  const [terrainUpdateNeeded, setTerrainUpdateNeeded] = useState();

  const debug = useRef();
  const geometry = useRef();
  const quadtreeRef = useRef();
  const group = useRef();
  const light = useRef();
  const asteroidOrbit = useRef();
  const rotationAxis = useRef();
  const position = useRef();
  const rotation = useRef(0);
  const csmHelper = useRef(); // TODO: remove
  const csmHelperFloor = useRef(); // TODO: remove
  const aspectRatio = useRef();
  const settingCameraPosition = useRef();

  const maxStretch = useMemo(
    () => config?.stretch ? Math.max(config.stretch.x, config.stretch.y, config.stretch.z) : 1
    [config?.stretch]
  );
  const minStretch = useMemo(
    () => config?.stretch ? Math.min(config.stretch.x, config.stretch.y, config.stretch.z) : 1
    [config?.stretch]
  );
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
    if (geometry.current?.csm) {
      geometry.current.csm.remove();
      geometry.current.csm.dispose();
      geometry.current.csm = undefined;
    }
    if (group.current && csmHelper.current) {
      group.current.remove(csmHelper.current);
    }
    if (group.current && csmHelperFloor.current) {
      group.current.remove(csmHelperFloor.current);
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
  }, []);

  const onUnload = useCallback(() => {
    setConfig();
    asteroidOrbit.current = null;
    rotationAxis.current = null;
    position.current = null;
    rotation.current = null;
    disposeLight();
    disposeGeometry();
  }, []);

  // Update texture generation config when new asteroid data is available
  useEffect(() => {
    // when asteroidData is loaded for selected asteroid...
    if (asteroidData && asteroidData.asteroidId === origin) {

      // init config
      const c = new Config(asteroidData);
      setConfig(c);

      // init orbit, position, and rotation
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
    if (ENABLE_CSM && shadowMode === 2) {
      intendedShadowMode = `${textureSize}_CSM${shadowSize}`;
    } else if (shadowMode > 0) {
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
    const lightDistance = config.radius * 10;
    const lightDirection = posVec.clone().normalize();
    const lightIntensity = constants.STAR_INTENSITY / (posVec.length() / constants.AU);
    const maxRadius = ringsPresent
      ? config.radius * 1.5
      : config.radius * maxStretch;
    
    //
    // CSM setup
    //
    if (ENABLE_CSM && shadowMode === 2) {
      // TODO: could potentially add higher multiple to smallest distance
      // TODO: does number of cascades impact performance? if not, we should definitely add more

      // setup cascades
      const minSurfaceDistance = Math.min(surfaceDistance, (MIN_ZOOM_DEFAULT - 1) * config.radius);
      const cascadeConfig = [];
      cascadeConfig.unshift(MAX_ZOOM);
      // cascadeConfig.unshift(INITIAL_ZOOM - minStretch);
      // const midCascade = 8 * minSurfaceDistance / config.radius;
      // if (midCascade < cascadeConfig[0]) cascadeConfig.unshift(midCascade);
      // cascadeConfig.unshift(2 * minSurfaceDistance / config.radius);

      // init CSM
      const csm = new CSM({
        fade: true,
        maxFar: config.radius * MAX_ZOOM,
        cascades: cascadeConfig.length,
        mode: 'custom',
        customSplitsCallback: (cascades, near, far, target) => {
          cascadeConfig.forEach((r) => target.push(r / MAX_ZOOM));
        },
        shadowMapSize: shadowSize,
        lightColor,
        lightDirection,
        lightIntensity,
        lightNear: 1,
        lightFar: 10 * config.radius,
        camera,
        parent: group.current
      });
      geometry.current.setCSM(csm);
      geometry.current.setShadowsEnabled(true);

      // TODO: remove this
      if (DEBUG_CSM) {
        csmHelper.current = new CSMHelper(csm);
        csmHelper.current.displayFrustum = true;
        csmHelper.current.displayPlanes = true;
        csmHelper.current.displayShadowBounds = true;
        group.current.add(csmHelper.current);
  
        const floorMaterial = new MeshPhongMaterial( { color: '#252a34' } );
        csm.setupMaterial( floorMaterial );
        csmHelperFloor.current = new Mesh(new PlaneGeometry( 100000, 100000, 8, 8 ), floorMaterial );
        csmHelperFloor.current.castShadow = true;
        csmHelperFloor.current.receiveShadow = true;
        group.current.add( csmHelperFloor.current );
      }

    //
    // Non-CSM setup
    //
    } else {
      
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
    }

    // set current shadowMode
    geometry.current.shadowMode = intendedShadowMode;

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
    controls.minDistance = config.radius * maxStretch * MIN_ZOOM_DEFAULT;
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

  // NOTE: raycasting technically *might* be more accurate here, but it's way less performant
  //       (3ms+ for just closest mesh... if all quadtree children, closer to 20ms) and need
  //       to incorporate geometry shrink returned intersection distance
  const applyingZoomLimits = useRef(0);
  const applyZoomLimits = useCallback((cameraPosition, chunks) => {
    if (!config?.radius) return;
    applyingZoomLimits.current = true;
    setTimeout(() => {
      // vvv BENCHMARK <1ms (even zoomed-in on huge)
      const [closestChunk, closestDistance] = chunks.reduce((acc, c) => {
        return (!acc || c.distanceToCamera < acc[1]) ? [c, c.distanceToCamera] : acc;
      }, null);

      const minDistance = Math.min(
        config?.radius * INITIAL_ZOOM,  // (for smallest asteroids where initial zoom > min surface distance)
        closestChunk.sphereCenterHeight + surfaceDistance
      );
      
      // too close, so should animate camera out (jump to surface immediately though)
      if (minDistance > controls.minDistance && closestDistance < surfaceDistance) {
        controls.minDistance = Math.max(cameraPosition.length(), closestChunk.sphereCenterHeight);
        applyingZoomLimits.current = minDistance - controls.minDistance;

      // can just set
      } else {
        controls.minDistance = minDistance;
        applyingZoomLimits.current = false;
      }
      // ^^^
    }, 0);
  }, [surfaceDistance, config?.radius]);

  useEffect(() => {
    if (geometry.current && terrainUpdateNeeded) {
      // vvv BENCHMARK 2ms (zoomed-out), 7-20ms+ (zoomed-in)
      geometry.current.setCameraPosition(terrainUpdateNeeded);
      settingCameraPosition.current = false;
      // ^^^
    }
  }, [terrainUpdateNeeded]);

  // Positions the asteroid in space based on time changes
  useFrame(() => {
    if (!asteroidData) return;
    if (!geometry.current?.builder?.ready) return;
    if (zoomStatus === 'out') return;

    // vvv BENCHMARK <1ms
    // update asteroid position
    if (asteroidOrbit.current && time) {
      position.current = Object.values(asteroidOrbit.current.getPositionAtTime(time)).map(v => v * constants.AU);

      // update object and camera position
      // TODO: is this necessary every frame?
      const positionVec3 = new Vector3(...position.current);
      group.current.position.copy(positionVec3);
      positionVec3.negate();
      controls.targetScene.position.copy(positionVec3);
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
        rotation.current = updatedRotation;
      }
    }

    // (if currently zooming in, we'll want to setCameraPosition for camera's destination so doesn't
    //  re-render as soon as it arrives)
    const rotatedCameraPosition = zoomStatus === 'zooming-in'
      ? controls.object.position.clone().normalize().multiplyScalar(config.radius * INITIAL_ZOOM)
      : controls.object.position.clone();
    rotatedCameraPosition.applyAxisAngle(rotationAxis.current, -rotation.current);
    // ^^^

    // if builder is not busy, make sure we are showing most recent chunks
    if (geometry.current.builder.isPreparingUpdate()) {
      if (geometry.current.builder.isReadyToFinish()) {
        // vvv BENCHMARK 1ms
        geometry.current.builder.update();
        
        // TODO: remove below
        if (taskTally === 9) {  // overwrite first load since so long for workers
          taskTotal = 10 * (Date.now() - terrainUpdateStart);
        } else {
          taskTotal += Date.now() - terrainUpdateStart;
        }
        taskTally++;
        terrainUpdateStart = null;
        // ^^^

      // (this is used if maps are generated on main thread instead of worker)
      } else {
        // vvv BENCHMARK 8ms (matches MAP_RENDER_TIME_PER_CYCLE)
        geometry.current.builder.updateMaps(Date.now() + MAP_RENDER_TIME_PER_CYCLE);
        // ^^^
      }
    }
    
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
      }
    }

    if (geometry.current?.csm) {
      // vvv BENCHMARK <1ms
      geometry.current.csm.update();
      const updatedAspect = window.innerWidth / window.innerHeight;
      if (aspectRatio.current !== updatedAspect) {
        aspectRatio.current = updatedAspect;
        geometry.current.csm.updateFrustums();
      }
      // ^^^
      if (csmHelper.current) {
        csmHelper.current.update();
      }
    }

    // TODO: remove debug
    // if (debug.current) {
    //   debug.current.setRotationFromAxisAngle(
    //     new Vector3(0, 1, 0),
    //     Math.PI
    //   );
    // }
    // setTimeout(() => {
    //   const debugInfo = document.getElementById('debug_info');
    //   if (!!debugInfo && config?.radius) {
    //     debugInfo.innerText = (controls.object.position.length() / config?.radius).toFixed(2);
    //   } else {
    //     console.log('#debug_info not found!');
    //   }
    // });
  });

  return (
    <group ref={group}>
      <group ref={quadtreeRef} />
      {/* TODO: need to pass in CSM to rings probably */}
      {config?.ringsPresent && geometry.current && (
        <Rings
          receiveShadow={shadowMode > 0}
          config={config}
          onUpdate={(m) => m.lookAt(rotationAxis?.current)} />
      )}
      {/* TODO: remove all helpers */}
      {false && (
        <mesh>
          <sphereGeometry args={[14350]} />
          <meshStandardMaterial color={0x0000ff} opacity={0.8} transparent={true} />
        </mesh>
      )}
      {false && (
        <points ref={debug}>
          <pointsMaterial attach="material" size={100} sizeAttenuation={true} color={0xff0000} />
        </points>
      )}
      {false && geometry.current?.csm && geometry.current.csm.lights.map((light, i) => (
        <Fragment key={`helper_${i}`}>
          {false && <primitive object={new DirectionalLightHelper(light, 2 * config?.radius)} />}
          {true && light?.shadow?.camera && <primitive object={new CameraHelper(light.shadow.camera)} />}
        </Fragment>
      ))}
      {false && light.current?.shadow?.camera && <primitive object={new CameraHelper(light.current.shadow.camera)} />}
      {false && <primitive object={new AxesHelper(config?.radius * 2)} />}
      {false && <ambientLight intensity={0.3} />}
    </group>
  );
}

export default Asteroid;