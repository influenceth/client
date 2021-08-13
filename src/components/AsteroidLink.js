import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';

const AsteroidLink = (props) => {
  const { id } = props;
  const { data: owned } = useOwnedAsteroids();
  const [ name, setName ] = useState(`#${id}`);

  useEffect(() => {
    if (owned) {
      const match = owned.find(a => a.i === Number(id));
      if (match) setName(match.customName || match.baseName);
    }
  }, [ owned, id ]);

  return <Link to={`/asteroids/${id}`}>{name}</Link>;
};

export default AsteroidLink;
