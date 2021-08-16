import { useEffect, useState } from 'react';
import { Vector3 } from 'three';
import { KeplerianOrbit } from 'influence-utils';

import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import Details from '~/components/Details';

const RouteDetails = (props) => {
  const time = useStore(s => s.time.current);
  const originId = useStore(s => s.asteroids.origin);
  const destinationId = useStore(s => s.asteroids.destination);
  const { data: origin } = useAsteroid(originId);
  const { data: destination } = useAsteroid(destinationId);
  const [ distances, setDistances ] = useState();

  useEffect(() => {
    if (!origin || !destination) return;

    const originOrbit = new KeplerianOrbit(origin.orbital);
    const destOrbit = new KeplerianOrbit(destination.orbital);
    const originVec = new Vector3();
    const destVec = new Vector3();
    const newDistances = [];

    for (let i = -1460; i <= 1460; i++) {
      originVec.fromArray(Object.values(originOrbit.getPositionAtTime(time + i)));
      destVec.fromArray(Object.values(destOrbit.getPositionAtTime(time + i)));
      newDistances.push(originVec.distanceTo(destVec));
    }

    setDistances(newDistances);
  }, [ time, origin, destination ]);

  useEffect(() => {
    console.log(distances?.length);
  }, [ distances ]);

  return (
    <Details title="Route Details">
    </Details>
  )
};

export default RouteDetails;
