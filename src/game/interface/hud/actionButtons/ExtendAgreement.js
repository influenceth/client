import { useCallback, useMemo } from '~/lib/react-debug';

import { ExtendAgreementIcon } from '~/components/Icons';
import ActionButton from './ActionButton';
import useStore from '~/hooks/useStore';
import useAgreementManager from '~/hooks/actionManagers/useAgreementManager';
import useSimulationEnabled from '~/hooks/useSimulationEnabled';

const isVisible = () => false;

const ExtendAgreement = ({ entity, permission, onSetAction, _disabled }) => {
  const { pendingChange, currentAgreement } = useAgreementManager(entity, permission);
  const simulationEnabled = useSimulationEnabled();
  
  const handleClick = useCallback(import.meta.url, () => {
    onSetAction('EXTEND_AGREEMENT', { entity, permission });
  }, [entity, permission]);

  const disabledReason = useMemo(import.meta.url, () => {
    if (_disabled) return 'loading...';
    if (pendingChange) return 'updating...';
    if (currentAgreement?.noticeTime > 0) return 'notice given';
    if (simulationEnabled) return 'simulation restricted';
    return '';
  }, [_disabled, pendingChange, currentAgreement, simulationEnabled]);

  // only flash green if no controller... button is always present if you own and
  // do not currently have control (hopefully that is less distracting when admin'ed
  // by a different one of your crews)
  return (
    <ActionButton
      label="Extend Agreement"
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason,
        loading: pendingChange
      }}
      icon={<ExtendAgreementIcon />}
      onClick={handleClick} />
  );
};

export default { Component: ExtendAgreement, isVisible };