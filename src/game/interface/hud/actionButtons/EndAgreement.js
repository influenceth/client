import { useCallback, useMemo } from 'react';

import { GiveNoticeIcon } from '~/components/Icons';
import useAgreementManager from '~/hooks/actionManagers/useAgreementManager';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';
import useBlockTime from '~/hooks/useBlockTime';
import { formatTimer } from '~/lib/utils';

const isVisible = () => false;

const EndAgreement = ({ entity, permission, agreementPath, _disabled }) => {
  const { changePending, currentAgreement } = useAgreementManager(entity, permission, agreementPath);
  const blockTime = useBlockTime();
  
  const onSetAction = useStore(s => s.dispatchActionDialog);

  const handleClick = useCallback(() => {
    onSetAction('END_AGREEMENT', { entity, permission, agreementPath });
  }, [entity, permission]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (changePending) return 'updating...';
    if (currentAgreement?.noticeTime > 0) return 'notice already given';
    if (currentAgreement?._canGiveNoticeStart > blockTime) return `allowed in ${formatTimer(currentAgreement._canGiveNoticeStart - blockTime, 1)}`;
    return '';
  }, [_disabled, changePending, currentAgreement]);

  return (
    <ActionButton
      label="End Agreement"
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason,
        loading: changePending
      }}
      icon={<GiveNoticeIcon />}
      onClick={handleClick} />
  );
};

export default { Component: EndAgreement, isVisible };