import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { PurchaseAsteroidIcon } from '~/components/Icons';
import useBuyAsteroid from '~/hooks/useBuyAsteroid';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const PurchaseAsteroid = ({ asteroid, _disabled }) => {
  const history = useHistory();
  const { buying } = useBuyAsteroid(Number(asteroid?.i));
  const saleIsActive = useStore(s => s.sale);

  const handleClick = useCallback(() => {
    history.push(`/asteroids/${asteroid?.i}`);
  }, [asteroid?.i]);

  return (
    <ActionButton
      label={saleIsActive ? 'Purchase Asteroid' : 'Asteroid can be purchased once next sale begins.'}
      flags={{
        disabled: _disabled || !saleIsActive || buying || undefined,
        loading: buying || undefined
      }}
      icon={<PurchaseAsteroidIcon />}
      onClick={handleClick} />
  );
};

export default PurchaseAsteroid;
