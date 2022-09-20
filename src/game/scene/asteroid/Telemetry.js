import { useEffect, useMemo, useRef } from 'react';
import { KeplerianOrbit } from 'influence-utils';
import {
  AxesHelper,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Float64BufferAttribute,
  Group,
  LineBasicMaterial,
  LineDashedMaterial,
  Line,
  LineLoop,
  Points,
  PointsMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
  TextureLoader,
  PlaneGeometry,
} from 'three';
import * as THREE from 'three';

import useGetTime from '~/hooks/useGetTime';
import constants from '~/lib/constants';
import theme from '~/theme';
import { useFrame, useThree } from '@react-three/fiber';


const hexToGLSL = (hex) => {
  const aRgbHex = hex.substr(1).match(/.{1,2}/g);
  return [
    parseInt(aRgbHex[0], 16) / 255,
    parseInt(aRgbHex[1], 16) / 255,
    parseInt(aRgbHex[2], 16) / 255
  ];
};
const BLUE = hexToGLSL(theme.colors.main);
const GREEN = hexToGLSL(theme.colors.success);
const RED = BLUE;//hexToGLSL('#777777');//hexToGLSL(theme.colors.error);
const SIGNAGE_THETA = 0.05;

const getLineMaterial = (rgb, fogDistance, maxAlpha = 1) => {
  return new ShaderMaterial({
    transparent: true,
    vertexShader: `
      varying vec4 vmvPosition;
      void main() {
        vmvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * vmvPosition;
        //gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec4 vmvPosition;

      void main() {
        gl_FragColor = vec4(
          ${rgb.join(', ')},
          ${maxAlpha.toFixed(1)} * (1.0 - clamp(-vmvPosition.z / (${(2 * fogDistance).toFixed(1)}), 0.0, 1.0))
        );
      }
    `
  });
}

const getDashedLineMaterial = (color, glslColor, fogDistance, radius, maxAlpha = 1) => {
  const material = new LineDashedMaterial({
    color,
    transparent: true,
    opacity: 0.99,
    scale: 0.1,
    dashSize: Math.round(radius / 500),
    gapSize: Math.round(radius / 500)
  });

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      varying vec4 vmvPosition;
      ${shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vmvPosition = mvPosition;
        `
      )}
    `;
    shader.fragmentShader = `
      varying vec4 vmvPosition;
      ${shader.fragmentShader.replace(
        '#include <premultiplied_alpha_fragment>',
        `#include <premultiplied_alpha_fragment>
        gl_FragColor = vec4(
          ${glslColor},
          ${maxAlpha.toFixed(1)} * (1.0 - clamp(-vmvPosition.z / (${(2 * fogDistance).toFixed(1)}), 0.0, 1.0))
        );
        `
      )}
    `;
  };

  return material;
};


// TODO (enhancement): attenuation of all lines should happen entirely between +r and -r of the circle
//  where + is toward camera, and - is away from
//  (for trajectory line, can treat similarly or perhaps should just attenuate from asteroid)
// since screen space, if way zoomed out, may want to fade all anyway... can do that explicitly or
//  through a fallback mode of attenuation related just to camera distance


const config = {
  trajectoryLine: {
    enabled: true,
    bloom: false
  },
  rotationalAxis: {
    enabled: true,
    bloom: true
  },
  meridianCircle: {
    enabled: true,
    bloom: true,
    // dashed: true
  },
  equatorCircle: {
    enabled: true,
    bloom: true
  },
  inclinationCircle: {
    enabled: false,
    bloom: false
  },
  planarCircle: {
    enabled: false,
    bloom: true
  },

  northPole: {
    enabled: true,
    bloom: true
  },
  accessControl: {
    enabled: true,
    orientation: 'planar',  // equator, planar // TODO: equator does not support camera following
    scale: 1.1, // null | 1.0,
    bloom: { disc: false, circle: true, sign: true }
  },
  shipCircle: {
    enabled: true,
    dashed: false,
    hideCircle: false,
    onEmpty: 'hide', // dash, hide
    orientation: 'equator', // equator, inclination, planar
    bloom: { circle: true, ship: true },
    scale: 1.2,
    shipsPerLot: 0.02
  }
};

const densityByType = {
  I: 1100,
  C: 1400,
  S: 2700,
  M: 5000,
  Si: 1900,
  Ci: 1250,
  Cm: 3200,
  Sm: 3850,
  Cis: 1733,
  Cms: 3033,
  Cs: 2050,
};

const GRAV = 6.6743E-11;

const defaultTelemetryRadius = 1.1;

const Telemetry = ({ axis, getPosition, getRotation, hasAccess, radius, spectralType }) => {
  const { scene, controls } = useThree();
  const getTime = useGetTime();

  const rotationalAxis = useRef();
  const equatorCircle = useRef();
  const shipGroup = useRef();
  const meridianCircle = useRef();
  const northPole = useRef();
  const planarCircle = useRef();  // parallel to avg belt plane (i.e. z = 0)
  const inclinationCircle = useRef(); // parallel to light rays
  const trajectory = useRef();

  const accessDisc = useRef();
  const accessCircle = useRef();
  const accessGroup = useRef();

  const helper = useRef();
  const shipTime = useRef();
  
  const circleRadius = useMemo(() => defaultTelemetryRadius * radius, [radius]);
  const circleAttenuation = useMemo(() => 1.6 * radius, [radius]);
  const trajectoryAttenuation = useMemo(() => 10 * radius, [radius]);
  const shipAngularVelocity = useMemo(() => {
    const shipHeight = defaultTelemetryRadius * config.shipCircle.scale;
    const period = Math.sqrt(3 * Math.PI * shipHeight ** 3 / (densityByType[spectralType] * GRAV));
    return 2 * Math.PI / period;
  }, [radius]);

  useEffect(() => {
    const circleSegments = 360;

    const material = getLineMaterial(BLUE, circleAttenuation, 0.7);
    // (can't clone dashed material because doesn't clone onBeforeCompile)
    const getDashedMaterial = () => getDashedLineMaterial(
      theme.colors.main,
      hexToGLSL(theme.colors.main),
      circleAttenuation,
      radius,
      0.7
    );

    const circleVertices = [];
    for (let i = 0; i < circleSegments; i++) {
      const theta = i * 2 * Math.PI / circleSegments;
      circleVertices.push(circleRadius * Math.cos(theta));
      circleVertices.push(circleRadius * Math.sin(theta));
      circleVertices.push(0);
    }

    const vertCircleVertices = [];
    for (let i = 0; i < circleSegments; i++) {
      const theta = i * 2 * Math.PI / circleSegments;
      vertCircleVertices.push(circleRadius * Math.sin(theta));
      vertCircleVertices.push(0);
      vertCircleVertices.push(circleRadius * Math.cos(theta));
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(circleVertices), 3));

    const vertGeometry = new BufferGeometry();
    vertGeometry.setAttribute('position', new BufferAttribute(new Float32Array(vertCircleVertices), 3));

    // instantiate lines (and apply any one-time orientations)
    if (config.equatorCircle.enabled) {
      equatorCircle.current = new LineLoop(geometry.clone(), config.equatorCircle.dashed ? getDashedMaterial() : material.clone());
      if (config.equatorCircle.dashed) equatorCircle.current.computeLineDistances();
      equatorCircle.current.userData.bloom = config.equatorCircle.bloom;

      equatorCircle.current.lookAt(axis.clone().normalize());
    }

    if (config.meridianCircle.enabled) {
      meridianCircle.current = new LineLoop(vertGeometry.clone(), config.meridianCircle.dashed ? getDashedMaterial() : material.clone());
      if (config.meridianCircle.dashed) meridianCircle.current.computeLineDistances();
      meridianCircle.current.userData.bloom = config.meridianCircle.bloom;

      meridianCircle.current.lookAt(axis.clone().normalize());
      meridianCircle.current.updateMatrixWorld();
    }

    if (config.planarCircle.enabled) {
      planarCircle.current = new LineLoop(geometry.clone(), config.planarCircle.dashed ? getDashedMaterial() : material.clone());
      if (config.planarCircle.dashed) planarCircle.current.computeLineDistances();
      planarCircle.current.userData.bloom = config.planarCircle.bloom;
    }

    if (config.inclinationCircle.enabled) {
      inclinationCircle.current = new LineLoop(geometry.clone(), config.inclinationCircle.dashed ? getDashedMaterial() : material.clone());
      if (config.inclinationCircle.dashed) inclinationCircle.current.computeLineDistances();
      inclinationCircle.current.userData.bloom = config.inclinationCircle.bloom;
    }

    if (config.rotationalAxis.enabled) {
      rotationalAxis.current = new Line(
        new BufferGeometry(),
        config.rotationalAxis.dashed ? getDashedMaterial() : getLineMaterial(BLUE, circleAttenuation)
      );
      rotationalAxis.current.userData.bloom = config.rotationalAxis.bloom;

      // orient
      const vertices = [];
      for (let i = -1; i <= 1; i++) {
        const p = axis.clone().multiplyScalar(i * circleRadius);
        vertices.push(p.x);
        vertices.push(p.y);
        vertices.push(p.z);
      }
      rotationalAxis.current.geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
      rotationalAxis.current.geometry.computeBoundingSphere(); // TODO: is this needed?
    }

    if (config.trajectoryLine.enabled) {
      trajectory.current = new Line(
        new BufferGeometry(),
        getLineMaterial(BLUE, trajectoryAttenuation)
      );
      trajectory.current.userData.bloom = config.trajectoryLine.bloom;
    }

    if (config.northPole.enabled) {
      const poleMarkerSize = circleRadius / 10;
      const pole = axis.clone().multiplyScalar(circleRadius);
      northPole.current = new Sprite(
        new SpriteMaterial({
          color: theme.colors.main,
          map: new TextureLoader().load('/textures/asteroid/marker_pole.png'),
        })
      );
      northPole.current.scale.set(poleMarkerSize, poleMarkerSize, poleMarkerSize);
      northPole.current.position.set(pole.x, pole.y, pole.z + poleMarkerSize * 0.2);
      northPole.current.userData.bloom = config.northPole.bloom;
    }

    if (config.shipCircle.enabled) {
      const shipTally = Math.min(200, Math.round(config.shipCircle.shipsPerLot * 4 * Math.PI * Math.pow(radius / 1e3, 2)) + Math.round(Math.random()));
      if (shipTally > 0 || config.shipCircle.onEmpty !== 'hide') {
        const shipSprite = new TextureLoader().load('/disc.png');

        const dashCircle = config.shipCircle.dashed || (shipTally === 0 && config.shipCircle.onEmpty === 'dash');
        const shipCircle = new LineLoop(
          geometry.clone().scale(
            config.shipCircle.scale,
            config.shipCircle.scale,
            config.shipCircle.scale,
          ),
          dashCircle ? getDashedMaterial() : material.clone()
        );
        if (dashCircle) shipCircle.computeLineDistances();
        shipCircle.userData.bloom = config.shipCircle.bloom.circle;

        const shipVertices = [];
        const shipRadius = defaultTelemetryRadius * config.shipCircle.scale * radius;
        for (let i = 0; i < shipTally; i++) {
          const angle = 2 * Math.PI * Math.random();
          const x = shipRadius * Math.cos(angle);
          const y = shipRadius * Math.sin(angle);
          const z = 0;
          shipVertices.push(x, y, z);
        }
        
        const shipPointGeometry = new BufferGeometry();
        shipPointGeometry.setAttribute('position', new Float32BufferAttribute( shipVertices, 3 ));
        const shipCirclePoints = new Points(
          shipPointGeometry,
          new PointsMaterial({
            color: `rgb(${theme.colors.mainRGB})`,
            map: shipSprite,
            alphaTest: 0.7,
            size: Math.round(radius / 50),
            sizeAttenuation: true
          })
        );
        shipCirclePoints.userData.bloom = config.shipCircle.bloom.ship;

        shipGroup.current = new Group();
        if (!config.shipCircle.hideCircle) shipGroup.current.add(shipCircle);
        shipGroup.current.add(shipCirclePoints);

        if (config.shipCircle.orientation === 'equator') {
          shipGroup.current.lookAt(axis.clone().normalize());
        }
      }
    }

    // TODO (enhancement): accessGroup is lots of extra code (and more when text added), might be nice to put in separate file
    if (config.accessControl.enabled) {
      // disc
      const discMargin = radius * 0.005;
      const discWidth = radius * 0.03;

      const innerDiscRadius = config.accessControl.scale
        ? circleRadius * config.accessControl.scale
        : circleRadius + discMargin + discWidth;
      const outerDiscRadius = innerDiscRadius + discWidth;
      accessDisc.current = new Mesh(
        new RingGeometry(
          innerDiscRadius,
          outerDiscRadius,
          circleSegments
        ),
        new MeshBasicMaterial({
          color: new Color(hasAccess ? theme.colors.success : theme.colors.main).convertSRGBToLinear(),
          opacity: 0.25,
          side: DoubleSide,
          transparent: true
        })
      );
      accessDisc.current.userData.bloom = config.accessControl.bloom.disc;

      // circle
      const accessCircleVertices = [];
      const accessCircleRadius = outerDiscRadius + discMargin;
      for (let i = 0; i < circleSegments; i++) {
        const theta = i * (1 - SIGNAGE_THETA) * (2 * Math.PI) / circleSegments + SIGNAGE_THETA * Math.PI;
        accessCircleVertices.push(accessCircleRadius * Math.cos(theta));
        accessCircleVertices.push(accessCircleRadius * Math.sin(theta));
        accessCircleVertices.push(0);
      }
      const accessCircleGeometry = new BufferGeometry();
      accessCircleGeometry.setAttribute('position', new BufferAttribute(new Float32Array(accessCircleVertices), 3));

      const accessLineMaterial = getLineMaterial(
        hasAccess ? GREEN : RED,
        circleAttenuation,
        1.0
      );
      accessCircle.current = new Line(
        accessCircleGeometry,
        accessLineMaterial.clone()
      );
      accessCircle.current.userData.bloom = config.accessControl.bloom.circle;

      // "gate"
      const hGateSprite = new TextureLoader().load('/textures/asteroid/docking_gate_h.png');
      const dockingGateSize = accessCircleRadius * 2 * Math.PI * SIGNAGE_THETA;
      const dockingGateHorizontal = new Mesh(
        new PlaneGeometry(dockingGateSize, dockingGateSize, 1, 1),
        new MeshBasicMaterial({
          alphaTest: 0.1,
          color: theme.colors.main,
          map: hGateSprite,
          side: DoubleSide,
          transparent: true
        })
      );
      dockingGateHorizontal.rotateZ(Math.PI / 2);
      dockingGateHorizontal.userData.bloom = true;

      const vGateSprite = new TextureLoader().load('/textures/asteroid/docking_gate_v.png');
      const dockingGateVertical = new Mesh(
        new PlaneGeometry(dockingGateSize, dockingGateSize, 1, 1),
        new MeshBasicMaterial({
          alphaTest: 0.1,
          color: theme.colors.main,
          map: vGateSprite,
          side: DoubleSide,
          transparent: true
        })
      );
      dockingGateVertical.rotateY(Math.PI / 2);
      dockingGateVertical.rotateZ(Math.PI / 2);
      dockingGateVertical.userData.bloom = true;

      const accessGroupSign = new Group();
      accessGroupSign.add(dockingGateHorizontal);
      accessGroupSign.add(dockingGateVertical);
      accessGroupSign.position.set(accessCircleRadius, 0, 0);

      // put in one group
      accessGroup.current = new Group();
      // TODO: do accessDisc and accessCircle need to be refs?
      accessGroup.current.add(accessDisc.current);
      accessGroup.current.add(accessCircle.current);
      accessGroup.current.add(accessGroupSign);

      if (config.accessControl.orientation === 'equator') {
        accessGroup.current.lookAt(axis.clone().normalize());
      }
    }

    // helper.current = new AxesHelper(2 * radius);

    if (accessGroup.current) scene.add(accessGroup.current);
    if (equatorCircle.current) scene.add(equatorCircle.current);
    if (helper.current) scene.add(helper.current);
    if (inclinationCircle.current) scene.add(inclinationCircle.current);
    if (meridianCircle.current) scene.add(meridianCircle.current);
    if (northPole.current) scene.add(northPole.current);
    if (planarCircle.current) scene.add(planarCircle.current);
    if (rotationalAxis.current) scene.add(rotationalAxis.current);
    if (shipGroup.current) scene.add(shipGroup.current);
    if (trajectory.current) scene.add(trajectory.current);

    return () => {
      if (accessGroup.current) scene.remove(accessGroup.current);
      if (equatorCircle.current) scene.remove(equatorCircle.current);
      if (helper.current) scene.remove(helper.current);
      if (inclinationCircle.current) scene.remove(inclinationCircle.current);
      if (meridianCircle.current) scene.remove(meridianCircle.current);
      if (northPole.current) scene.remove(northPole.current);
      if (planarCircle.current) scene.remove(planarCircle.current);
      if (rotationalAxis.current) scene.remove(rotationalAxis.current);
      if (shipGroup.current) scene.remove(shipGroup.current);
      if (trajectory.current) scene.remove(trajectory.current);
    };
  }, []);

  const lastRotation = useRef();
  useFrame(() => {
    const position = getPosition();
    const rotation = getRotation();
    if (position) {
      // TODO (enhancement): depending on what is displayed, not all these pre-calculations may be necessary
      const pos = new Vector3(...position).normalize();
      
      // vector pointing along approx. orbit (perpendicular to position, within xy)
      const orbit = pos.clone()
        .setZ(0)
        .applyAxisAngle(new Vector3(0, 0, 1), Math.PI/2);

      // vector pointing 90 deg above position (for inclinationCircle to "lookAt")
      const solar = pos.clone().applyAxisAngle(orbit, -Math.PI/2);

      if (trajectory.current) {
        const vertices = [];
        for (let i = -1; i <= 1; i++) {
          const p = orbit.clone().multiplyScalar(i * constants.AU);
          vertices.push(p.x);
          vertices.push(p.y);
          vertices.push(p.z);
        }
        trajectory.current.geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
        trajectory.current.geometry.computeBoundingSphere(); // TODO: is this needed?
      }

      if (inclinationCircle.current) {
        inclinationCircle.current.lookAt(solar);
      }

      if (meridianCircle.current) {
        meridianCircle.current.rotateZ(lastRotation.current ? rotation - lastRotation.current : rotation);
        lastRotation.current = rotation;
      }

      if (shipGroup.current) {
        if (config.shipCircle.orientation === 'inclination') {
          shipGroup.current.lookAt(solar);
        }

        const now = getTime() * 86400;
        const shipDelta = now - (shipTime.current || now);
        // rotate children instead of group because otherwise "inclination" mode breaks (due to repeated lookAt's)
        // TODO (enhancement): if not using inclination, just rotate group
        shipGroup.current.children.forEach((c) => {
          if (c.isPoints) c.rotateZ(shipAngularVelocity * shipDelta);
        });
        shipTime.current = now;
      }

      if (accessGroup.current && config.accessControl.orientation === 'planar') {
        if (controls.object.position.x !== 0) {
          let rot = Math.atan(controls.object.position.y / controls.object.position.x);
          if (controls.object.position.x < 0) rot += Math.PI;
          accessGroup.current.setRotationFromAxisAngle(new Vector3(0, 0, 1), rot);
        }
      }
    }
  });

  return null;
};

export default Telemetry;
