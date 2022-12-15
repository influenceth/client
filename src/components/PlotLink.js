import { useCallback, useEffect, useMemo, useState } from 'react';

import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import useStore from '~/hooks/useStore';
import OnClickLink from './OnClickLink';

const PlotLink = (props) => {
  const { asteroidId, plotId } = props;
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const dispatchPlotSelected = useStore(s => s.dispatchPlotSelected);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const origin = useStore(s => s.asteroids.origin);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const { data: owned } = useOwnedAsteroids();

  const [destination, setDestination] = useState();

  const asteroidName = useMemo(() => {
    if (owned) {
      const match = owned.find(a => a.i === Number(asteroidId));
      if (match) {
        return match.customName || match.baseName;
      }
    }
    return null;
  }, [ owned, asteroidId ])

  const onClick = useCallback(() => {
    if (asteroidId === origin) {
      dispatchPlotSelected(asteroidId, plotId);
    } else {
      dispatchOriginSelected(asteroidId);
      if (zoomStatus === 'out') updateZoomStatus('zooming-in');
      setDestination(plotId);
    }
  }, [asteroidId, plotId, zoomStatus]);

  useEffect(() => {
    if (destination && zoomStatus === 'zooming-in') {
      dispatchPlotSelected(asteroidId, plotId);
      setDestination();
    }
  }, [asteroidId, destination, plotId, zoomStatus]);

  return <OnClickLink onClick={onClick}>{asteroidName || `Asteroid #${asteroidId}`}, Lot {plotId}</OnClickLink>;
};

export default PlotLink;
