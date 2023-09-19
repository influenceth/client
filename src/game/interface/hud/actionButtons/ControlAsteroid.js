import { useCallback } from 'react';

import { KeysIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import useControlAsteroid from '~/hooks/useControlAsteroid';
import ActionButton from './ActionButton';

const ControlAsteroid = ({ asteroid, onSetAction, _disabled }) => {
  const { takingControl } = useControlAsteroid(asteroid?.id);

  const handleClick = useCallback(() => {
    onSetAction('CONTROL_ASTEROID');
  }, [asteroid?.id]);

  // only flash green if no controller... button is always present if you own and
  // do not currently have control (hopefully that is less distracting when admin'ed
  // by a different one of your crews)
  return (
    <ActionButton
      label="Become Administrator"
      flags={{
        attention: (!asteroid?.Control?.controller && !takingControl) || undefined,
        disabled: _disabled || takingControl || undefined,
        loading: takingControl || undefined
      }}
      icon={<KeysIcon />}
      onClick={handleClick} />
  );
};

export default ControlAsteroid;