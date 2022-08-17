import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';

const AsteroidLink = (props) => {
  const { id, name: initialName } = props;
  const { data: owned } = useOwnedAsteroids();

  const name = useMemo(() => {
    if (owned) {
      const match = owned.find(a => a.i === Number(id));
      if (match) {
        if (props.forceBaseName) return match.baseName;
        return match.customName || match.baseName;
      }
    }
    return initialName || '';
  }, [ owned, id, initialName ])

  return <Link to={`/asteroids/${id}`}>{name || `#${id}`}</Link>;
};

export default AsteroidLink;
