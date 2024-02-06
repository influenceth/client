import { useCallback, useContext, useMemo } from 'react';
import { Entity, Permission } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';

// TODO: move to sdk
const POLICY_TYPES = [
  {
    key: 'contract',
    policyKey: 'ContractPolicies',
    agreementKey: 'ContractAgreements',
    additionSystem: 'AssignContractPolicy',
    removalSystem: 'RemoveContractPolicy'
  },
  {
    key: 'prepaid',
    policyKey: 'PrepaidPolicies',
    agreementKey: 'PrepaidAgreements',
    additionSystem: 'AssignPrepaidPolicy',
    removalSystem: 'RemovePrepaidPolicy'
  },
  {
    key: 'public',
    policyKey: 'PublicPolicies',
    additionSystem: 'AssignPublicPolicy',
    removalSystem: 'RemovePublicPolicy'
  },
];

// TODO: move to sdk
export const getEntityPolicies = (entity) => {

  // get the applicable policies for this entity, default policytype to private for each
  const policies = Object.keys(Permission.TYPES)
    .filter((id) => {
      const t = Permission.TYPES[id];
      if (t.label && entity.label !== t.label) return false;
      if (t.component && (Array.isArray(entity[t.component]) ? !entity[t.component]?.length : !entity[t.component])) return false;
      if (t.buildingType && !entity?.Building?.buildingType !== t.buildingType) return false;
      return true;
    })
    .reduce((acc, permId) => ({
      ...acc,
      [permId]: {
        policyType: 'private',
        policyDetails: {},
        allowlist: [],
      }
    }), {});

  // find the active policy type for each (and related agreements)
  /* TODO: Permission.*/POLICY_TYPES.forEach(({ key, policyKey, agreementKey }) => {
    (entity[policyKey] || []).forEach(({ permission, ...policyDetails }) => {
      policies[permission].policyType = key;
      policies[permission].policyDetails = policyDetails;
      if (agreementKey) {
        policies[permission].agreements = (entity[agreementKey] || []).filter((a) => a.permission === permission);
      }
    });
  });

  // attach allowlist
  (entity.WhitelistAgreements || []).forEach(({ permission, permitted }) => {
    if (policies[permission]) policies[permission].allowlist.push(permitted);
  });

  return policies;
};

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
    const pol = /* TODO: Permission.*/getEntityPolicies(entity)[permission];
    if (pol?.policyDetails && pol.policyType === 'contract') pol.policyDetails.contract = pol.policyDetails.address;
    if (pol?.policyDetails?.rate && pol.policyType === 'prepaid') pol.policyDetails.rate = pol.policyDetails.rate / 1e6;
    return pol;
  }, [entity, permission]);

  const updateAllowlist = useCallback((newAllowlist) => {
    console.log(
      'UpdateAllowlist',
      {
        additions: (newAllowlist || []).filter((a) => !(currentPolicy?.allowlist || []).find((b) => a.id === b.id)),
        removals: (currentPolicy?.allowlist || []).filter((a) => !newAllowlist.find((b) => a.id === b.id)),
        ...payload
      },
      meta
    );
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

      const currentPolicyConfig = /* TODO: Permission. */POLICY_TYPES.find(({ key }) => key === currentPolicy?.policyType);
      if (currentPolicyConfig?.removalSystem) {
        params.remove = currentPolicyConfig?.removalSystem;
      }
      const newPolicyConfig = /* TODO: Permission. */POLICY_TYPES.find(({ key }) => key === newPolicyType);
      if (newPolicyConfig?.additionSystem) {
        params.add = newPolicyConfig?.additionSystem;
      }

      console.log('UpdatePolicy', params, meta);
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
