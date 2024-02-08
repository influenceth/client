import { useCallback, useContext, useMemo } from 'react';
import { Entity, Permission } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';

const usePolicyManager = (entity, permission) => {
  const { crew } = useCrewContext();
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const payload = useMemo(() => ({
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW },
    entity: { id: entity?.id, label: entity?.label },
    permission
  }), [crew?.id, entity, permission]);

  const meta = useMemo(() => ({
    lotId: entity?.Location?.locations?.find((l) => l.label === Entity.IDS.LOT)?.id,
    shipId: entity?.label === Entity.IDS.SHIP ? entity?.id : undefined,
  }), [entity]);

  const currentPolicy = useMemo(() => {
    const pol = Permission.getPolicyDetails(entity, crew?.id)[permission];
    if (pol?.policyDetails && pol.policyType === Permission.POLICY_IDS.CONTRACT) pol.policyDetails.contract = pol.policyDetails.address;
    if (pol?.policyDetails?.rate && pol.policyType === Permission.POLICY_IDS.PREPAID) pol.policyDetails.rate = pol.policyDetails.rate / 1e6;
    return pol;
  }, [crew?.id, entity, permission]);

  const updateAllowlist = useCallback((newAllowlist) => {
    execute(
      'UpdateAllowlist',
      {
        additions: (newAllowlist || []).filter((a) => !(currentPolicy?.allowlist || []).find((b) => a.id === b.id)),
        removals: (currentPolicy?.allowlist || []).filter((a) => !newAllowlist.find((b) => a.id === b.id)),
        ...payload
      },
      meta
    );
  }, [currentPolicy?.allowlist, meta, payload]);

  const updatePolicy = useCallback(
    (newPolicyType, newPolicyDetails) => {
      const params = {
        ...payload,
        // for prepaid...
        rate: newPolicyDetails.rate * 1e6,
        initial_term: newPolicyDetails.initialTerm,
        notice_period: newPolicyDetails.noticePeriod,
        // for contract...
        contract: newPolicyDetails.contract,
      };

      const currentPolicyConfig = Permission.POLICY_TYPES[currentPolicy?.policyType];
      if (currentPolicyConfig?.removalSystem) {
        params.remove = currentPolicyConfig?.removalSystem;
      }
      const newPolicyConfig = Permission.POLICY_TYPES[newPolicyType];
      if (newPolicyConfig?.additionSystem) {
        params.add = newPolicyConfig?.additionSystem;
      }

      execute('UpdatePolicy', params, meta);
    },
    [currentPolicy, meta, payload]
  );

  const allowlistChangePending = useMemo(
    () => (getStatus ? getStatus('UpdateAllowlist', { ...payload }) : 'ready') === 'pending',
    [payload, getStatus]
  );
  const policyChangePending = useMemo(
    () => (getStatus ? getStatus('UpdatePolicy', { ...payload }) : 'ready') === 'pending',
    [payload, getStatus]
  );

  return {
    currentPolicy,
    updateAllowlist,
    updatePolicy,

    allowlistChangePending,
    policyChangePending
  };
};

export default usePolicyManager;
