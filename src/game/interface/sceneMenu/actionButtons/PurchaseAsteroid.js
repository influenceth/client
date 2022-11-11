import { useCallback } from 'react';

import { PurchaseAsteroidIcon } from '~/components/Icons';
import useBuyAsteroid from '~/hooks/useBuyAsteroid';
import useCreateReferral from '~/hooks/useCreateReferral';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const PurchaseAsteroid = ({ asteroid }) => {
  const createReferral = useCreateReferral(Number(asteroid.i));
  const { buyAsteroid, buying } = useBuyAsteroid(Number(asteroid.i));
  const saleIsActive = useStore(s => s.sale);

  const handleClick = useCallback(() => {
    if (!saleIsActive || buying) return;
    buyAsteroid();
    createReferral.mutate();
  }, [asteroid?.i, saleIsActive]);

  return (
    <ActionButton
      label={saleIsActive ? 'Purchase Asteroid' : 'Asteroid can be purchased once next sale begins.'}
      flags={{
        disabled: !saleIsActive || buying,
        loading: buying
      }}
      icon={<PurchaseAsteroidIcon />}
      onClick={handleClick} />
  );
};

export default PurchaseAsteroid;