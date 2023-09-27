import { useMemo } from 'react';

import { useLotLink } from '~/components/LotLink';
import { useShipLink } from '~/components/ShipLink';
import useAsteroid from '~/hooks/useAsteroid';
import useBuilding from '~/hooks/useBuilding';
import useShip from '~/hooks/useShip';

const useHydratedLocation = (location = {}) => {
  const onLotLink = useLotLink(location);
  const onShipLink = useShipLink(location);

  const { data: asteroid } = useAsteroid(location?.asteroidId);
  const { data: building } = useBuilding(location?.buildingId);
  const { data: ship } = useShip(location?.shipId);

  // console.log(`${!!asteroid}, ${!!building}, ${location?.lotId}, ${!!ship}, ${!!onShipLink}, ${!!onLotLink}`);
  return useMemo(() => /*{ console.log('re-memo'); return*/ ({
    asteroid,
    building,
    lotId: location?.lotId,
    ship,
    onLink: (ship && !location?.lotId) ? onShipLink : onLotLink
  }) /*}*/, [asteroid, building, location?.lotId, ship, onShipLink, onLotLink]);
};

export default useHydratedLocation;
