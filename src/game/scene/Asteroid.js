import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Vector3, Box3, Sphere } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { KeplerianOrbit } from 'influence-utils';

import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import constants from '~/lib/constants';
import QuadtreeCubeSphere, { MIN_CHUNK_SIZE } from '~/lib/graphics/QuadtreeCubeSphere';
import Config from './asteroid/Config';
import Rings from './asteroid/Rings';
// import exportModel from './asteroid/export';

const TARGET_MAX_ZOOM_Y = 2000;
const TARGET_REDRAW_DISTANCE = MIN_CHUNK_SIZE / 2;
const FRAME_CYCLE_LENGTH = 4;

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

  const [config, setConfig] = useState();

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
      rotation.current = time * c.rotationSpeed * 2 * Math.PI;;

      // if geometry.current already exists, dispose first
      if (geometry.current) disposeGeometry();
      geometry.current = new QuadtreeCubeSphere(c);
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
  const ringsPresent = useMemo(() => !!config?.ringsPresent, [config?.ringsPresent])
  useEffect(() => {
    if (!(asteroidData?.radius && quadtreeRef.current && light.current && position.current)) return;

    const posVec = new Vector3(...position.current);
    light.current.intensity = constants.STAR_INTENSITY / (posVec.length() / constants.AU);
    light.current.position.copy(posVec.clone().normalize().negate().multiplyScalar(asteroidData?.radius * 10));

    if (shadows) {
      const bbox = new Box3().setFromObject(quadtreeRef.current);
      const bsphere = bbox.getBoundingSphere(new Sphere());
      const maxRadius = bsphere.radius + bsphere.center.length();
      const radiusBump = ringsPresent ? 1.5 : 0;

      light.current.shadow.camera.near = maxRadius * 9;
      light.current.shadow.camera.far = maxRadius * (11 + radiusBump);
      light.current.shadow.camera.bottom = light.current.shadow.camera.left = -maxRadius;
      light.current.shadow.camera.right = light.current.shadow.camera.top = maxRadius;
      light.current.shadow.camera.updateProjectionMatrix();
    }
  }, [asteroidData?.radius, ringsPresent, shadows]);

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
    controls.minDistance = asteroidData.radius * 1.5;
    controls.maxDistance = asteroidData.radius * 4.0;

    const panTo = new Vector3(...position.current);
    group.current?.position.copy(panTo);
    panTo.negate();
    const zoomTo = controls.object.position.clone().normalize().multiplyScalar(asteroidData.radius * 2.0);
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

  const surfaceDistance = useMemo(() => {
    return (TARGET_MAX_ZOOM_Y / 2) / Math.tan((controls?.object?.fov / 2) * (Math.PI / 180));
  }, [controls?.object?.fov])

  // Positions the asteroid in space based on time changes
  useFrame(() => {
    if (!asteroidData) return;
    if (!geometry.current?.builder?.ready) return;

    // tally frame
    frameCycle.current = (frameCycle.current + 1) % FRAME_CYCLE_LENGTH;

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
      updatedRotation = time * config.rotationSpeed * 2 * Math.PI;
      if (updatedRotation !== rotation.current) {
        quadtreeRef.current.setRotationFromAxisAngle(
          rotationAxis.current,
          updatedRotation
        );
      }
    }
    
    // update quadtree on "significant" movement so it can rebuild children appropriately
    // TODO (enhancement): TARGET_REDRAW_DISTANCE should probably depend on zoom level
    const updateQuadCube = !cameraPosition.current
      || cameraPosition.current.distanceTo(controls.object.position) > TARGET_REDRAW_DISTANCE
      || (updatedRotation - rotation.current) * asteroidData.radius > TARGET_REDRAW_DISTANCE
    ;
    if (updateQuadCube) {
      cameraPosition.current = controls.object.position.clone();
      rotation.current = updatedRotation;

      // send updated camera position to quads for processing
      geometry.current.setCameraPosition(
        controls.object.position.clone().applyAxisAngle(
          rotationAxis.current,
          -rotation.current
        )
      );
    }

    // re-evaluate raycaster on every Xth frame to ensure zoom bounds are safe
    // (i.e. close enough to surface but not inside surface)
    if (frameCycle.current === 0) {
      raycaster.set(
        controls.object.position.clone(),
        controls.object.position.clone().negate().normalize()
      );
      const intersection = (raycaster.intersectObjects(scene.children, true) || [])
        .find((i) => i.object?.type === 'Mesh');
      if (intersection) {
        controls.minDistance = Math.min(
          controls.object.position.length() - intersection.distance + surfaceDistance,
          1.5 * asteroidData.radius
        );
      } else {
        controls.minDistance = 1.5 * asteroidData.radius;
      }
    }
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
    </group>
  );
}

export default Asteroid;