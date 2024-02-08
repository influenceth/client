import { useCallback, useMemo } from 'react';

import { FormAgreementIcon } from '~/components/Icons';
import useAgreementManager from '~/hooks/actionManagers/useAgreementManager';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';

const isVisible = () => false;

const FormAgreement = ({ entity, permission, _disabled }) => {
  const { changePending } = useAgreementManager(entity, permission);
  
  const onSetAction = useStore(s => s.dispatchActionDialog);

  const handleClick = useCallback(() => {
    onSetAction('FORM_AGREEMENT', { entity, permission});
  }, [entity, permission]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (changePending) return 'updating...';
    return '';
  }, [_disabled, changePending]);

  return (
    <ActionButton
      label="Form Agreement"
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason,
        loading: changePending
      }}
      icon={<FormAgreementIcon />}
      onClick={handleClick} />
  );
};

export default { Component: FormAgreement, isVisible };