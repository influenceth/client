import { useCallback, useMemo } from 'react';

import { ExtendAgreementIcon } from '~/components/Icons';
import ActionButton from './ActionButton';
import useStore from '~/hooks/useStore';
import useAgreementManager from '~/hooks/actionManagers/useAgreementManager';

const isVisible = () => false;

const ExtendAgreement = ({ entity, permission, onSetAction, _disabled }) => {
  const { changePending } = useAgreementManager(entity, permission);
  
  // const onSetAction = useStore(s => s.dispatchActionDialog);

  const handleClick = useCallback(() => {
    onSetAction('EXTEND_AGREEMENT', { entity, permission });
  }, [entity, permission]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (changePending) return 'updating...';
    return '';
  }, [_disabled, changePending]);

  // only flash green if no controller... button is always present if you own and
  // do not currently have control (hopefully that is less distracting when admin'ed
  // by a different one of your crews)
  return (
    <ActionButton
      label="Extend Agreement"
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason,
        loading: changePending
      }}
      icon={<ExtendAgreementIcon />}
      onClick={handleClick} />
  );
};

export default { Component: ExtendAgreement, isVisible };