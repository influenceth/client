import { useCallback, useContext, useMemo } from 'react';
import { Entity, Permission } from '@influenceth/sdk';
import { cloneDeep } from 'lodash';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import usePolicyManager from '~/hooks/actionManagers/usePolicyManager';
import useCrewContext from '~/hooks/useCrewContext';
import { monthsToSeconds, secondsToMonths } from '~/lib/utils';

const hoursPerMonth = monthsToSeconds(1) / 3600;

const useAgreementManager = (entity, permission) => {
  const { crew } = useCrewContext();
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { currentPolicy } = usePolicyManager(entity, permission);

  const currentAgreement = useMemo(() => {
    const agreement = (currentPolicy?.agreements || []).find((a) => a.permitted?.id === crew?.id && a.permission === Number(permission));
    if (agreement) {
      const agg = cloneDeep(agreement);
      if (agg?.rate) agg.rate = (agg.rate / 1e6) * hoursPerMonth;  // stored in microsway per hour, UI in sway/mo
      if (agg?.initialTerm) agg.initialTerm = secondsToMonths(agg.initialTerm); // stored in seconds, UI in months
      if (agg?.noticePeriod) agg.noticePeriod = secondsToMonths(agg.noticePeriod); // stored in seconds, UI in months
      return agg;
    }
    return null;
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

  const extendAgreement = useCallback((details = {}) => {
    const { term, ...params } = details;
    execute(
      'ExtendPrepaidAgreement',
      { ...payload, added_term: term, ...params },
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
    currentPolicy,
    
    enterAgreement,
    extendAgreement,
    cancelAgreement,

    changePending
  };
};

export default useAgreementManager;