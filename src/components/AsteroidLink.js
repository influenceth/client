import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Asteroid } from '@influenceth/sdk';

import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import formatters from '~/lib/formatters';

const AsteroidLink = (props) => {
  const { id, name: initialName, forceBaseName } = props;
  const { data: owned } = useOwnedAsteroids();

  const name = useMemo(() => {
    if (owned) {
      const match = owned.find(a => a.i === Number(id));
      if (match) {
        if (forceBaseName) return Asteroid.getBaseName(match?.i);
        return formatters.asteroidName(match);
      }
    }
    return initialName || '';
  }, [ owned, id, initialName, forceBaseName ])

  return <Link to={`/asteroids/${id}`}>{name || `#${id}`}</Link>;
};

export default AsteroidLink;
