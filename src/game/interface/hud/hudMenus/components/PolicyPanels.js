import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Building, Entity, Permission } from '@influenceth/sdk';

import { CloseIcon, FormAgreementIcon, LotControlIcon, PermissionIcon, RadioCheckedIcon, RadioUncheckedIcon, SwayIcon, WarningIcon } from '~/components/Icons';
import CollapsibleBlock from '~/components/CollapsibleBlock';
import Button from '~/components/ButtonAlt';
import Autocomplete from '~/components/Autocomplete';
import formatters from '~/lib/formatters';
import IconButton from '~/components/IconButton';
import { InputBlock } from '~/components/filters/components';
import { formatFixed, nativeBool, reactBool } from '~/lib/utils';
import UncontrolledTextInput from '~/components/TextInputUncontrolled';
import UncontrolledTextArea from '~/components/TextAreaUncontrolled';
import usePolicyManager from '~/hooks/actionManagers/usePolicyManager';
import EntityName from '~/components/EntityName';
import actionButtons from '../../actionButtons';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import LiveTimer from '~/components/LiveTimer';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import useCrew from '~/hooks/useCrew';
import EntityLink from '~/components/EntityLink';

const borderColor = `rgba(255, 255, 255, 0.15)`;
const DataBlock = styled.div``;
const Desc = styled.div`
  color: ${p => p.theme.colors.main};
  font-size: 90%;
  height: 38px;
`;

const EditBlock = styled.div`
  border-top: 1px solid ${borderColor};
  padding: 10px 0;
`;

const DataRow = styled.div`
  align-items: center;
  color: white;
  display: flex;
  font-size: 90%;
  justify-content: space-between;
  line-height: 1.7em;
  &:not(:first-child) label {
    opacity: 0.5;
  }
`;

const Section = styled.div`
  border-top: 1px solid ${borderColor};
  padding: 10px 0;
`;

const PolicySelector = styled.div`
  & > h3 {
    font-size: 13px;
    margin: 0;
  }
  & > div {
    display: flex;
    flex-direction: row;
    padding: 8px 0 0;
  }
`;

const Policy = styled.div`
  align-items: center;
  display: flex;
  flex: 1;
  flex-direction: row;
  & > svg {
    margin-right: 4px;
  }
  ${p => p.isSelected
    ? `

      & > svg:not(:first-child) {
        display: none;
      }
    `
    : `
      opacity: 0.5;
      & > svg { opacity: 0.3; }
      & > svg:first-child {
        display: none;
      }

      ${p.disabled
        ? `
          &:hover {
            color: ${p.theme.colors.error};
            opacity: 0.8;
          }
        `
        : `
          cursor: ${p.theme.cursors.active};
          &:hover {
            opacity: 0.8;
          }
        `}
    `
  }
`;

const PrepaidInputBlock = styled(InputBlock)`
  & label {
    color: white;
  }
  & > div {
    display: flex;
    flex-direction: row;
    width: 100%;
    & > input {
      width: 110px;
    }
    & > span {
      font-size: 90%;
    }
  }
`;

const Allowlist = styled.div`
  margin-top: 6px;
  max-height: 250px;
  overflow: hidden auto;
`;

const AllowCrew = styled.div`
  align-items: center;
  color: white;
  display: flex;
  font-size: 95%;
  padding: 0 0 0 6px;
  & > label {
    flex: 1;
  }
  & > span { font-size: 90%; opacity: 0.6; }
  & > button { font-size: 14px; margin: 0 0 0 4px; }
`;

const PermSummary = styled.div`
  align-items: center;
  color: ${p => p.success ? p.theme.colors.success : p.theme.colors.main};
  display: flex;
  font-size: 15px;
  padding-bottom: 15px;
  & > svg {
    flex: 0 0 24px;
    font-size: 24px;
    margin-right: 8px;
  }
  & a {
    color: inherit;
  }
`;

const PermSummaryWarning = styled(PermSummary)`
  color: ${p => p.theme.colors.error};
`;

const getPolicyColor = (policyType) => {
  switch (Number(policyType)) {
    case Permission.POLICY_IDS.PRIVATE: return '#7e2b2a';
    case Permission.POLICY_IDS.PUBLIC: return '#336342';
    case Permission.POLICY_IDS.PREPAID: return '#185c5c';
    case Permission.POLICY_IDS.CONTRACT: return '#363d65';
    default: return '#333333';
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case 'controller':
    case 'granted': return '#336342';
    case 'available': return '#363d65';
    case 'restricted': return '#7e2b2a';
    case 'under notice': return '#8c520b';
    case 'controlled':
    case 'under contract': return '#555555';
    default: return '#333333';
  }
}

const PolicyPanel = ({ editable = false, entity, permission }) => {
  const { crew } = useCrewContext();
  const { currentPolicy, updateAllowlist, updatePolicy, allowlistChangePending, policyChangePending } = usePolicyManager(entity, permission);
  const {
    policyType: originalPolicyType,
    policyDetails: originalPolicyDetails,
    allowlist: originalAllowlist,
    agreements = [],  // TODO: ...?
  } = currentPolicy || {};

  const [policyType, setPolicyType] = useState(Number(originalPolicyType));
  const [details, setDetails] = useState(originalPolicyDetails);
  const [allowlist, setAllowlist] = useState(originalAllowlist || []);

  /**
   * Editing
   */
  const [allowlistDirty, setAllowlistDirty] = useState(false);
  const [editing, setEditing] = useState();

  const saving = editing === 'allowlist' ? allowlistChangePending : policyChangePending;

  // reset if object is changed
  useEffect(() => {
    setPolicyType(Number(originalPolicyType));
    setDetails(originalPolicyDetails);
  }, [editing, originalPolicyType, originalPolicyDetails]);

  useEffect(() => {
    setAllowlist(originalAllowlist);
    setAllowlistDirty(false);
  }, [editing, originalAllowlist]);

  const handleChange = useCallback((key) => (e) => {
    let newVal = e.currentTarget.value;
    setDetails((v) => ({ ...v, [key]: newVal }));
  }, []);

  const isDirty = useMemo(() => {
    return policyType !== originalPolicyType
      || Object.keys(details).reduce((acc, k) => acc || details[k] !== originalPolicyDetails[k], false)
      || Object.keys(originalPolicyDetails).reduce((acc, k) => acc || details[k] !== originalPolicyDetails[k], false)
      || allowlistDirty;
  }, [allowlistDirty, policyType, originalPolicyType, originalPolicyDetails, details]);

  const isIncomplete = useMemo(() => {
    if (policyType === Permission.POLICY_IDS.PREPAID) {
      if (!(details.rate >= 0 && details.initialTerm >= 0 && details.noticePeriod >= 0)) return true;
      return parseFloat(details.initialTerm) + parseFloat(details.noticePeriod) > Permission.MAX_POLICY_DURATION;
    }
    if (policyType === Permission.POLICY_IDS.CONTRACT) {
      return !/^0x[0-9a-f]{60,}/i.test(details.contract); // looks loosely like an address
    }
    return false;
  }, [policyType, details]);

  const allowlistAdd = useCallback((crew) => {
    setAllowlist((a) => [...a, crew].sort((a, b) => formatters.crewName(a).localeCompare(formatters.crewName(b))));
    setAllowlistDirty(true);
  }, []);

  const allowlistRemove = useCallback((crew) => {
    setAllowlist((a) => a.filter((c) => c.id !== crew.id));
    setAllowlistDirty(true);
  }, []);

  const allowlistExclude = useCallback((c) => {
    return allowlist.find((a) => a.id === c.id || crew?.id === c.id);
  }, [allowlist])

  const cancelEdits = useCallback(() => {
    setEditing();
  }, []);

  const saveEdits = useCallback(() => {
    if (editing === 'allowlist') {
      updateAllowlist(allowlist);
    } else {
      updatePolicy(policyType, details);
    }
  }, [allowlist, editing, policyType, details]);

  const toggleEditing = useCallback((which) => {
    setEditing(which);
  }, []);

  /**
   * Viewing
   */

  const onAllowlist = useMemo(
    () => currentPolicy?.allowlist?.find((c) => c.id === crew?.id),
    [crew, currentPolicy]
  );

  const jitStatus = useMemo(() => {
    // if exclusive, everyone cares if under notice
    if (Permission.TYPES[permission].isExclusive) {
      if (currentPolicy?.agreements?.[0]?.noticeTime > 0) return 'under notice';
      if (currentPolicy?.crewStatus === 'available' && permission === Permission.IDS.USE_LOT) {
        if (entity?.building?.Control?.controller?.id === entity?.Control?.controller?.id) return 'controlled';
        if (entity?.surfaceShip?.Control?.controller?.id === entity?.Control?.controller?.id) return 'controlled';
      }

    // else, only the crew cares
    } else if (currentPolicy?.crewStatus === 'granted') {
      if ((currentPolicy?.agreements || []).find((a) => a.permitted.id === crew?.id && a.noticeTime > 0)) return 'under notice';
    }

    return null;
  }, [currentPolicy?.crewStatus, entity]);

  const config = useMemo(() => {
    if (editing === 'allowlist') {
      return {
        name: 'Allowlist',
        color: '#225e75',
        description: `The permission is granted to all crews on the list.`,
      };
    }
    const crewStatus = jitStatus || currentPolicy?.crewStatus;
    return {
      ...Permission.POLICY_TYPES[policyType],
      crewStatus,
      color: editable ? getPolicyColor(policyType) : getStatusColor(crewStatus),
    };
  }, [currentPolicy, editable, editing, jitStatus, policyType]);

  return (
    <CollapsibleBlock
      collapsibleProps={{
        style: {
          padding: '0 5px'
        }
      }}
      onClose={editing ? () => { toggleEditing() } : null}
      outerStyle={{ marginBottom: 8 }}
      uncollapsibleProps={{
        headerColor: config.color
      }}
      title={permission === Permission.IDS.USE_LOT ? <><LotControlIcon /> Lot Control</> : <><PermissionIcon /> {Permission.TYPES[permission]?.name}</>}
      titleAction={() => (
        <span style={{ color: config.color }}>
          {editable
            ? (config.nameShort || config.name)
            : (permission === Permission.IDS.USE_LOT && entity?.Control?.controller?.id === crew?.id
                ? 'Administrator'
                : config.crewStatus
            )
          }
        </span>
      )}
      initiallyClosed>
      {editing && (
        <>
          <Section>
            <Desc>{config.description}</Desc>
          </Section>

          {editing === 'allowlist' && (
            <>
              <Section>
                <Autocomplete
                  assetType="crews"
                  disabled={nativeBool(saving)}
                  excludeFunc={allowlistExclude}
                  onSelect={(c) => allowlistAdd(c)}
                  placeholder="Search Crew Name or ID"
                  width={300}
                />
                <Allowlist>
                  {(allowlist || []).map((a) => (
                    <AllowCrew key={a.id}>
                      <label>{a?.Crew ? formatters.crewName(a) : <EntityName {...a} />}</label>
                      <span>ID: {a.id.toLocaleString()}</span>
                      <IconButton
                        borderless
                        disabled={nativeBool(saving)}
                        onClick={() => allowlistRemove(a)}>
                        <CloseIcon />
                      </IconButton>
                    </AllowCrew>
                  ))}
                </Allowlist>
              </Section>
            </>
          )}

          {editing === 'policy' && (
            <>
              <Section>
                <PolicySelector>
                  <h3>Policy Type</h3>
                  <div>
                    <Policy
                      onClick={saving ? null : () => setPolicyType(Permission.POLICY_IDS.PRIVATE)}
                      isSelected={policyType === Permission.POLICY_IDS.PRIVATE}>
                      <RadioCheckedIcon /><RadioUncheckedIcon /> {Permission.POLICY_TYPES[Permission.POLICY_IDS.PRIVATE].name}
                    </Policy>
                    <Policy
                      onClick={saving ? null : () => setPolicyType(Permission.POLICY_IDS.PREPAID)}
                      isSelected={policyType === Permission.POLICY_IDS.PREPAID}>
                      <RadioCheckedIcon /><RadioUncheckedIcon /> {Permission.POLICY_TYPES[Permission.POLICY_IDS.PREPAID].name}
                    </Policy>
                  </div>
                  <div>
                    <Policy
                      onClick={(saving || entity?.label === Entity.IDS.ASTEROID) ? null : () => setPolicyType(Permission.POLICY_IDS.PUBLIC)}
                      disabled={nativeBool(entity?.label === Entity.IDS.ASTEROID)}
                      isSelected={policyType === Permission.POLICY_IDS.PUBLIC}>
                      <RadioCheckedIcon /><RadioUncheckedIcon /> {Permission.POLICY_TYPES[Permission.POLICY_IDS.PUBLIC].name}
                    </Policy>
                    <Policy
                      onClick={saving ? null : () => setPolicyType(Permission.POLICY_IDS.CONTRACT)}
                      isSelected={policyType === Permission.POLICY_IDS.CONTRACT}>
                      <RadioCheckedIcon /><RadioUncheckedIcon /> {Permission.POLICY_TYPES[Permission.POLICY_IDS.CONTRACT].name}
                    </Policy>
                  </div>
                </PolicySelector>
              </Section>
              {policyType === Permission.POLICY_IDS.PREPAID && (
                <>
                  <PrepaidInputBlock>
                    <label>Price</label>
                    <div>
                      <UncontrolledTextInput
                        disabled={nativeBool(saving)}
                        min={0}
                        onChange={handleChange('rate')}
                        step={1}
                        type="number"
                        value={`${details.rate}`} />
                      <span>SWAY per month</span>
                    </div>
                  </PrepaidInputBlock>
                  <PrepaidInputBlock>
                    <label>Minimum Period</label>
                    <div>
                      <UncontrolledTextInput
                        disabled={nativeBool(saving)}
                        max={12}
                        min={0}
                        onChange={handleChange('initialTerm')}
                        step={0.1}
                        type="number"
                        value={`${details.initialTerm}`} />
                      <span>months</span>
                    </div>
                  </PrepaidInputBlock>
                  <PrepaidInputBlock>
                    <label>Notice Period</label>
                    <div>
                      <UncontrolledTextInput
                        disabled={nativeBool(saving)}
                        max={12}
                        min={0}
                        onChange={handleChange('noticePeriod')}
                        step={0.1}
                        type="number"
                        value={`${details.noticePeriod}`} />
                      <span>months</span>
                    </div>
                  </PrepaidInputBlock>
                </>
              )}
              {policyType === Permission.POLICY_IDS.CONTRACT && (
                <>
                  <InputBlock>
                    <label>Contract Address</label>
                    <div>
                      <UncontrolledTextArea
                        disabled={nativeBool(saving)}
                        onChange={handleChange('contract')}
                        placeholder="Copy & Paste the Custom Contract Address"
                        style={{ height: 80 }}
                        value={details.contract || ''} />
                    </div>
                  </InputBlock>
                </>
              )}
            </>
          )}
          <Section style={{ paddingBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                disabled={nativeBool(saving)}
                onClick={() => cancelEdits()}
                size="small"
                subtle>Cancel</Button>
              <Button
                disabled={nativeBool(!isDirty || isIncomplete || saving)}
                loading={saving}
                isTransaction
                onClick={() => saveEdits()}
                size="small"
                style={{ marginLeft: 6 }}
                subtle>Update</Button>
            </div>
          </Section>
        </>
      )}
      {!editing && (
        <>
          <Section>
            <DataBlock>
              <DataRow><label>Policy Type</label><span>{config.name}</span></DataRow>
              {policyType === Permission.POLICY_IDS.PREPAID && (
                <>
                  <DataRow>
                    <label>Price per Month</label>
                    {permission === Permission.IDS.USE_LOT && entity?.label === Entity.IDS.ASTEROID && entity?.id === 1
                      ? <span><SwayIcon /> Variable by Lot</span>
                      : <span><SwayIcon /> {formatFixed(originalPolicyDetails?.rate || 0)}</span>
                    }
                  </DataRow>
                  <DataRow><label>Minimum Period</label><span>{formatFixed(originalPolicyDetails?.initialTerm, 3)} mo</span></DataRow>
                  <DataRow><label>Notice Period</label><span>{formatFixed(originalPolicyDetails?.noticePeriod, 3)} mo</span></DataRow>
                </>
              )}
              {([Permission.POLICY_IDS.CONTRACT, Permission.POLICY_IDS.PREPAID].includes(policyType)) && (
                <div style={{ paddingTop: 15 }}>
                  {entity?.Control?.controller?.id !== crew?.id
                    && !(entity?.label === Entity.IDS.ASTEROID && permission === Permission.IDS.USE_LOT)
                    && (
                    <actionButtons.FormAgreement.Component
                      _disabled={Permission.TYPES[permission].isExclusive && (jitStatus === 'controlled' || agreements?.length > 0)}
                      entity={entity}
                      permission={permission} />
                  )}
                  {/* TODO: enable list view at an asteroid level... will need to pull all agreements from
                    elasticsearch since entity will be asteroid (and *agreements won't be populated) */}
                  {!(entity?.label === Entity.IDS.ASTEROID && permission === Permission.IDS.USE_LOT) && (
                    <actionButtons.ViewAgreements.Component
                      _disabled={!agreements?.length}
                      entity={entity}
                      permission={permission}
                      tally={agreements?.length || 0} />
                  )}
                </div>
              )}
            </DataBlock>
          </Section>

          {editable && (
            <EditBlock>
              <Button onClick={() => toggleEditing('policy')} subtle>Edit Permission Policy</Button>
            </EditBlock>
          )}

          {permission !== Permission.IDS.USE_LOT && (
            <>
              {editable && (
                <Section style={{ borderTop: 0, marginTop: 5 }}>
                  <DataBlock style={{ paddingBottom: 5 }}>
                    <DataRow><label>Allowlist</label><span>{(allowlist?.length || 0).toLocaleString()} Crew{allowlist?.length === 1 ? '' : 's'}</span></DataRow>
                  </DataBlock>
                  <EditBlock>
                    <Button onClick={() => toggleEditing('allowlist')} subtle>Edit Allowlist</Button>
                  </EditBlock>
                </Section>
              )}

              {!editable && (
                <Section style={{ paddingBottom: 0 }}>
                  <DataBlock>
                    <DataRow>
                      <label>Allowlist</label>
                      <span style={{ color: onAllowlist ? '#00db51' : '#777' }}>{onAllowlist ? 'Allowed' : 'Not on List'}</span>
                    </DataRow>
                  </DataBlock>
                </Section>
              )}
            </>
          )}
        </>
      )}
    </CollapsibleBlock>
  )
};

const PolicyPanels = ({ editable, entity }) => {
  const { crew } = useCrewContext();
  const { data: lot } = useLot(entity?.label === Entity.IDS.BUILDING ? entity.Location.location.id : null);
  const { isAtRisk } = useConstructionManager(lot?.id);

  const permPolicies = useMemo(() => entity ? Permission.getPolicyDetails(entity, crew?.id) : {}, [crew?.id, entity]);

  // show lot warning if building controller does not have lot permission
  const showLotWarning = useMemo(() => {
    if (!lot) return false;

    const lotPerm = Permission.getPolicyDetails(lot, entity.Control?.controller?.id)[Permission.IDS.USE_LOT];
    return !(lotPerm?.crewStatus === 'controller' || lotPerm?.crewStatus === 'granted');
  }, [lot]);

  const buildingOrSite = useMemo(() => lot?.building?.Building?.status < Building.CONSTRUCTION_STATUSES.OPERATIONAL ? 'Construction Site' : 'Building', [lot]);

  const showStagingWarning = useMemo(() => {
    if (isAtRisk) {
      return 2;
    } else if (lot && lot.building && lot.building.Building?.status < Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION) {
      return 1;
    }
    return 0;
  }, [lot]);

  const [ crewHasAgreements, crewCanMakeAgreements ] = useMemo(() => {
    let hasAgreement = false;
    let isAgreeable = false;
    Object.keys(permPolicies).forEach((permission) => {
      const { crewStatus } = permPolicies[permission];
      if (crewStatus === 'granted') hasAgreement = true;
      else if (crewStatus === 'available') isAgreeable = true;
    });
    return [hasAgreement, isAgreeable];
  }, [permPolicies]);

  return (
    <div>
      {showLotWarning && <PermSummaryWarning style={{ paddingBottom: 10 }}><WarningIcon /><span>Lot not controlled. {buildingOrSite} is vulnerable to <EntityLink {...(lot?.Control?.controller || {})} />.</span></PermSummaryWarning>}
      {showStagingWarning === 2 && <PermSummaryWarning><WarningIcon /><span>Staging Time expired. Construction Site is vulnerable to any crew.</span></PermSummaryWarning>}
      {showStagingWarning === 1 && <PermSummary><WarningIcon /><span><LiveTimer target={lot?.building?.Building?.plannedAt + Building.GRACE_PERIOD} maxPrecision={2} /> Staging Time Remaining</span></PermSummary>}

      {(crewHasAgreements || crewCanMakeAgreements) && (
        <PermSummary success={crewHasAgreements}>
          <FormAgreementIcon />
          {crewHasAgreements ? 'This asset has agreements with my crew.' : 'This asset has permission agreements.'}
        </PermSummary>
      )}
      {Object.keys(permPolicies).map((permission) => (
        <PolicyPanel
          key={permission}
          editable={reactBool(editable)}
          entity={entity}
          permission={Number(permission)} />
      ))}
    </div>
  );
};

export default PolicyPanels;