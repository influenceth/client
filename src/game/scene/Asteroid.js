import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Box3, Sphere, DoubleSide, AxesHelper, CameraHelper, DirectionalLight, DirectionalLightHelper, BufferAttribute, MeshPhongMaterial, PlaneGeometry, Mesh } from 'three';
import { CSM } from 'three/examples/jsm/csm/CSM';
import { CSMHelper } from 'three/examples/jsm/csm/CSMHelper';
import gsap from 'gsap';
import { KeplerianOrbit } from 'influence-utils';

import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import useWebWorker from '~/hooks/useWebWorker';
import constants from '~/lib/constants';
import QuadtreeCubeSphere from '~/lib/graphics/QuadtreeCubeSphere';
import Config from './asteroid/Config';
import Rings from './asteroid/Rings';
// import exportModel from './asteroid/export';

const {
  MIN_CHUNK_SIZE,
  MIN_FRUSTUM_AT_SURFACE,
  UPDATE_QUADTREE_EVERY_CHUNK,
  ENABLE_CSM
} = constants;
const UPDATE_QUADTREE_EVERY = MIN_CHUNK_SIZE * UPDATE_QUADTREE_EVERY_CHUNK;
const FRAME_CYCLE_LENGTH = 15;

const MAP_RENDER_TIME_PER_CYCLE = 8;
const INITIAL_ZOOM = 2;
const MIN_ZOOM_DEFAULT = 1.2; // TODO: should probably multiply by max stretch
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
    if (!totals[tag]) totals[tag] = 0;
    totals[tag] += Date.now() - startTime;
  }
}

// TODO: remove debug
setInterval(() => {
  if (first) {
    first = false;
    totalRuns = 0;
    totals = {};
    return;
  }
  const b = {};
  let prevTime = 0;
  Object.keys(totals).forEach((k) => {
    const thisTime = Math.round(totals[k] / totalRuns);
    if (k === '_') {
      b['TOTAL'] = thisTime;
    } else {
      b[k] = thisTime - prevTime;
      prevTime = thisTime;
    }
  });
  console.log(`b ${totalRuns}`, b);
}, 5000);

const Asteroid = (props) => {
  const { camera, controls, gl, raycaster, scene } = useThree();
  const origin = useStore(s => s.asteroids.origin);
  const time = useStore(s => s.time.precise);
  // const mapSize = useStore(s => s.graphics.textureSize); // TODO: apply user settings
  const shadowMode = useStore(s => s.graphics.shadowMode);
  const shadowSize = useStore(s => s.graphics.shadowSize);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomedFrom = useStore(s => s.asteroids.zoomedFrom);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const setZoomedFrom = useStore(s => s.dispatchAsteroidZoomedFrom);
  // const requestingModelDownload = useStore(s => s.asteroids.requestingModelDownload);
  // const onModelDownload = useStore(s => s.dispatchModelDownloadComplete);
  const { data: asteroidData } = useAsteroid(origin);

  const webWorkerPool = useWebWorker();

  const [config, setConfig] = useState();

  const debug = useRef();
  const geometry = useRef();
  const quadtreeRef = useRef();
  const cameraPosition = useRef();
  const frameCycle = useRef(0);
  const group = useRef();
  const light = useRef();
  const asteroidOrbit = useRef();
  const rotationAxis = useRef();
  const position = useRef();
  const rotation = useRef(0);
  const csmHelper = useRef(); // TODO: remove
  const aspectRatio = useRef();

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

  const surfaceDistance = useMemo(
    () => (MIN_FRUSTUM_AT_SURFACE / 2) / Math.tan((controls?.object?.fov / 2) * (Math.PI / 180)),
    [controls?.object?.fov]
  );

  // Update texture generation config when new asteroid data is available
  useEffect(() => {
    if (asteroidData && asteroidData.asteroidId === origin) {
      const c = new Config(asteroidData);
      setConfig(c);

      asteroidOrbit.current = new KeplerianOrbit(asteroidData.orbital);
      rotationAxis.current = c.seed.clone().normalize();

      // init position and rotation
      position.current = Object.values(asteroidOrbit.current.getPositionAtTime(time)).map(v => v * constants.AU);
      rotation.current = time * c.rotationSpeed * 2 * Math.PI;

      // if geometry.current already exists, dispose first
      if (geometry.current) disposeGeometry();
      geometry.current = new QuadtreeCubeSphere(c, webWorkerPool);
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
  const ringsPresent = useMemo(() => !!config?.ringsPresent, [config?.ringsPresent]);
  useEffect(() => {
    if (!(asteroidData?.radius && geometry.current && quadtreeRef.current && position.current && config?.stretch)) return;
    
    // calculate intended shadow mode
    let intendedShadowMode = 'none';
    if (ENABLE_CSM && shadowMode === 2) {
      intendedShadowMode = `${shadowSize}_CSM`;
    } else if (shadowMode > 0) {
      intendedShadowMode = `${shadowSize}`;
    }

    // if no changes, exit now
    if (geometry.current.shadowMode && geometry.current.shadowMode === intendedShadowMode) {
      return;
    }

    // must reinit geometry and lights entirely if already a shadow mode set
    if (geometry.current.shadowMode) {
      disposeGeometry();
      disposeLight();

      geometry.current = new QuadtreeCubeSphere(config, webWorkerPool);
      geometry.current.groups.forEach((g) => {
        quadtreeRef.current.add(g);
      });
    }

    // init params
    const posVec = new Vector3(...position.current);
    const lightColor = 0xffeedd;
    const lightDistance = asteroidData?.radius * 10;
    const lightDirection = posVec.clone().normalize();
    const lightIntensity = constants.STAR_INTENSITY / (posVec.length() / constants.AU);
    const maxRadius = ringsPresent
      ? asteroidData.radius * 1.5
      : asteroidData.radius * Math.max(config.stretch.x, config.stretch.y, config.stretch.z);
    
    //
    // CSM setup
    //
    if (ENABLE_CSM && shadowMode === 2) {
      // TODO: could potentially add higher multiple to smallest distance
      // TODO: does number of cascades impact performance? if not, we should definitely add more

      // setup cascades
      const minSurfaceDistance = Math.min(surfaceDistance, (MIN_ZOOM_DEFAULT - 1) * asteroidData.radius);
      const cascadeConfig = [];
      cascadeConfig.unshift(MAX_ZOOM);
      cascadeConfig.unshift(INITIAL_ZOOM - Math.min(config.stretch.x, config.stretch.y, config.stretch.z));
      const midCascade = 8 * minSurfaceDistance / asteroidData.radius;
      if (midCascade < cascadeConfig[0]) cascadeConfig.unshift(midCascade);
      cascadeConfig.unshift(2 * minSurfaceDistance / asteroidData.radius);

      // init CSM
      const csm = new CSM({
        fade: true,
        maxFar: asteroidData.radius * MAX_ZOOM,
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
        lightFar: 10 * asteroidData.radius,
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
  
        // TODO: need to remove floor in cleanup if keep this
        // const floorMaterial = new MeshPhongMaterial( { color: '#252a34' } );
        // csm.setupMaterial( floorMaterial );
  
        // const floor = new Mesh(new PlaneGeometry( 100000, 100000, 8, 8 ), floorMaterial );
        // floor.castShadow = true;
        // floor.receiveShadow = true;
        // group.current.add( floor );
      }

    //
    // Non-CSM setup
    //
    } else {
      
      // create light
      light.current = new DirectionalLight(lightColor, lightIntensity);
      light.current.position.copy(lightDirection.negate().multiplyScalar(lightDistance));
      light.current.castShadow = true;  // TODO: should this be in below if-clause?
      group.current.add(light.current);

      // if traditional shadows, update shadow camera
      if (shadowMode > 0) {
        light.current.shadow.bias = -0.01;
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

  }, [asteroidData?.radius, config, ringsPresent, shadowMode, shadowSize, surfaceDistance]);

  // Zooms the camera to the correct location
  const shouldZoomIn = zoomStatus === 'zooming-in' && controls && !!asteroidData;
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
    const zoomTo = controls.object.position.clone().normalize().multiplyScalar(asteroidData.radius * INITIAL_ZOOM);

    const timeline = gsap.timeline({
      defaults: { duration: 2, ease: 'power4.out' },
      onComplete: () => updateZoomStatus('in')
    });

    // Pan the target scene to center the asteroid
    timeline.to(controls.targetScene.position, { ...panTo }, 0);

    // Zoom in the camera to the asteroid
    timeline.to(controls.object.position, { ...zoomTo }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ shouldZoomIn ]);

  const shouldFinishZoomIn = zoomStatus === 'in' && controls && !!asteroidData;
  useEffect(() => {
    if (!shouldFinishZoomIn) return;

    // Update distances to maximize precision
    controls.minDistance = asteroidData.radius * MIN_ZOOM_DEFAULT;
    controls.maxDistance = asteroidData.radius * MAX_ZOOM;

    const panTo = new Vector3(...position.current);
    group.current?.position.copy(panTo);
    panTo.negate();
    //const zoomTo = controls.object.position.clone().normalize().multiplyScalar(asteroidData.radius * INITIAL_ZOOM);
    const zoomTo = new Vector3(1, 0, 0).multiplyScalar(asteroidData.radius * INITIAL_ZOOM); // TODO: remove debug
    controls.targetScene.position.copy(panTo);
    controls.object.position.copy(zoomTo);
    controls.noPan = true;
    controls.object.near = 100;
    controls.object.updateProjectionMatrix();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ shouldFinishZoomIn, asteroidData?.radius ]);

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
        controls.noPan = false;
        controls.object.near = 1000000;
        controls.object.updateProjectionMatrix();
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

  // TODO: fix this
  // Initiates download of generated mesh (when requested and ready)
  // const exportableMesh = geometry && materials && mesh && mesh.current;
  // useEffect(() => {
  //   if (!(requestingModelDownload && exportableMesh)) return;
  //   exportModel(exportableMesh, onModelDownload);
  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [requestingModelDownload, exportableMesh]);

  const updatePending = useRef();

  // Positions the asteroid in space based on time changes
  useFrame(() => {
    if (!asteroidData) return;
    if (!geometry.current?.builder?.ready) return;

    // tally frame
    frameCycle.current = (frameCycle.current + 1) % FRAME_CYCLE_LENGTH;

    // if builder is not busy, make sure we are showing most recent chunks
    if (geometry.current.builder.isPreparingUpdate()) {
      if (geometry.current.builder.isReadyToFinish()) {
        // vvv BENCHMARK 1ms
        geometry.current.builder.update();
        // ^^^
      } else {
        // vvv BENCHMARK 8ms (matches MAP_RENDER_TIME_PER_CYCLE)
        // TODO: would it be smoother for UI to pass to worker (even though slower)?
        geometry.current.builder.updateMaps(Date.now() + MAP_RENDER_TIME_PER_CYCLE);
        // ^^^
      }
    }
    
    // vvv BENCHMARK ~0ms
    // control dynamic zoom limit (zoom out slowly if too low... else, just update boundary)
    // NOTE: raycasting would technically be more accurate here, but it's way less performant
    //       (3ms+ for just closest mesh... if all quadtree children, closer to 20ms) and need
    //       to incorporate geometry shrink returned intersection distance
    if (controls && geometry.current?.closestChunkHeight) {
      const minDistance = geometry.current.closestChunkHeight + surfaceDistance;
      if (controls.object.position.length() < minDistance) {
        controls.minDistance += 5;
      } else {
        controls.minDistance = minDistance;
      }
    }
    // ^^^

    // vvv BENCHMARK <1ms
    // update asteroid position
    if (asteroidOrbit.current && time) {
      position.current = Object.values(asteroidOrbit.current.getPositionAtTime(time)).map(v => v * constants.AU);

      // update object and camera position
      // TODO: is this necessary?
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
      }
    }
    // ^^^
    
    // update quadtree on "significant" movement so it can rebuild children appropriately
    // TODO (enhancement): UPDATE_QUADTREE_EVERY should probably depend on zoom level
    if (!geometry.current.builder.isBusy() && !geometry.current.builder.isPreparingUpdate()) {
      const updateQuadCube = !cameraPosition.current
        || cameraPosition.current.distanceTo(controls.object.position) > UPDATE_QUADTREE_EVERY
        || (updatedRotation - rotation.current) * asteroidData.radius > UPDATE_QUADTREE_EVERY
      ;
      if (updateQuadCube) {
        cameraPosition.current = controls.object.position.clone();
        rotation.current = updatedRotation;

        // send updated camera position to quads for processing
        // console.log('update started');
        updatePending.current = Date.now();

        // TODO: try to thread this
        // vvv BENCHMARK 5ms
        geometry.current.setCameraPosition(
          controls.object.position.clone().applyAxisAngle(
            rotationAxis.current,
            -rotation.current
          )
        );
        // ^^^
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
    if (debug.current) {
      debug.current.setRotationFromAxisAngle(
        new Vector3(0, 1, 0),
        Math.PI
      );
    }
    setTimeout(() => {
      const debugInfo = document.getElementById('debug_info');
      if (!!debugInfo && config?.radius) {
        debugInfo.innerText = (controls.object.position.length() / config?.radius).toFixed(2);
      } else {
        console.log('#debug_info not found!');
      }
    });
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
      {false && <primitive object={new AxesHelper(config?.radius * 2)} />}
      {false && <ambientLight intensity={0.4} />}
    </group>
  );
}

export default Asteroid;