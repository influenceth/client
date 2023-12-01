import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { Entity } from '@influenceth/sdk';

import { PurchaseAsteroidIcon } from '~/components/Icons';
import useBuyAsteroid from '~/hooks/actionManagers/useBuyAsteroid';
import ActionButton from './ActionButton';
import useSale from '~/hooks/useSale';

const PurchaseAsteroid = ({ asteroid, _disabled }) => {
  const history = useHistory();
  const { buying } = useBuyAsteroid(Number(asteroid?.id));
  const saleIsActive = useSale(Entity.IDS.ASTEROID);

  const handleClick = useCallback(() => {
    history.push(`/asteroids/${asteroid?.id}`);
  }, [asteroid?.id]);

  return (
    <ActionButton
      label={`Purchase Asteroid`}
      labelAddendum={saleIsActive ? null : 'sale is currently closed'}
      flags={{
        disabled: _disabled || !saleIsActive || buying,
        loading: buying
      }}
      icon={<PurchaseAsteroidIcon />}
      onClick={handleClick} />
  );
};

export default PurchaseAsteroid;
