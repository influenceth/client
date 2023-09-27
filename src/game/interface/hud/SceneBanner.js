import { useMemo } from 'react';

import useStore from '~/hooks/useStore';
import SearchAsteroidsBanner from './hudBanners/SearchAsteroidsBanner';
import SearchLotsBanner from './hudBanners/SearchLotsBanner';
import TravelBanner from './hudBanners/TravelBanner';

const SceneBanner = () => {
  const origin = useStore(s => s.asteroids.origin);
  const destination = useStore(s => s.asteroids.destination);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomScene = useStore(s => s.asteroids.zoomScene);
  const assetSearch = useStore(s => s.assetSearch);
  const openHudMenu = useStore(s => s.openHudMenu);
  const isAssetSearchMatchingDefault = useStore(s => s.isAssetSearchMatchingDefault);
  
  const { searchAsteroids, searchLots, travel } = useMemo(() => ({
    searchAsteroids: {
      enabled: zoomStatus === 'out',
      visible: openHudMenu === 'BELT_MAP_SEARCH' || !isAssetSearchMatchingDefault('asteroidsMapped')
    },
    searchLots: {
      enabled: zoomStatus === 'in' && !zoomScene,
      visible: openHudMenu === 'ASTEROID_MAP_SEARCH' || !isAssetSearchMatchingDefault('lotsMapped')
    },
    travel: {
      enabled: zoomStatus === 'out',
      visible: origin && destination && origin !== destination
    }
  }), [assetSearch, destination, openHudMenu, origin, zoomStatus, zoomScene]);

  return (
    <>
      {travel.enabled && <TravelBanner visible={travel.visible} />}
      {searchAsteroids.enabled && <SearchAsteroidsBanner visible={searchAsteroids.visible && !travel.visible} />}
      {searchLots.enabled && <SearchLotsBanner visible={searchLots.visible} />}
    </>
  );
};

export default SceneBanner;