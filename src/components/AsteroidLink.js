import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';

const AsteroidLink = (props) => {
  const { id, name: initialName, forceBaseName } = props;
  const { data: owned } = useOwnedAsteroids();

  const name = useMemo(() => {
    if (owned) {
      const match = owned.find(a => a.i === Number(id));
      if (match) {
        if (forceBaseName) return match.baseName;
        return match.customName || match.baseName;
      }
    }
    return initialName || '';
  }, [ owned, id, initialName, forceBaseName ])

  return <Link to={`/asteroids/${id}`}>{name || `#${id}`}</Link>;
};

export default AsteroidLink;
