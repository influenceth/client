import { useCallback, useMemo } from 'react';

import { KeysIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import useControlAsteroid from '~/hooks/actionManagers/useControlAsteroid';
import ActionButton from './ActionButton';

const isVisible = () => false;

const ViewAgreements = ({ asteroid, tally, onSetAction, _disabled }) => {
  const { takingControl } = useControlAsteroid(asteroid?.id);

  const handleClick = useCallback(() => {
    onSetAction('CONTROL_ASTEROID');
  }, [asteroid?.id]);

  return (
    <ActionButton
      label="View Agreements"
      flags={{
        badge: tally
      }}
      icon={<KeysIcon />}
      onClick={handleClick} />
  );
};

export default { Component: ViewAgreements, isVisible };