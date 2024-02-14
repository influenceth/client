import { useEffect, useMemo, useRef } from 'react';
import {
  // AxesHelper,
  // BoxHelper,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LineDashedMaterial,
  Line,
  LineLoop,
  Points,
  PointsMaterial,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  ShaderMaterial,
  Vector3,
  TextureLoader,
  PlaneGeometry,
} from 'three';

import useGetTime from '~/hooks/useGetTime';
import constants from '~/lib/constants';
import theme from '~/theme';
import { useFrame, useThree } from '@react-three/fiber';

const { AU, TELEMETRY_SCALE } = constants;

const hexToGLSL = (hex) => {
  const color = new Color().setStyle(hex);
  return color.convertSRGBToLinear().toArray();
};
const MAIN_COLOR = new Color(theme.colors.main).convertSRGBToLinear();
const SUCCESS_COLOR = new Color(theme.colors.success).convertSRGBToLinear();
const DISABLED_COLOR = MAIN_COLOR;  // TODO: ...

const BLUE_GLSL = hexToGLSL(theme.colors.main);
const GREEN_GLSL = hexToGLSL(theme.colors.success);
const RED_GLSL = BLUE_GLSL;//hexToGLSL('#777777');//hexToGLSL(theme.colors.error);


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
  equatorCircle: {
    enabled: false,
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
  southPole: {
    enabled: true,
    bloom: true
  },
  accessControl: {
    enabled: true,
    orientation: 'equator',  // equator, planar // TODO: equator does not support camera following
    bloom: { disc: false, circle: true, sign: true }
  },
  shipCircle: {
    enabled: true,
    dashed: false,
    hideCircle: false,
    onEmpty: 'show', // dash, hide
    orientation: 'equator', // equator, inclination, planar
    bloom: { circle: false, ship: true },
    scale: 1.0,//0.8,//1.2,
    shipsPerLot: 0.0001
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

const Telemetry = ({ axis, getPosition, getRotation, hasAccess, initialCameraPosition, isScanned, attachTo, radius, scaleHelper, shipTally, spectralType }) => {
  const { controls } = useThree();
  const getTime = useGetTime();

  const rotationalAxis = useRef();
  const equatorCircle = useRef();
  const shipGroup = useRef();
  const rotationalMarkersGroup = useRef();
  const planarCircle = useRef();  // parallel to avg belt plane (i.e. z = 0)
  const inclinationCircle = useRef(); // parallel to light rays
  const trajectory = useRef();

  const accessDisc = useRef();
  const accessCircle = useRef();
  const accessGroup = useRef();

  const helper = useRef();
  const shipTime = useRef();

  const circleRadius = useMemo(() => TELEMETRY_SCALE * radius, [radius]);
  const circleAttenuation = useMemo(() => Math.max(1.4, 0.75 * scaleHelper) * radius, [radius]);
  const trajectoryAttenuation = useMemo(() => Math.max(10, 2 * scaleHelper) * radius, [radius]);
  const shipAngularVelocity = useMemo(() => {
    const shipHeight = TELEMETRY_SCALE * config.shipCircle.scale;
    const period = Math.sqrt(3 * Math.PI * shipHeight ** 3 / (densityByType[spectralType] * GRAV));
    return 2 * Math.PI / period;
  }, [spectralType]);

  useEffect(() => {
    if (!attachTo) return;
    const circleSegments = 360;

    const material = getLineMaterial(BLUE_GLSL, circleAttenuation, 0.7);
    // (can't clone dashed material because doesn't clone onBeforeCompile)
    const getDashedMaterial = () => getDashedLineMaterial(
      MAIN_COLOR,
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

    rotationalMarkersGroup.current = new Group();
    rotationalMarkersGroup.current.lookAt(axis.clone().normalize());
    rotationalMarkersGroup.current.updateMatrixWorld();

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
        config.rotationalAxis.dashed ? getDashedMaterial() : getLineMaterial(BLUE_GLSL, circleAttenuation)
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
        getLineMaterial(BLUE_GLSL, trajectoryAttenuation)
      );
      trajectory.current.userData.bloom = config.trajectoryLine.bloom;
    }

    if (config.northPole.enabled) {
      const poleMarkerSize = circleRadius / 8;
      const northPole = new Mesh(
        new PlaneGeometry(poleMarkerSize, poleMarkerSize, 1, 1),
        new MeshBasicMaterial({
          color: MAIN_COLOR,
          map: new TextureLoader().load('/textures/asteroid/marker_pole_n.png'),
          side: DoubleSide,
          toneMapped: false,
          transparent: true
        })
      );

      northPole.position.set(0, 0, circleRadius + poleMarkerSize * 0.2);
      northPole.rotateX(Math.PI / 2);
      northPole.userData.bloom = config.northPole.bloom;

      rotationalMarkersGroup.current.add(northPole);
    }

    if (config.southPole.enabled) {
      const poleMarkerSize = circleRadius / 8;
      const southPole = new Mesh(
        new PlaneGeometry(poleMarkerSize, poleMarkerSize, 1, 1),
        new MeshBasicMaterial({
          color: MAIN_COLOR,
          map: new TextureLoader().load('/textures/asteroid/marker_pole_s.png'),
          side: DoubleSide,
          toneMapped: false,
          transparent: true
        })
      );

      southPole.position.set(0, 0, -1 * (circleRadius + poleMarkerSize * 0.2));
      southPole.rotateX(Math.PI / 2);
      southPole.userData.bloom = config.southPole.bloom;

      rotationalMarkersGroup.current.add(southPole);
    }

    if (config.shipCircle.enabled) {
      // const shipTally = Math.min(200, Math.round(config.shipCircle.shipsPerLot * 4 * Math.PI * Math.pow(radius / 1e3, 2)) + Math.round(Math.random()));
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
        const shipRadius = TELEMETRY_SCALE * config.shipCircle.scale * radius;
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
            color: MAIN_COLOR,
            map: shipSprite,
            alphaTest: 0.7,
            size: Math.min(2000, Math.max(100, Math.round(radius / 50))),
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

      const discMarginMult = 0.012;
      const discWidthMult = 0.045;

      const discRadiusScale = Math.max(
        config.shipCircle.scale + discMarginMult * 2,
        scaleHelper
      );

      const innerDiscRadius = circleRadius * discRadiusScale;
      const discMargin = innerDiscRadius * discMarginMult;
      const discWidth = innerDiscRadius * discWidthMult;

      const outerDiscRadius = innerDiscRadius + discWidth;
      accessDisc.current = new Mesh(
        new RingGeometry(
          innerDiscRadius,
          outerDiscRadius,
          circleSegments
        ),
        new MeshBasicMaterial({
          color: hasAccess ? SUCCESS_COLOR : MAIN_COLOR,
          opacity: 0.25,
          side: DoubleSide,
          toneMapped: false,
          transparent: true
        })
      );
      accessDisc.current.userData.bloom = config.accessControl.bloom.disc;

      // circle
      const accessCircleVertices = [];
      const accessCircleRadius = outerDiscRadius + discMargin;

      const maxSignageWidth = 1000;
      const SIGNAGE_THETA = Math.min(
        0.02,
        maxSignageWidth / accessCircleRadius * 2 * Math.PI
      );

      for (let i = 0; i < circleSegments; i++) {
        const theta = i * (1 - SIGNAGE_THETA) * (2 * Math.PI) / circleSegments + SIGNAGE_THETA * Math.PI;
        accessCircleVertices.push(accessCircleRadius * Math.cos(theta));
        accessCircleVertices.push(accessCircleRadius * Math.sin(theta));
        accessCircleVertices.push(0);
      }
      const accessCircleGeometry = new BufferGeometry();
      accessCircleGeometry.setAttribute('position', new BufferAttribute(new Float32Array(accessCircleVertices), 3));

      const accessLineMaterial = getLineMaterial(
        hasAccess ? GREEN_GLSL : RED_GLSL,
        circleAttenuation,
        1.0
      );
      accessCircle.current = new Line(
        accessCircleGeometry,
        accessLineMaterial.clone()
      );
      accessCircle.current.material.userData.bloom = config.accessControl.bloom.circle;
      accessCircle.current.material.needsUpdate = true;

      // "gate"
      const hGateSprite = new TextureLoader().load('/textures/asteroid/docking_gate_h.png');
      const dockingGateSize = accessCircleRadius * 2 * Math.PI * SIGNAGE_THETA;
      const dockingGateHorizontal = new Mesh(
        new PlaneGeometry(dockingGateSize, dockingGateSize, 1, 1),
        new MeshBasicMaterial({
          alphaTest: 0.1,
          color: isScanned ? MAIN_COLOR : DISABLED_COLOR,
          map: hGateSprite,
          side: DoubleSide,
          toneMapped: false,
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
          color: isScanned ? MAIN_COLOR : DISABLED_COLOR,
          map: vGateSprite,
          side: DoubleSide,
          toneMapped: false,
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
        if (controls) {
          // get initialCameraPosition in equatorial plane
          // then rotate accessGroup so sign is facing camera
          const adjustedCameraPosition = initialCameraPosition.clone().applyQuaternion(accessGroup.current.quaternion.clone().invert());
          let signRotation = Math.atan(adjustedCameraPosition.y / adjustedCameraPosition.x);
          if (adjustedCameraPosition.x < 0) signRotation += Math.PI;
          accessGroup.current.rotateZ(signRotation + 0.05);
        }
      }
    }

    // helper.current = new AxesHelper(2 * radius);
    // helper.current = new BoxHelper(accessGroup.current);

    // if (accessGroup.current) attachTo.add(accessGroup.current);
    // if (equatorCircle.current) attachTo.add(equatorCircle.current);
    if (helper.current) attachTo.add(helper.current);
    // if (inclinationCircle.current) attachTo.add(inclinationCircle.current);
    if (rotationalMarkersGroup.current) attachTo.add(rotationalMarkersGroup.current);
    // if (planarCircle.current) attachTo.add(planarCircle.current);
    if (rotationalAxis.current) attachTo.add(rotationalAxis.current);
    // if (shipGroup.current) attachTo.add(shipGroup.current);
    if (trajectory.current) attachTo.add(trajectory.current);

    return () => {
      // if (accessGroup.current) attachTo.remove(accessGroup.current);
      // if (equatorCircle.current) attachTo.remove(equatorCircle.current);
      if (helper.current) attachTo.remove(helper.current); // eslint-disable-line react-hooks/exhaustive-deps
      // if (inclinationCircle.current) attachTo.remove(inclinationCircle.current);
      if (rotationalMarkersGroup.current) attachTo.remove(rotationalMarkersGroup.current);
      // if (planarCircle.current) attachTo.remove(planarCircle.current);
      if (rotationalAxis.current) attachTo.remove(rotationalAxis.current);
      // if (shipGroup.current) attachTo.remove(shipGroup.current);
      if (trajectory.current) attachTo.remove(trajectory.current);
    };
  }, [!attachTo, radius]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // TODO: update the number of ships on the ship circle (or dash if empty)
  }, [shipTally]);

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
          const p = orbit.clone().multiplyScalar(i * AU);
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

      if (rotationalMarkersGroup.current) {
        rotationalMarkersGroup.current.rotateZ(lastRotation.current ? rotation - lastRotation.current : rotation);
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

      if (accessGroup.current) {
        if (config.accessControl.orientation === 'planar') {
          if (controls.object.position.x !== 0) {
            let rot = Math.atan(controls.object.position.y / controls.object.position.x);
            if (controls.object.position.x < 0) rot += Math.PI;
            accessGroup.current.setRotationFromAxisAngle(new Vector3(0, 0, 1), rot);
          }
        } else if (config.accessControl.orientation === 'equator') {
          accessGroup.current.rotateZ(-0.00002);
        }
      }
    }
  });

  return null;
};

export default Telemetry;
