import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CubicBezierCurve3,
  Line,
  ShaderMaterial,
  Vector3
} from 'three';
import { Asteroid, Delivery, Entity, Lot } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';
import useDeliveries from '~/hooks/useDeliveries';
import useLot from '~/hooks/useLot';
import theme from '~/theme';

import frag from './shaders/delivery.frag';
import vert from './shaders/delivery.vert';

const Deliveries = ({ attachTo: overrideAttachTo, asteroidId, radius, getLotPosition }) => {
  const { scene } = useThree();
  const attachTo = useMemo(() => overrideAttachTo || scene, [overrideAttachTo, scene]);

  const lotId = useStore(s => s.asteroids.lot);

  const selectedLotIndex = useMemo(() => Lot.toIndex(lotId), [lotId]);
  const { data: lotDetails } = useLot(lotId);
  const deliveryEndpoint = useMemo(() => lotDetails?.building || lotDetails?.surfaceShip, [lotDetails]);
  const { data: outboundDeliveries } = useDeliveries({ origin: deliveryEndpoint, status: Delivery.STATUSES.SENT });
  const { data: inboundDeliveries } = useDeliveries({ destination: deliveryEndpoint, status: Delivery.STATUSES.SENT });

  const deliveryArcs = useRef([]);
  const deliveryUniforms = useRef({
    uTime: { value: 0 },
    uAlpha: { value: 1.0 },
    uCount: { value: 51 },
    uCol: { type: 'c', value: new Color(theme.colors.main) },
  });


  // Calculates the control point for the delivery bezier curve
  const calculateControlPoint = useCallback((origin, dest, distance, frac = 0.5) => {
    const ratio = 1 + Math.pow(distance / radius, 2);
    return origin.clone().lerp(dest, frac).multiplyScalar(Math.min(ratio, 3.5));
  }, [radius]);

  // Handle turning on and off delivery arcs when a lot is selected
  useEffect(() => {
    const newDeliveries = [];
    const material = new ShaderMaterial({
      uniforms: deliveryUniforms.current,
      fragmentShader: frag,
      vertexShader: vert,
      transparent: true,
      depthWrite: false
    });

    if (outboundDeliveries && deliveryEndpoint) {
      outboundDeliveries.forEach((delivery) => {
        const maybeLot = delivery.Delivery?.dest?.Location?.locations.find(l => l.label === Entity.IDS.LOT);
        if (maybeLot?.id) newDeliveries.push({
          originIndex: selectedLotIndex,
          destinationIndex: Lot.toIndex(maybeLot.id)
        });
      });
    }

    if (inboundDeliveries && deliveryEndpoint) {
      inboundDeliveries.forEach((delivery) => {
        const maybeLot = delivery.Delivery?.origin?.Location?.locations.find(l => l.label === Entity.IDS.LOT);
        if (maybeLot?.id) newDeliveries.push({
          originIndex: Lot.toIndex(maybeLot.id),
          destinationIndex: selectedLotIndex
        });
      });
    }

    newDeliveries.forEach(({ originIndex, destinationIndex }) => {
      const origin = new Vector3(...getLotPosition(originIndex));
      const destination = new Vector3(...getLotPosition(destinationIndex));

      let distance;

      // This shouldn't be needed, but maybe somehow previous asteroid deliveries are still in state?
      try {
        distance = Asteroid.getLotDistance(asteroidId, originIndex, destinationIndex) * 1000;
      } catch (e) {
        return;
      }

      const curve = new CubicBezierCurve3(
        origin,
        calculateControlPoint(origin, destination, distance, 1/3),
        calculateControlPoint(origin, destination, distance, 2/3),
        destination
      );

      const geometry = new BufferGeometry().setFromPoints(curve.getPoints(50));
      const order = new Float32Array(Array(51).fill().map((_, i) => i+1));
      geometry.setAttribute('order', new BufferAttribute(order, 1));

      const curveGeom = new Line(geometry, material);
      attachTo.add(curveGeom);
      deliveryArcs.current.push(curveGeom);
    });

    return () => {
      deliveryArcs.current?.forEach((arc) => attachTo.remove(arc));
      deliveryArcs.current = [];
    };
  }, [attachTo, getLotPosition, selectedLotIndex, deliveryEndpoint, inboundDeliveries, outboundDeliveries]);

  useFrame((state, delta) => {

    // If delivery arcs present, animate them
    if (deliveryArcs.current && deliveryArcs.current.length) {
      const time = deliveryUniforms.current.uTime.value;
      deliveryUniforms.current.uTime.value = time + 1;
    }
  }, 0.5);

  return null;
};

export default Deliveries;
