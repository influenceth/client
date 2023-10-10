import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { Entity } from '@influenceth/sdk';

import { PurchaseAsteroidIcon } from '~/components/Icons';
import useBuyAsteroid from '~/hooks/useBuyAsteroid';
import ActionButton from './ActionButton';
import useSale from '~/hooks/useSale';
import { nativeBool, reactBool } from '~/lib/utils';

const PurchaseAsteroid = ({ asteroid, _disabled }) => {
  const history = useHistory();
  const { buying } = useBuyAsteroid(Number(asteroid?.i));
  const saleIsActive = useSale(Entity.IDS.ASTEROID);

  const handleClick = useCallback(() => {
    history.push(`/asteroids/${asteroid?.i}`);
  }, [asteroid?.i]);

  return (
    <ActionButton
      label={`Purchase Asteroid${saleIsActive ? '' : ' (sale is currently closed)'}`}
      flags={{
        disabled: nativeBool(_disabled || !saleIsActive || buying),
        loading: reactBool(buying)
      }}
      icon={<PurchaseAsteroidIcon />}
      onClick={handleClick} />
  );
};

export default PurchaseAsteroid;
