import { useCallback, useMemo } from 'react';

import { KeysIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import useControlAsteroid from '~/hooks/actionManagers/useControlAsteroid';
import ActionButton from './ActionButton';

const isVisible = () => false;

const ExtendAgreement = ({ asteroid, onSetAction, _disabled }) => {
  const { takingControl } = useControlAsteroid(asteroid?.id);

  const handleClick = useCallback(() => {
    onSetAction('CONTROL_ASTEROID');
  }, [asteroid?.id]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (takingControl) return 'updating...';
    return '';
  }, [_disabled, takingControl]);

  // only flash green if no controller... button is always present if you own and
  // do not currently have control (hopefully that is less distracting when admin'ed
  // by a different one of your crews)
  return (
    <ActionButton
      label="Become Administrator"
      labelAddendum={disabledReason}
      flags={{
        attention: (!asteroid?.Control?.controller && !disabledReason),
        disabled: _disabled || disabledReason,
        loading: takingControl
      }}
      icon={<KeysIcon />}
      onClick={handleClick} />
  );
};

export default { Component: ExtendAgreement, isVisible };