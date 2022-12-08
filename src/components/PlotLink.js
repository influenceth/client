import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';

const PlotLink = (props) => {
  const { asteroidId, plotId } = props;
  const { data: owned } = useOwnedAsteroids();

  const asteroidName = useMemo(() => {
    if (owned) {
      const match = owned.find(a => a.i === Number(asteroidId));
      if (match) {
        return match.customName || match.baseName;
      }
    }
    return null;
  }, [ owned, asteroidId ])

  return <span>{asteroidName || `Asteroid #${asteroidId}`}, Lot {plotId}</span>;
};

export default PlotLink;
