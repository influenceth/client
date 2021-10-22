import { useState, useEffect, useRef } from 'react';
import { BufferAttribute, BufferGeometry, DataTexture, LessDepth, BufferGeometryLoader, MeshStandardMaterial, PointsMaterial, Vector3 } from 'three';
import { useThree } from '@react-three/fiber';
import { useThrottle } from '@react-hook/throttle';
import gsap from 'gsap';
import { KeplerianOrbit } from 'influence-utils';

// eslint-disable-next-line
import Worker from 'worker-loader!../../worker';
import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import TextureRenderer from '~/lib/graphics/TextureRenderer';
import CubeSphere from '~/lib/graphics/CubeSphere';
import Config from './asteroid/Config';
import HeightMap from './asteroid/HeightMap';
import ColorMap from './asteroid/ColorMap';
import NormalMap from './asteroid/NormalMap';
import Rings from './asteroid/Rings';
import constants from '~/lib/constants';

// Setup worker or main thread textureRenderer depending on browser
let worker, textureRenderer;

if (!!window.Worker && typeof OffscreenCanvas !== 'undefined') {
  worker = new Worker();
} else {
  textureRenderer = new TextureRenderer();
}

const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle in radians

function getAngleDiff(angle1, angle2) {
  const diff = angle1 - angle2;
  return Math.atan2(Math.sin(diff), Math.cos(diff));
}

function getThetaTolerance(samples) {
  if (samples < 1e2) return 2 * Math.PI;
  if (samples < 1e4) return Math.PI / (Math.log10(samples) + 1);
  return Math.PI / (Math.log10(samples) + 3);
}

// we know points should be ~1km apart, which means if we limit our checks to
// a range of +-0.5km in any dimension, we should feel confident we will get
// at least one point (NOTE: distribution isn't perfect, so worth a safety factor)
const getNearbyFibPoints = (center, samples, radius) => {
  const lotSize = 1000 / radius; // TODO: is lot size in config?
  const yRadiusToSearch = 2 * lotSize;

  let centerTheta = Math.atan(center.z / center.x);
  // TODO: will thetaTolerance make things weird at poles? could skip check at highest and lowest indexes...
  const thetaTolerance = getThetaTolerance(samples); // TODO: could be calculated once per asteroid
  console.log({ thetaTolerance });

  const maxIndex = Math.min(samples - 1, Math.ceil((1 - center.y + yRadiusToSearch) * (samples - 1) / 2));
  const minIndex = Math.max(0, Math.floor((1 - center.y - yRadiusToSearch) * (samples - 1) / 2));
  
  const points = [];
  for(let index = minIndex; index < maxIndex; index++) {
    const theta = phi * index;
    
    // skip if this point is not within a threshold of angle to center
    if (Math.abs(getAngleDiff(centerTheta, theta)) > thetaTolerance) continue;

    const y = 1 - (index / (samples - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    points.push([
      x * radius,
      y * radius,
      z * radius,
      Math.abs(center.x - x) + Math.abs(center.y - y) + Math.abs(center.z - z)
    ]);
  }
  console.log(`${maxIndex - minIndex} points in range; ${points.length} checked`);

  const final = points
    .sort((a, b) => a[3] < b[3] ? -1 : 1)
    .map((p) => [p[0], p[1], p[2]])
    .slice(0, 15);
  return [
    final[0],
    final[0],
    ...final
  ];
};

const vectorArrayToGeometryBuffer = (points) => {
  return points.reduce((acc, cur) => cur ? [...acc, cur[0], cur[1], cur[2]] : acc, []);
};

const Asteroid = (props) => {
  const controls = useThree(({ controls }) => controls);
  const origin = useStore(s => s.asteroids.origin);
  const time = useStore(s => s.time.current);
  const mapSize = useStore(s => s.graphics.textureSize);
  const shadows = useStore(s => s.graphics.shadows);
  const shadowSize = useStore(s => s.graphics.shadowSize);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomedFrom = useStore(s => s.asteroids.zoomedFrom);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const setZoomedFrom = useStore(s => s.dispatchAsteroidZoomedFrom);
  const { data: asteroidData } = useAsteroid(origin);

  const group = useRef();
  const light = useRef();
  const mesh = useRef();
  const fibMesh = useRef();
  const asteroidOrbit = useRef();
  const rotationAxis = useRef();

  const [ position, setPosition ] = useState([ 0, 0, 0 ]);
  const [ config, setConfig ] = useState();
  const [ maps, setMaps ] = useState();
  const [ materials, setMaterials ] = useState();
  const [ geometry, setGeometry ] = useState();
  const [ fibGeometry, setFibGeometry ] = useState();
  const [ mousePos, setMousePos ] = useThrottle(null, 30);

  // Positions the asteroid in space based on time changes
  useEffect(() => {
    if (!!asteroidData && !asteroidOrbit.current) asteroidOrbit.current = new KeplerianOrbit(asteroidData.orbital);
    if (!asteroidData) asteroidOrbit.current = null;

    if (asteroidOrbit.current && time) {
      setPosition(Object.values(asteroidOrbit.current.getPositionAtTime(time)).map(v => v * constants.AU));
    }

    if (mesh.current && config && time) {
      const rotation = time * config.rotationSpeed * 2 * Math.PI;
      mesh.current.setRotationFromAxisAngle(rotationAxis.current, rotation);
      if (fibMesh.current) {
        fibMesh.current.setRotationFromAxisAngle(rotationAxis.current, rotation);
      }
    }
  }, [ asteroidData, config, time, mesh.current, fibMesh.current ]);

  // Update texture generation config when new asteroid data is available
  useEffect(() => {
    if (!!asteroidData) setConfig(new Config(asteroidData));

    // Cleanup when there's no data
    // TODO: if can ever jump directly between asteroids, this cleanup will need to happen on asteroid change as well
    if (!asteroidData) {
      setConfig(null);

      geometry?.dispose();
      setGeometry(null);

      materials?.forEach(m => {
        m.map?.dispose();
        m.normalMap?.dispose();
      });

      setMaterials(null);

      if (zoomStatus === 'in') updateZoomStatus('zooming-out');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ asteroidData ]);

  // Kicks off rendering of each map based on the asteroid's unique config either in worker or main
  useEffect(() => {
    if (!config || !mapSize) return;

    rotationAxis.current = config.seed.clone().normalize();

    if (!!worker) {
      worker.postMessage({ topic: 'renderMaps', mapSize, config });

      worker.onmessage = (event) => {
        if (event.data.topic === 'maps') {
          const { heightMap, colorMap, normalMap } = event.data;
          setMaps({ heightMap, colorMap, normalMap });
        }
      };
    } else if (!!textureRenderer) {
      const renderMaps = async () => {
        const heightMap = new HeightMap(mapSize, config, textureRenderer);
        const colorMapObj = new ColorMap(mapSize, heightMap, config, textureRenderer);
        const colorMap = await colorMapObj.generateColorMap();
        const normalMap = new NormalMap(mapSize, heightMap, config, textureRenderer);
        setMaps({ heightMap, colorMap, normalMap });
      };

      renderMaps();
    }
  }, [ config, mapSize ]);

  // Receives updated maps and generates the geometry based on heightMap
  useEffect(() => {
    if (!config || !maps) return;

    if (!!worker) {
      worker.postMessage({ topic: 'renderGeometry', heightMap: maps.heightMap, config });

      worker.onmessage = (event) => {
        if (event.data.topic === 'geometry') {
          const loader = new BufferGeometryLoader();
          setGeometry(loader.parse(event.data.geometryJSON));
        }
      };
    } else if (!!textureRenderer) {
      const geometry = new CubeSphere(1, 50);
      geometry.displaceWithHeightMap(maps.heightMap, config.radius, config);
      delete geometry.parameters;
      setGeometry(geometry);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ maps ]);

  // Receives the updated maps and applies them to the material
  useEffect(() => {
    if (!maps) return;
    const processed = {};
    const materials = [];

    Object.keys(maps).forEach(k => {
      processed[k] = maps[k].map(m => {
        const tex = new DataTexture(m.buffer, m.width, m.height, m.format);
        return Object.assign(tex, m.options);
      });
    });

    for (let i = 0; i < 6; i++) {
      materials.push(new MeshStandardMaterial({
        color: 0xffffff,
        depthFunc: LessDepth,
        dithering: true,
        map: processed.colorMap[i],
        metalness: 0,
        normalMap: processed.normalMap[i],
        roughness: 1
      }));
    }

    setMaterials(materials);
  }, [ maps ]);

  // Configures the light component once the geometry is created
  useEffect(() => {
    if (!geometry || !asteroidData) return;
    const posVec = new Vector3(...position);
    light.current.intensity = constants.STAR_INTENSITY / (posVec.length() / constants.AU);
    light.current.position.copy(posVec.clone().normalize().negate().multiplyScalar(asteroidData.radius * 10));
    geometry.computeBoundingSphere();
    const maxRadius = geometry.boundingSphere.radius + geometry.boundingSphere.center.length();
    const radiusBump = config?.ringsPresent ? 1.5 : 0;

    if (shadows) {
      light.current.shadow.camera.near = maxRadius * 9;
      light.current.shadow.camera.far = maxRadius * (11 + radiusBump);
      light.current.shadow.camera.bottom = light.current.shadow.camera.left = -maxRadius;
      light.current.shadow.camera.right = light.current.shadow.camera.top = maxRadius;
      light.current.shadow.camera.updateProjectionMatrix();
    }
  }, [ geometry, asteroidData, position, shadows, shadowSize, config?.ringsPresent ]);

  // Zooms the camera to the correct location
  const shouldZoomIn = zoomStatus === 'zooming-in' && controls && !!asteroidData;
  useEffect(() => {
    if (!shouldZoomIn) return;

    setZoomedFrom({
      scene: controls.targetScene.position.clone(),
      position: controls.object.position.clone(),
      up: controls.object.up.clone()
    });

    const panTo = new Vector3(...position);
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
    controls.minDistance = asteroidData.radius * 1.2;
    controls.maxDistance = asteroidData.radius * 4.0;

    const panTo = new Vector3(...position);
    group.current?.position.copy(panTo);
    panTo.negate();
    const zoomTo = controls.object.position.clone().normalize().multiplyScalar(asteroidData.radius * 2.0);
    controls.targetScene.position.copy(panTo);
    controls.object.position.copy(zoomTo);
    controls.noPan = true;
    controls.object.near = 100;
    controls.object.updateProjectionMatrix();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ shouldFinishZoomIn, asteroidData ]);

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

  // Updates controls and scene position when time or asteroid changes
  const shouldUpdatePosition = zoomStatus === 'in' && position && controls;
  useEffect(() => {
    if (!shouldUpdatePosition) return;

    let panTo = new Vector3(...position);
    group.current?.position.copy(panTo);
    panTo.negate();
    controls.targetScene.position.copy(panTo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ shouldUpdatePosition, position, asteroidData ]);

  const showFib = true;

  const [fibMaterial, setFibMaterial] = useState();
  useEffect(() => {
    if (config) {
      setFibMaterial(
        new PointsMaterial({
          color: 0xff0000,
          size: config.radius / 40,
          opacity: 0.33,
          transparent: true
        })
      );
    }
  }, [config]);

  useEffect(() => {
    if (mousePos && mousePos.intersections.length > 0) {
      const intersection = mousePos.intersections[0];
      const fibGeo = new BufferGeometry();
      const lots = Math.floor(4 * Math.PI * config.radius * config.radius / 1e6);
      const nearbyFibPoints = getNearbyFibPoints(intersection.face.normal, lots, asteroidData.radius);

      fibGeo.setAttribute(
        'position',
        new BufferAttribute(
          new Float32Array(
            vectorArrayToGeometryBuffer(nearbyFibPoints)
          ),
          3
        )
      );
      setFibGeometry(fibGeo);
      //console.log("move", intersection);
    } else {
      setFibGeometry(null);
    }
  }, [mousePos]);

  return (
    <group ref={group}>
      <directionalLight
        ref={light}
        color={0xffeedd}
        castShadow={shadows}
        shadow-mapSize-height={shadowSize}
        shadow-mapSize-width={shadowSize} />
      {geometry && materials && (
        <mesh
          ref={mesh}
          material={materials}
          castShadow={shadows}
          receiveShadow={shadows}
          onPointerMove={setMousePos}>
          <primitive attach="geometry" object={geometry} />
        </mesh>
      )}
      {showFib && fibGeometry && (
        <points ref={fibMesh} material={fibMaterial}>
          <primitive attach="geometry" object={fibGeometry} />
        </points>
      )}
      {config?.ringsPresent && geometry && (
        <Rings
          receiveShadow={shadows}
          config={config}
          onUpdate={(m) => m.lookAt(rotationAxis?.current)} />
      )}
    </group>
  );
};

export default Asteroid;
