import { useCallback, useMemo } from 'react';

import { FormAgreementIcon } from '~/components/Icons';
import useAgreementManager from '~/hooks/actionManagers/useAgreementManager';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';
import { Entity, Permission } from '@influenceth/sdk';

const isVisible = ({ lot, crew }) => {
  if (!lot) return false;
  else {
    const policy = Permission.getPolicyDetails(lot, crew?.id)[Permission.IDS.USE_LOT];
    return lot && policy.crewStatus === 'available'
  }
};

const FormLotLeaseAgreement = ({ lot, entity, permission, _disabled }) => {
  const { pendingChange } = useAgreementManager(lot, permission);
  
  const onSetAction = useStore(s => s.dispatchActionDialog);

  const handleClick = useCallback(() => {
    onSetAction('FORM_AGREEMENT', { entity: lot, permission: Permission.IDS.USE_LOT });
  }, [entity, permission]);

  const disabledReason = useMemo(() => {
    // if (_disabled) return 'loading...';
    if (pendingChange) return 'updating...';
    return '';
  }, [_disabled, pendingChange]);

  return (
    <ActionButton
      label="Form Lot Agreement"
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason,
        loading: pendingChange
      }}
      icon={<FormAgreementIcon />}
      onClick={handleClick} />
  );
};

export default { Component: FormLotLeaseAgreement, isVisible };