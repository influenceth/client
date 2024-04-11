import { useCallback, useMemo } from 'react';

import { Permission } from '@influenceth/sdk';
import { FormAgreementIcon, FormLotAgreementIcon } from '~/components/Icons';
import useAgreementManager from '~/hooks/actionManagers/useAgreementManager';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const isVisible = () => false;

const FormAgreement = ({ entity, permission, _disabled }) => {
  const { pendingChange } = useAgreementManager(entity, permission);
  
  const onSetAction = useStore(s => s.dispatchActionDialog);

  const handleClick = useCallback(() => {
    onSetAction('FORM_AGREEMENT', { entity, permission });
  }, [entity, permission]);

  const disabledReason = useMemo(() => {
    // if (_disabled) return 'loading...';
    if (pendingChange) return 'updating...';
    return '';
  }, [_disabled, pendingChange]);

  return (
    <ActionButton
      label="Form Agreement"
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason,
        loading: pendingChange
      }}
      icon={permission === Permission.IDS.USE_LOT ? <FormLotAgreementIcon /> : <FormAgreementIcon /> }
      onClick={handleClick} />
  );
};

export default { Component: FormAgreement, isVisible };