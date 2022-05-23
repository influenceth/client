import { useEffect, useMemo, useRef } from 'react';
import { KeplerianOrbit } from 'influence-utils';
import {
  AxesHelper,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineDashedMaterial,
  Line,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';

import constants from '~/lib/constants';
import theme from '~/theme';
import { useFrame, useThree } from '@react-three/fiber';

// TODO:
//  (maybe) add mini-circle to rotational axis / something for navigation

// BLOOM

// add ship circle (with ships)
//  rotational speed:
//    Orbital Period = 2*pi*sqrt(r^3 / (Gm)) where m is mass of larger body and G is 6.674×10−11 m3⋅kg−1⋅s−2

// text

// TODO:
//  could probably separate useEffect's for different pieces to make more organized

// TODO:
//  - attenuation strategy could be distance from asteroid but only on opposite side
//    from camera (and consistent on types (but multiplied by initial alpha)

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

const getDashedLineMaterial = (rgb, fogDistance, maxAlpha = 1) => {
  const material = new LineDashedMaterial({
    color: `rgb(${rgb.join(',')})`,
    transparent: true,
    scale: 0.1,
    dashSize: 1,
    gapSize: 1,
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
          ${rgb.join(', ')},
          ${maxAlpha.toFixed(1)} * (1.0 - clamp(-vmvPosition.z / (${(2 * fogDistance).toFixed(1)}), 0.0, 1.0))
        );
        `
      )}
    `;
  };
  return material;
};

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
const RED = hexToGLSL(theme.colors.error);

const SIGNAGE_THETA = 0.05;

// TODO: leading bloom on trajectory
// 

// TODO: may be non-performant to pass position and rotation in as props?
const Telemetry = ({ axis, getPosition, getRotation, hasAccess, radius }) => {
  const { scene, controls } = useThree();

  const helper = useRef();
  
  const rotationalAxis = useRef();
  const equatorCircle = useRef(); // rotational equator
  const shipCircle = useRef(); // rotational equator
  const perpendicularCircle = useRef();

  const lightCircle = useRef();   // parallel to light rays
  const systemCircle = useRef();  // parallel to stellar plane
  const trajectory = useRef();

  const accessDisc = useRef();
  const accessCircle = useRef();
  const accessGroup = useRef();

  const circleRadius = radius * 1.0;

  const circleAttenuation = 4 * radius;
  const trajectoryAttenuation = 10 * radius;

  useEffect(() => {
    const discMargin = radius * 0.005;
    const discWidth = radius * 0.03;
    const circleSegments = 100;

    const material = getLineMaterial(BLUE, circleAttenuation, 0.7);

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

    equatorCircle.current = new LineLoop(geometry.clone(), material.clone());
    equatorCircle.current.lookAt(axis);

    shipCircle.current = new LineLoop(geometry.clone(), material.clone());
    shipCircle.current.lookAt(axis);

    perpendicularCircle.current = new LineLoop(vertGeometry.clone(), material.clone());
    perpendicularCircle.current.lookAt(axis);
    perpendicularCircle.current.updateMatrixWorld();

    systemCircle.current = new LineLoop(geometry.clone(), getDashedLineMaterial(BLUE, circleAttenuation, 0.7));
    systemCircle.current.computeLineDistances();  // (necessary for dashed line)

    lightCircle.current = new LineLoop(geometry.clone(), material.clone());

    rotationalAxis.current = new Line(
      new BufferGeometry(),
      getLineMaterial(BLUE, circleAttenuation)
    );

    // TODO (enhancement): trajectory in theory should attenuate from asteroid instead of camera
    trajectory.current = new Line(
      new BufferGeometry(),
      getLineMaterial(BLUE, trajectoryAttenuation)
    );
    
    const innerDiscRadius = circleRadius + discMargin + discWidth;
    const outerDiscRadius = innerDiscRadius + discWidth;
    accessDisc.current = new Mesh(
      new RingGeometry(
        innerDiscRadius,
        outerDiscRadius,
        circleSegments
      ),
      new MeshBasicMaterial({
        color: new Color(hasAccess ? theme.colors.success : theme.colors.error).convertSRGBToLinear(),
        opacity: 0.5,
        side: DoubleSide,
        transparent: true
      })
    );

    // TODO: accessCircle could also be disc
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

    const accessLineMaterial = getLineMaterial(hasAccess ? GREEN : RED, circleAttenuation, 0.8);
    accessCircle.current = new Line(
      accessCircleGeometry,
      accessLineMaterial.clone()
    );

    const signageTheta = SIGNAGE_THETA * 1;
    const signHeight = accessCircleRadius * signageTheta;
    const signIconVertices = hasAccess
      ? [
        accessCircleRadius * Math.cos(-signageTheta), accessCircleRadius * Math.sin(-signageTheta), -0.25*signHeight,
        accessCircleRadius * Math.cos(-signageTheta/2), accessCircleRadius * Math.sin(-signageTheta/2), -0.75*signHeight,
        accessCircleRadius * Math.cos(signageTheta), accessCircleRadius * Math.sin(signageTheta), 0.75*signHeight,
      ]
      : [
        accessCircleRadius * Math.cos(-signageTheta), accessCircleRadius * Math.sin(-signageTheta), signHeight,
        accessCircleRadius, 0, 0,
        accessCircleRadius * Math.cos(signageTheta), accessCircleRadius * Math.sin(signageTheta), signHeight,
        accessCircleRadius, 0, 0,
        accessCircleRadius * Math.cos(-signageTheta), accessCircleRadius * Math.sin(-signageTheta), -signHeight,
        accessCircleRadius, 0, 0,
        accessCircleRadius * Math.cos(signageTheta), accessCircleRadius * Math.sin(signageTheta), -signHeight,
        accessCircleRadius, 0, 0,
      ];
    const signIconGeometry = new BufferGeometry();
    signIconGeometry.setAttribute('position', new BufferAttribute(new Float32Array(signIconVertices), 3));
    const signIcon = new Line(
      signIconGeometry,
      accessLineMaterial.clone()
    );
    
    const bracketHeight = signHeight * 1.5;
    const leftBracketVertices = [
      accessCircleRadius, accessCircleRadius * Math.sin(-signageTheta * 1), bracketHeight,
      accessCircleRadius, accessCircleRadius * Math.sin(-signageTheta * 1.5), bracketHeight,
      accessCircleRadius, accessCircleRadius * Math.sin(-signageTheta * 1.5), -bracketHeight,
      accessCircleRadius, accessCircleRadius * Math.sin(-signageTheta * 1), -bracketHeight,
    ];
    const leftBracketGeometry = new BufferGeometry();
    leftBracketGeometry.setAttribute('position', new BufferAttribute(new Float32Array(leftBracketVertices), 3));
    const leftBracket = new Line(
      leftBracketGeometry,
      accessLineMaterial.clone()
    );

    const rightBracketVertices = [
      accessCircleRadius, accessCircleRadius * Math.sin(signageTheta * 1), bracketHeight,
      accessCircleRadius, accessCircleRadius * Math.sin(signageTheta * 1.5), bracketHeight,
      accessCircleRadius, accessCircleRadius * Math.sin(signageTheta * 1.5), -bracketHeight,
      accessCircleRadius, accessCircleRadius * Math.sin(signageTheta * 1), -bracketHeight,
    ];
    const rightBracketGeometry = new BufferGeometry();
    rightBracketGeometry.setAttribute('position', new BufferAttribute(new Float32Array(rightBracketVertices), 3));
    const rightBracket = new Line(
      rightBracketGeometry,
      accessLineMaterial.clone()
    );


    accessGroup.current = new Group();
    accessGroup.current.add(accessDisc.current);
    accessGroup.current.add(accessCircle.current);
    accessGroup.current.add(signIcon);
    accessGroup.current.add(leftBracket);
    accessGroup.current.add(rightBracket);


    // helper.current = new AxesHelper(30000);

    if (helper.current) scene.add(helper.current);
    scene.add(rotationalAxis.current);
    scene.add(equatorCircle.current);
    // scene.add(lightCircle.current);
    scene.add(systemCircle.current);
    scene.add(perpendicularCircle.current);
    scene.add(trajectory.current);

    scene.add(accessGroup.current);

    return () => {
      if (helper.current) scene.remove(helper.current);
      scene.remove(rotationalAxis.current);
      scene.remove(equatorCircle.current);
      // scene.remove(lightCircle.current);
      scene.remove(systemCircle.current);
      scene.remove(perpendicularCircle.current);
      scene.remove(trajectory.current);
      scene.remove(accessGroup.current);
    };
  }, []);

  // useEffect(() => {
  //   const solar = new Vector3(...position);
  //   const orbit = solar.cross(new Vector3(0, -1, 0)).normalize();
  //   const perp = solar.cross(new Vector3(0, 0, 1)).normalize();
  // }, []);

  useFrame(() => {
    const position = getPosition();
    const rotation = getRotation();
    if (position) {
      const pos = new Vector3(...position).normalize();
      
      // vector pointing along approx. orbit (perpendicular to position, within xy)
      const orbit = pos.clone()
        .setZ(0)
        .applyAxisAngle(new Vector3(0, 0, 1), Math.PI/2);
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

      // TODO: this does not need to be recalculated every frame
      if (rotationalAxis.current) {
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

      // vector pointing 90 deg above position (for lightCircle to "lookAt")
      if (lightCircle.current) {
        const solar = pos.clone()
          .applyAxisAngle(orbit, Math.PI/2);
        lightCircle.current.lookAt(solar);
      }

      if (perpendicularCircle.current) {
        perpendicularCircle.current.setRotationFromAxisAngle(
          perpendicularCircle.current.worldToLocal(axis),
          rotation
        );
        // perpendicularCircle.current.material.opacity = 0.3;
      }

      if (accessGroup.current) {
        if (controls.object.position.x !== 0) {
          accessGroup.current.setRotationFromAxisAngle(
            new Vector3(0, 0, 1),
            Math.atan(controls.object.position.y / controls.object.position.x)
          );
        }
      }
    }
  });

  return null;
};

export default Telemetry;
