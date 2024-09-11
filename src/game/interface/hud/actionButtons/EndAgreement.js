import { useCallback, useMemo } from '~/lib/react-debug';

import { CancelAgreementIcon, GiveNoticeIcon } from '~/components/Icons';
import useAgreementManager from '~/hooks/actionManagers/useAgreementManager';
import useStore from '~/hooks/useStore';
import ActionButton from './ActionButton';
import { formatTimer } from '~/lib/utils';
import useSimulationEnabled from '~/hooks/useSimulationEnabled';

const isVisible = () => false;

const EndAgreement = ({ blockTime, entity, permission, agreementPath, _disabled }) => {
  const { pendingChange, currentAgreement } = useAgreementManager(entity, permission, agreementPath);
  const simulationEnabled = useSimulationEnabled();
  
  const onSetAction = useStore(s => s.dispatchActionDialog);

  const handleClick = useCallback(import.meta.url, () => {
    onSetAction('END_AGREEMENT', { entity, permission, agreementPath });
  }, [entity, permission]);

  const disabledReason = useMemo(import.meta.url, () => {
    if (_disabled) return 'loading...';
    if (pendingChange) return 'updating...';
    if (currentAgreement?.noticeTime > 0) return 'notice already given';
    if (currentAgreement?._canGiveNoticeStart > blockTime) return `allowed in ${formatTimer(currentAgreement._canGiveNoticeStart - blockTime, 1)}`;
    if (simulationEnabled) return 'simulation restricted';
    return '';
  }, [_disabled, blockTime, pendingChange, currentAgreement, simulationEnabled]);

  return (
    <ActionButton
      label={currentAgreement?.noticePeriod > 0 ? "Give Notice" : "End Agreement"}
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason,
        loading: pendingChange
      }}
      icon={currentAgreement?.noticePeriod > 0 ? <GiveNoticeIcon /> : <CancelAgreementIcon />}
      onClick={handleClick} />
  );
};

export default { Component: EndAgreement, isVisible };