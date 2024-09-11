import { useEffect } from '~/lib/react-debug';

import useStore from '~/hooks/useStore';
import LotResources from './components/LotResources';
import AsteroidResources from './components/AsteroidResources';

const Resources = (props) => {
  const asteroidId = useStore(s => s.asteroids.origin);
  const lotId = useStore(s => s.asteroids.lot);
  const dispatchResourceMapToggle = useStore(s => s.dispatchResourceMapToggle);

  useEffect(import.meta.url, () => {
    return () => {
      dispatchResourceMapToggle(false);
    };
  }, [])

  if (asteroidId) {
    if (lotId) {
      return <LotResources {...props} />;
    }
    return <AsteroidResources {...props} />;
  }
  return null;
};

export default Resources;
