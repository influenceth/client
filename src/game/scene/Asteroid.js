import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, DataTexture, LessDepth,
  BufferGeometryLoader, MeshBasicMaterial, MeshStandardMaterial, PointsMaterial, Vector3,
SrcAlphaFactor, OneMinusSrcAlphaFactor, DstAlphaFactor } from 'three';
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
import { fiboOnHeightMap, getNearbyFibPoints } from '~/lib/graphics/fiboUtils';
import Config from './asteroid/Config';
import HeightMap from './asteroid/HeightMap';
import ColorMap from './asteroid/ColorMap';
import LotMap from './asteroid/FiboMap';
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
  const lotsMesh = useRef();
  const lotsGeo = useRef();
  const fibMesh = useRef();
  const fibPointsMesh = useRef();
  const asteroidOrbit = useRef();
  const rotationAxis = useRef();

  const [ position, setPosition ] = useState([ 0, 0, 0 ]);
  const [ config, setConfig ] = useState();
  const [ lotGeometry, setLotGeometry ] = useState();
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
      if (fibPointsMesh.current) {
        fibPointsMesh.current.setRotationFromAxisAngle(rotationAxis.current, rotation);
      }
      if (lotsMesh.current) {
        lotsMesh.current.setRotationFromAxisAngle(rotationAxis.current, rotation);
      }
    }
  }, [ asteroidData, config, time, mesh.current, fibMesh.current, fibPointsMesh.current, lotsMesh.current ]);

  // Update texture generation config when new asteroid data is available
  useEffect(() => {
    if (!!asteroidData) setConfig(new Config(asteroidData));

    // Cleanup when there's no data
    // TODO: if can ever jump directly between asteroids, this cleanup will need to happen on asteroid change as well
    if (!asteroidData) {
      setConfig(null);

      geometry?.dispose();
      setGeometry(null);

      lotGeometry?.dispose();
      setLotGeometry(null);

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
          const { heightMap, colorMap, normalMap, lotMap } = event.data;
          console.log('lotMap', lotMap);
          setMaps({ heightMap, colorMap, normalMap, lotMap });
        }
      };
    } else if (!!textureRenderer) {
      const renderMaps = async () => {
        const heightMap = new HeightMap(mapSize, config, textureRenderer);
        const colorMapObj = new ColorMap(mapSize, heightMap, config, textureRenderer);
        const colorMap = await colorMapObj.generateColorMap();
        const normalMap = new NormalMap(mapSize, heightMap, config, textureRenderer);
        setMaps({ heightMap, colorMap, normalMap });
        /* TODO: replicate lot rendering */
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
          //console.log('event.data.geometryJSON', event.data.geometryJSON);
          setGeometry(loader.parse(event.data.geometryJSON));
        } else if (event.data.topic === 'lotGeometry') {
          const loader = new BufferGeometryLoader();
          //console.log('event.data.lotGeometryJSON', event.data.lotGeometryJSON);
          setLotGeometry(loader.parse(event.data.lotGeometryJSON));
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
  const [fibMaterials, setFibMaterials] = useState();
  useEffect(() => {
    if (!maps) return;
    const processed = {};
    const materials = [];
    const lotMaterials = [];

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

      if (processed.lotMap[i]) {
        console.log('processed.lotMap[i]', processed.lotMap[i]);
        lotMaterials.push(new MeshBasicMaterial({
          //alphaMap: processed.lotMap[i],
          // uncomment blending stuff:
          //blending: AdditiveBlending,
          //blendSrc: SrcAlphaFactor,
          //blendDst: DstAlphaFactor,
          color: 0xffffff,
          //emissive: 0x36a7cd,
          //emissiveIntensity: 1,
          dithering: true,
          map: processed.lotMap[i],
          metalness: 1,
        }));
      }
    }

    setMaterials(materials);
    setFibMaterials(lotMaterials);
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

  const [fibPointsMaterials, setFibPointsMaterials] = useState();
  useEffect(() => {
    if (config) {
      setFibPointsMaterials(
        new PointsMaterial({
          color: 0x0000ff,
          size: config.radius / 40,
          //opacity: 0.33,
          //transparent: true
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

      // TODO: pass changing uniforms to shader (based on mouse position):
      //  - (limited number of) points
      //  - mouse position (for alpha layer)
      // check distance from mouse... if > Xkm, skip
      //  find minimum distance to any point
      //  if minimum distance > threshold, color (for line) -- antialias with alpha function
      //  else,
      //    find point closest to mouse...
      //    if my closest point and mouses closest point are the same
      //      highlight with partial opacity
      //    else, leave clear
      //  apply alpha based on distance from mouse

      // TODO: do above in 2d first, then come back and fix for 3d

      // TODO: how do we handle across-the-cube-sphere-edge?
      // NOTE: distance above should be "spherized" distance (i think?)
      //  can we pass in 3d fragcoord? may need to pass in z value per point to calculate distance?








      // TODO: reuse same buffergeometry if keeping as point field (but better to use as shader)
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
      {/*geometry && (
        <mesh
          ref={lotMesh}
          scale={1.01}>
          <primitive attach="geometry" object={geometry} />
          <shaderMaterial attach="material" args={[{
            transparent: true,
            uniforms: {
              uSamples: { type: 'f', value: Math.floor(4 * Math.PI * config.radius * config.radius / 1e6) },
              uResolution: mapSize
            },
            fragmentShader: `
              uniform float uSamples;
              varying vec3 vNearest;
              flat in int iIndex;
              void main() {
                //vec2 fib = vNearest.xy;
                //vec2 uv = gl_FragCoord.xy;
                //if (distance(uv, fib) > 0.0) {
                //  gl_FragColor = vec4(0.0, 0.0, 1.0, 0.75);
                //}
                gl_FragColor = vec4(float(iIndex) / uSamples, 0.0, 1.0 - float(iIndex) / uSamples, 1);
              }
            `,
          }]} />
        </mesh>
      )*/}

      {/*
      {lotGeometry && config && (
        <points ref={lotsMesh} scale={1.01}>
          <primitive attach="geometry" object={lotGeometry} />
          <shaderMaterial attach="material" args={[{
            transparent: true,
            uniforms: {
              uSamples: { type: 'f', value: Math.floor(4 * Math.PI * config.radius * config.radius / 1e6) },
              uResolution: mapSize
            },
            vertexShader: `varying vec3 vNearest;
              void main() {
                vNearest = position;
                gl_PointSize = 10.0;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform float uSamples;
              varying vec3 vNearest;
              flat in int iIndex;
              void main() {
                //vec2 fib = vNearest.xy;
                //vec2 uv = gl_FragCoord.xy;
                //if (distance(uv, fib) > 0.0) {
                //  gl_FragColor = vec4(0.0, 0.0, 1.0, 0.75);
                //}
                gl_FragColor = vec4(float(iIndex) / uSamples, 0.0, 1.0 - float(iIndex) / uSamples, 1);
              }
            `,
          }]} />
        </points>
      )}
      */}
      {showFib && fibMaterials && geometry && (
        <mesh ref={fibMesh} material={fibMaterials}>
          <primitive attach="geometry" object={geometry} />
        </mesh>
      )}
      {/*
      {showFib && fibPointsMaterials && fibGeometry && (
        <points ref={fibPointsMesh} material={fibPointsMaterials}>
          <primitive attach="geometry" object={fibGeometry} />
        </points>
      )}
      */}
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
