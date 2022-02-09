import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Vector3, Box3, Sphere, AxesHelper, CameraHelper, DirectionalLightHelper, BufferAttribute } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
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
  MIN_FRUSTRUM_HEIGHT,
  UPDATE_QUADTREE_EVERY_CHUNK,
  GEOMETRY_SHRINK,
  GEOMETRY_SHRINK_MAX,
} = constants;
const UPDATE_QUADTREE_EVERY = MIN_CHUNK_SIZE * UPDATE_QUADTREE_EVERY_CHUNK;
const FRAME_CYCLE_LENGTH = 15;
const FALLBACK_MIN_ZOOM = 1.2;

// TODO: remove debug
let totalRuns = 0;
let totals = {};
let startTime;
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
// setInterval(() => {
//   const b = {};
//   let prevTime = 0;
//   Object.keys(totals).forEach((k) => {
//     const thisTime = Math.round(totals[k] / totalRuns);
//     if (k === '_') {
//       b['TOTAL'] = thisTime;
//     } else {
//       b[k] = thisTime - prevTime;
//       prevTime = thisTime;
//     }
//   });
//   console.log(`b ${totalRuns}`, b);
// }, 5000);

const Asteroid = (props) => {
  const { controls, raycaster, scene } = useThree();
  const origin = useStore(s => s.asteroids.origin);
  const time = useStore(s => s.time.precise);
  // const mapSize = useStore(s => s.graphics.textureSize); // TODO: apply user settings
  const shadows = useStore(s => s.graphics.shadows);
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

  const disposeGeometry = useCallback(() => {
    if (quadtreeRef.current) {
      geometry.current.groups.forEach((g) => {
        quadtreeRef.current.remove(g);
      });
    }
    geometry.current.dispose();
    geometry.current = null;
  }, []);

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
      setConfig();
      asteroidOrbit.current = null;
      rotationAxis.current = null;
      if (geometry.current) disposeGeometry();

      if (zoomStatus === 'in') updateZoomStatus('zooming-out');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ asteroidData ]);

  // Configures the light component once the geometry is created
  const ringsPresent = useMemo(() => !!config?.ringsPresent, [config?.ringsPresent]);
  useEffect(() => {
    if (!(asteroidData?.radius && quadtreeRef.current && light.current && position.current && config?.stretch)) return;

    const lightDistance = asteroidData?.radius * 10;

    const posVec = new Vector3(...position.current);
    light.current.intensity = constants.STAR_INTENSITY / (posVec.length() / constants.AU);
    light.current.position.copy(posVec.clone().normalize().negate().multiplyScalar(lightDistance));
    // TODO: remove this:
    light.current.position.copy(new Vector3(0, 1, 0).multiplyScalar(lightDistance));

    if (shadows) {
      let maxRadius = ringsPresent
        ? asteroidData?.radius * 1.5
        : asteroidData?.radius * Math.max(config.stretch.x, config.stretch.y, config.stretch.z);
      light.current.shadow.bias = -0.07;
      light.current.shadow.camera.near = lightDistance - maxRadius;
      light.current.shadow.camera.far = lightDistance + maxRadius;
      light.current.shadow.camera.bottom = light.current.shadow.camera.left = -maxRadius;
      light.current.shadow.camera.right = light.current.shadow.camera.top = maxRadius;
      light.current.shadow.camera.updateProjectionMatrix();
    }
  }, [asteroidData?.radius, config?.stretch, ringsPresent, shadows]);


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
    const zoomTo = controls.object.position.clone().normalize().multiplyScalar(asteroidData.radius * 2.0);

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
    controls.minDistance = 0; // TODO: asteroidData.radius * FALLBACK_MIN_ZOOM;
    controls.maxDistance = asteroidData.radius * 4.0;

    const panTo = new Vector3(...position.current);
    group.current?.position.copy(panTo);
    panTo.negate();
    //const zoomTo = controls.object.position.clone().normalize().multiplyScalar(asteroidData.radius * 2.0);
    const zoomTo = new Vector3(0, 1, 0).multiplyScalar(asteroidData.radius * 2.0); // TODO: remove debug
    controls.targetScene.position.copy(panTo);
    controls.object.position.copy(zoomTo);
    controls.noPan = true;
    controls.object.near = 1; // TODO: 100;
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

  const surfaceDistance = useMemo(() => {
    return (MIN_FRUSTRUM_HEIGHT / 2) / Math.tan((controls?.object?.fov / 2) * (Math.PI / 180))
      + Math.min(asteroidData?.radius * GEOMETRY_SHRINK, GEOMETRY_SHRINK_MAX); // account for culling shrink
  }, [controls?.object?.fov, asteroidData?.radius])

  const updatePending = useRef();

  // Positions the asteroid in space based on time changes
  useFrame(() => {
    if (!asteroidData) return;
    if (!geometry.current?.builder?.ready) return;
    benchmark();

    // tally frame
    frameCycle.current = (frameCycle.current + 1) % FRAME_CYCLE_LENGTH;

    // if builder is not busy, make sure we are showing most recent chunks
    if (updatePending.current) {
      if (!geometry.current.builder.isBusy()) {
        geometry.current.finishPendingUpdate();

        if (debug.current) {
          // const d = geometry.current.debug();
          const d = new Float32Array(geometry.current.debug());
          debug.current.geometry.setAttribute('position', new BufferAttribute(d, 3));
          debug.current.geometry.attributes.position.needsUpdate = true;
        }

        // console.log('update finished', Date.now() - updatePending.current);
        updatePending.current = null;
      }
    } else {
      // TODO: re-evaluate raycaster...
      // re-evaluate raycaster on every Xth frame to ensure zoom bounds are safe
      // (i.e. close enough to surface but not inside surface)
      // TODO: this can be kicked off from here, but should not be blocking...
      if (frameCycle.current === 0) {
        if (controls && cameraPosition.current && quadtreeRef.current?.children) {
          raycaster.set(
            controls.object.position.clone(),
            controls.object.position.clone().negate().normalize()
          );
          const intersection = (raycaster.intersectObjects(quadtreeRef.current.children) || [])
            .find((i) => i.object?.type === 'Mesh');
          if (intersection) {
            // TODO: if current distance < new min, then pan first, then reset minDistance
            controls.minDistance = Math.min(
              controls.object.position.length() - intersection.distance + surfaceDistance,
              FALLBACK_MIN_ZOOM * asteroidData.radius
            );
          } else if(controls.minDistance < FALLBACK_MIN_ZOOM * asteroidData.radius) {
            controls.minDistance *= 1.01;
          } else {
            controls.minDistance = FALLBACK_MIN_ZOOM * asteroidData.radius;
          }
        }
      }
      benchmark('raycasted');
    }
    benchmark('optional update');

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
      updatedRotation = 0;// time * config.rotationSpeed * 2 * Math.PI;  // TODO: uncomment
      if (updatedRotation !== rotation.current) {
        quadtreeRef.current.setRotationFromAxisAngle(
          rotationAxis.current,
          updatedRotation
        );
      }
    }
    benchmark('pos and rot');
    
    // update quadtree on "significant" movement so it can rebuild children appropriately
    // TODO (enhancement): UPDATE_QUADTREE_EVERY should probably depend on zoom level
    if (!geometry.current.builder.isBusy()) {
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

        // TODO: if not threaded, this should not be blocking while all math done
        new Promise(() => {
          geometry.current.setCameraPosition(
            controls.object.position.clone().applyAxisAngle(
              rotationAxis.current,
              -rotation.current
            )
          );
        });
      }
    }
    benchmark('set cam');

    
    benchmark('_');

    // debug.current.setRotationFromAxisAngle(
    //   new Vector3(0, 1, 0),
    //   Math.PI
    // );
  });

  return (
    <group ref={group}>
      <directionalLight
        ref={light}
        color={0xffeedd}
        castShadow={shadows}
        shadow-mapSize-height={shadowSize}
        shadow-mapSize-width={shadowSize} />
      <group ref={quadtreeRef} />
      {config?.ringsPresent && geometry.current && (
        <Rings
          receiveShadow={shadows}
          config={config}
          onUpdate={(m) => m.lookAt(rotationAxis?.current)} />
      )}
      {/* TODO: remove all helpers */}
      {false && (
        <>
          <mesh>
            <sphereGeometry args={[12099.76]} />
            <meshStandardMaterial color={0xff00ff} opacity={0.3} transparent={true} />
          </mesh>
          <mesh>
            <sphereGeometry args={[10154.07]} />
            <meshStandardMaterial color={0x00ff00} opacity={0.3} transparent={true} />
          </mesh>
        </>
      )}
      {false && (
        <points ref={debug}>
          <pointsMaterial attach="material" size={100} sizeAttenuation={true} color={0xff0000} />
        </points>
      )}
      {false && light.current && <primitive object={new DirectionalLightHelper(light.current, 2 * config?.radius)} />}
      {false && light.current?.shadow?.camera && <primitive object={new CameraHelper(light.current.shadow.camera)} />}
      {true && <primitive object={new AxesHelper(config?.radius * 2)} />}
    </group>
  );
}

export default Asteroid;