import { useCallback, useMemo } from 'react';
import { Address } from '@influenceth/sdk';

import { BecomeAdminIcon } from '~/components/Icons';
import useControlShip from '~/hooks/actionManagers/useControlShip';
import ActionButton from './ActionButton';

const isVisible = ({ account, ship, crew }) => {
  return crew && ship
    && Address.areEqual(ship.Nft?.owner, account)
    && crew?.id && ship.Control?.controller?.id !== crew?.id;
};

const ControlShip = ({ ship, onSetAction, _disabled }) => {
  const { takingControl } = useControlShip(ship?.id);

  const handleClick = useCallback(() => {
    onSetAction('CONTROL_SHIP', { shipId: ship?.id });
  }, [ship?.id]);

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
      label="Administer Ship"
      labelAddendum={disabledReason}
      flags={{
        attention: (!ship?.Control?.controller && !disabledReason),
        disabled: _disabled || disabledReason,
        loading: takingControl
      }}
      icon={<BecomeAdminIcon />}
      onClick={handleClick} />
  );
};

export default { Component: ControlShip, isVisible };