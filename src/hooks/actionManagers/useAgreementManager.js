import { useCallback, useContext, useMemo } from 'react';
import { Entity, Permission } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import usePolicyManager from '~/hooks/actionManagers/usePolicyManager';
import useCrewContext from '~/hooks/useCrewContext';

const useAgreementManager = (entity, permission) => {
  const { crew } = useCrewContext();
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { currentPolicy } = usePolicyManager(entity, permission);

  const currentAgreement = useMemo(() => {
    return (currentPolicy?.agreements || [])
      .find((a) => a.permitted?.id === crew?.id && a.permission === permission);
  }, [crew?.id, currentPolicy, permission]);

  const payload = useMemo(() => ({
    target: { id: entity?.id, label: entity?.label },
    permission,
    permitted: { id: crew?.id, label: Entity.IDS.CREW },
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW },
  }), [crew?.id, entity, permission]);

  const meta = useMemo(() => ({
    lotId: entity?.Location?.locations?.find((l) => l.label === Entity.IDS.LOT)?.id,
    shipId: entity?.label === Entity.IDS.SHIP ? entity?.id : undefined,
  }), [entity]);

  const enterAgreement = useCallback((details = {}) => {
    const agreementSystem = currentPolicy.policyType === Permission.POLICY_IDS.PREPAID
      ? 'AcceptPrepaidAgreement'
      : 'AcceptContractAgreement';
    // TODO: AcceptPrepaidMerkleAgreement (needs `term` and `merkle_proof`)
    execute(
      agreementSystem,
      { ...payload, ...details },
      meta
    );
  }, [currentPolicy, meta, payload]);

  const extendAgreement = useCallback((addedTerm) => {
    execute(
      'ExtendPrepaidAgreement',
      { ...payload, added_term: addedTerm },
      meta
    );
  }, []);

  const cancelAgreement = useCallback(() => {
    execute(
      'CancelPrepaidAgreement',
      { ...payload },
      meta
    );
  }, []);

  const changePending = useMemo(
    () => {
      if (getStatus) {
        return getStatus('AcceptPrepaidAgreement', { ...payload }) === 'pending'
          || getStatus('AcceptContractAgreement', { ...payload }) === 'pending'
          || getStatus('AcceptPrepaidMerkleAgreement', { ...payload }) === 'pending'
          || getStatus('ExtendPrepaidAgreement', { ...payload }) === 'pending'
          || getStatus('CancelPrepaidAgreement', { ...payload }) === 'pending'
      }
    },
    [payload, getStatus]
  );

  return {
    currentAgreement,
    enterAgreement,
    extendAgreement,
    cancelAgreement,

    changePending
  };
};

export default useAgreementManager;
