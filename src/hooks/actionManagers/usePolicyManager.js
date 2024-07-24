import { useCallback, useContext, useMemo } from 'react';
import { Address, Entity, Permission } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';
import { daysToSeconds, monthsToSeconds, safeBigInt, secondsToDays, secondsToMonths } from '~/lib/utils';

const usePolicyManager = (target, permission) => {
  const { crew } = useCrewContext();
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const payload = useMemo(() => ({
    target: { id: target?.id, label: target?.label },
    permission,
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW },
  }), [crew?.id, target, permission]);

  const meta = useMemo(() => ({
    asteroidId: target?.label === Entity.IDS.ASTEROID ? target?.id : undefined,
    lotId: (target?.Location?.locations || []).find((l) => l?.label === Entity.IDS.LOT)?.id,
    shipId: target?.label === Entity.IDS.SHIP ? target?.id : undefined,
  }), [target]);

  const currentPolicy = useMemo(() => {
    if (!target) return undefined;
    const pol = Permission.getPolicyDetails(target, crew)[permission];

    if (pol?.policyDetails && pol.policyType === Permission.POLICY_IDS.CONTRACT) pol.policyDetails.contract = pol.policyDetails.address;
    if (pol?.policyDetails && pol.policyType === Permission.POLICY_IDS.PREPAID) {
      // stored in microsway per hour, UI in sway/mo
      pol.policyDetails.rate = Number(safeBigInt(pol.policyDetails.rate)) / 1e6;
      // stored in seconds, UI in months
      pol.policyDetails.initialTerm = secondsToDays(pol.policyDetails.initialTerm);
      // stored in seconds, UI in months
      pol.policyDetails.noticePeriod = secondsToDays(pol.policyDetails.noticePeriod);
    };

    return pol;
  }, [crew, target, permission]);

  const updateAllowlists = useCallback((newAllowlist, newAccountAllowlist) => {
    execute(
      'UpdateAllowlists',
      {
        additions: (newAllowlist || []).filter((a) => !(currentPolicy?.allowlist || []).find((b) => a.id === b.id)),
        removals: (currentPolicy?.allowlist || []).filter((a) => !newAllowlist.find((b) => a.id === b.id)),
        accountAdditions: (newAccountAllowlist || []).filter((a) => !(currentPolicy?.accountAllowlist || []).find((b) => Address.areEqual(a, b))),
        accountRemovals: (currentPolicy?.accountAllowlist || []).filter((a) => !newAccountAllowlist.find((b) => Address.areEqual(a, b))),
        ...payload
      },
      meta
    );
  }, [currentPolicy?.allowlist, currentPolicy?.accountAllowlist, meta, payload]);

  const updatePolicy = useCallback(
    (newPolicyType, newPolicyDetails) => {
      const params = {
        ...payload,
        // for prepaid...
        rate: Math.floor(newPolicyDetails.rate * 1e6), // sway/mo --> msway/hr
        initial_term: daysToSeconds(newPolicyDetails.initialTerm),
        notice_period: daysToSeconds(newPolicyDetails.noticePeriod),
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
    () => (getStatus ? getStatus('updateAllowlists', { ...payload }) : 'ready') === 'pending',
    [payload, getStatus]
  );
  const policyChangePending = useMemo(
    () => (getStatus ? getStatus('UpdatePolicy', { ...payload }) : 'ready') === 'pending',
    [payload, getStatus]
  );

  return {
    currentPolicy,
    updateAllowlists,
    updatePolicy,

    allowlistChangePending,
    policyChangePending
  };
};

export default usePolicyManager;
