import { useMemo } from 'react';
import { Lot } from '@influenceth/sdk';

import { useLotLink } from '~/components/LotLink';
import { useShipLink } from '~/components/ShipLink';
import useAsteroid from '~/hooks/useAsteroid';
import useBuilding from '~/hooks/useBuilding';
import useShip from '~/hooks/useShip';

const useHydratedLocation = (location, escapeModuleCrewId) => {
  const onLotLink = useLotLink(location);
  const onShipLink = useShipLink((location?.shipId || escapeModuleCrewId) ? { crewId: escapeModuleCrewId, shipId: location?.shipId, zoomToShip: true } : {});

  const { data: asteroid } = useAsteroid(location?.asteroidId);
  const { data: building } = useBuilding(location?.buildingId);
  const { data: ship } = useShip(location?.shipId);

  return useMemo(() => {
    return {
      asteroid,
      building,
      lotId: location?.lotId,
      lotIndex: Lot.toIndex(location?.lotId),
      ship,
      onLink: (location?.lotId ? onLotLink : onShipLink) || (() => {})
    };
  }, [asteroid, building, location?.lotId, ship, onShipLink, onLotLink]);
};

export default useHydratedLocation;
