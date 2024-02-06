import { useCallback, useMemo } from 'react';

import { KeysIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import useControlAsteroid from '~/hooks/actionManagers/useControlAsteroid';
import ActionButton from './ActionButton';

const isVisible = () => false;

const ViewAgreements = ({ asteroid, tally, onSetAction, _disabled }) => {
  const handleClick = useCallback(() => {
    // onSetAction('CONTROL_ASTEROID');
  }, []);

  return (
    <ActionButton
      label="View Agreements"
      flags={{
        badge: tally,
        disabled: _disabled
      }}
      icon={<KeysIcon />}
      onClick={handleClick} />
  );
};

export default { Component: ViewAgreements, isVisible };