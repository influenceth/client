import { useCallback, useContext, useMemo } from 'react';
import { Entity, Permission } from '@influenceth/sdk';
import { cloneDeep } from 'lodash';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import usePolicyManager from '~/hooks/actionManagers/usePolicyManager';
import useCrewContext from '~/hooks/useCrewContext';
import { monthsToSeconds, secondsToMonths } from '~/lib/utils';

const hoursPerMonth = monthsToSeconds(1) / 3600;

export const getAgreementPath = (target, permission, permitted) => {
  return `${target ? Entity.packEntity(target) : ''}.${permission || ''}.${permitted ? Entity.packEntity(permitted) : ''}`;
}

const useAgreementManager = (target, permission, agreementPath) => {
  const { crew } = useCrewContext();
  const { execute, getPendingTx } = useContext(ChainTransactionContext);
  const { currentPolicy } = usePolicyManager(target, permission);

  const currentAgreement = useMemo(() => {
    const agreement = (currentPolicy?.agreements || []).find((a) => {
      if (agreementPath) return getAgreementPath(target, permission, a.permitted) === agreementPath;
      return a.permitted?.id === crew?.id && a.permission === Number(permission)
    });

    if (agreement) {
      const agg = cloneDeep(agreement);
      if (agg?.rate) {
        agg.rate_swayPerSec = agg.rate / 1e6 / 3600; // (need this precision to avoid rounding issues)
        agg.rate = agg.rate / 1e6 * hoursPerMonth;  // stored in microsway per hour, UI in sway/mo
      }
      if (agg?.initialTerm) agg.initialTerm = secondsToMonths(agg.initialTerm); // stored in seconds, UI in months
      if (agg?.noticePeriod) agg.noticePeriod = secondsToMonths(agg.noticePeriod); // stored in seconds, UI in months
      agg._canGiveNoticeStart = agg.startTime + monthsToSeconds(agg.initialTerm - agg.noticePeriod);
      return agg;
    }
    return null;
  }, [agreementPath, crew?.id, currentPolicy, target, permission]);

  const payload = useMemo(() => ({
    target: { id: target?.id, label: target?.label },
    permission,
    permitted: { id: currentAgreement?.permitted?.id || crew?.id, label: Entity.IDS.CREW },
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW },
  }), [crew?.id, currentAgreement, target, permission]);

  const meta = useMemo(() => ({
    lotId: target?.Location?.locations?.find((l) => l.label === Entity.IDS.LOT)?.id,
    shipId: target?.label === Entity.IDS.SHIP ? target?.id : undefined,
  }), [target]);

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

  const cancelAgreement = useCallback((params = {}) => {
    execute(
      'CancelPrepaidAgreement',
      { agreementPath, ...params, ...payload },
      meta
    );
  }, [agreementPath]);

  const pendingChange = useMemo(
    () => {
      if (getPendingTx) {
        return getPendingTx('AcceptPrepaidAgreement', { ...payload })
          || getPendingTx('AcceptContractAgreement', { ...payload })
          || getPendingTx('AcceptPrepaidMerkleAgreement', { ...payload })
          || getPendingTx('ExtendPrepaidAgreement', { ...payload })
          || getPendingTx('CancelPrepaidAgreement', { ...payload })
      }
      return null;
    },
    [payload, getPendingTx]
  );

  return {
    currentAgreement,
    currentPolicy,

    enterAgreement,
    extendAgreement,
    cancelAgreement,

    pendingChange
  };
};

export default useAgreementManager;
