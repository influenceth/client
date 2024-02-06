import styled from 'styled-components';
import { Building, Entity, Permission } from '@influenceth/sdk';

import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { CloseIcon, KeysIcon, RadioCheckedIcon, RadioUncheckedIcon, SwayIcon } from '~/components/Icons';
import CollapsibleBlock from '~/components/CollapsibleBlock';
import actionButtons from '../actionButtons';
import { HudMenuCollapsibleSection, Scrollable } from './components/components';
import EntityDescriptionForm from './components/EntityDescriptionForm';
import EntityNameForm from './components/EntityNameForm';
import LotTitleArea from './components/LotTitleArea';
import MarketplaceSettings from './components/MarketplaceSettings';
import Button from '~/components/ButtonAlt';
import { useCallback, useMemo, useState } from 'react';
import Autocomplete from '~/components/Autocomplete';
import formatters from '~/lib/formatters';
import IconButton from '~/components/IconButton';
import { InputBlock } from '~/components/filters/components';
import { formatFixed, nativeBool } from '~/lib/utils';
import UncontrolledTextInput from '~/components/TextInputUncontrolled';
import UncontrolledTextArea from '~/components/TextAreaUncontrolled';
import usePolicyManager, { getEntityPolicies } from '~/hooks/actionManagers/usePolicyManager';
import EntityName from '~/components/EntityName';


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
      cursor: ${p.theme.cursors.active};
      opacity: 0.5;
      & > svg { opacity: 0.3; }
      & > svg:first-child {
        display: none;
      }

      &:hover {
        opacity: 0.8;
      }
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

// TODO: move any of this to sdk?
const types = {
  allowlist: {
    label: 'Allowlist',
    color: '#225e75',
    desc: `The permission is granted to all crews on the list.`,
  },
  contract: {
    label: 'Custom Contract',
    labelShort: 'Custom',
    color: '#363d65',
    desc: `The permission is granted through terms specified in the Custom Contract.`
  },
  private: {
    label: 'Private',
    color: '#7e2b2a',
    desc: `The permission is retained by the controlling crew.`
  },
  public: {
    label: 'Public',
    color: '#336342',
    desc: `The permission is granted to any visiting crew.`
  },
  prepaid: {
    label: 'Prepaid Lease',
    labelShort: 'Prepaid',
    color: '#185c5c',
    desc: `The permission may be leased for up to 12 months for a pre-paid sum.`
  },
}

const PolicyAdminPanel = ({ entity, permission }) => {
  const { currentPolicy, updateAllowlist, updatePolicy } = usePolicyManager(entity, permission);
  // console.log({ currentPolicy });
  const {
    policyType: originalPolicyType,
    policyDetails: originalPolicyDetails,
    allowlist: originalAllowlist,
    agreements = [],  // TODO: ...
  } = currentPolicy || {};

  const [allowlist, setAllowlist] = useState(originalAllowlist || []);
  const [allowlistDirty, setAllowlistDirty] = useState(false);
  const [editing, setEditing] = useState();
  const [policyType, setPolicyType] = useState(originalPolicyType);

  const [details, setDetails] = useState(originalPolicyDetails);
  const handleChange = useCallback((key) => (e) => {
    let newVal = e.currentTarget.value;
    console.log('newVal', key, newVal);
    setDetails((v) => ({
      ...v,
      [key]: newVal
    }));
  }, []);

  // TODO: disable while saving, exit "editing" mode when finished

  // TODO: also check form completion before enabling "save"
  // TODO: show error where relevant

  const isDirty = useMemo(() => {
    return policyType !== originalPolicyType
      || Object.keys(details).reduce((acc, k) => acc || details[k] !== originalPolicyDetails[k], false)
      || Object.keys(originalPolicyDetails).reduce((acc, k) => acc || details[k] !== originalPolicyDetails[k], false)
      || allowlistDirty;
  }, [allowlistDirty, policyType, originalPolicyType, originalPolicyDetails, details]);
  
  const saving = false; // TODO: ...

  const allowlistAdd = useCallback((crew) => {
    setAllowlist((a) => [...a, crew].sort((a, b) => formatters.crewName(a).localeCompare(formatters.crewName(b))));
    setAllowlistDirty(true);
  }, []);

  const allowlistRemove = useCallback((crew) => {
    setAllowlist((a) => a.filter((c) => c.id !== crew.id));
    setAllowlistDirty(true);
  }, []);

  const allowlistExclude = useCallback((crew) => {
    return allowlist.find((a) => a.id === crew.id);
  }, [allowlist])

  const cancelEdits = useCallback(() => {
    setEditing();
    // TODO: set back to pristine
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

  const config = useMemo(() => types[editing === 'allowlist' ? 'allowlist' : policyType], [editing, policyType]);

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
      title={(<><KeysIcon /> {Permission.TYPES[permission]?.name}</>)}
      titleAction={() => <span style={{ color: config.color }}>{config.labelShort || config.label}</span>}
      initiallyClosed>
      {editing && (
        <>
          <Section>
            <Desc>{config.desc}</Desc>
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
                    <Policy onClick={saving ? null : () => setPolicyType('private')} isSelected={policyType === 'private'}><RadioCheckedIcon /><RadioUncheckedIcon /> Private</Policy>
                    <Policy onClick={saving ? null : () => setPolicyType('prepaid')} isSelected={policyType === 'prepaid'}><RadioCheckedIcon /><RadioUncheckedIcon /> Prepaid Lease</Policy>
                  </div>
                  <div>
                    <Policy onClick={saving ? null : () => setPolicyType('public')} isSelected={policyType === 'public'}><RadioCheckedIcon /><RadioUncheckedIcon /> Public</Policy>
                    <Policy onClick={saving ? null : () => setPolicyType('contract')} isSelected={policyType === 'contract'}><RadioCheckedIcon /><RadioUncheckedIcon /> Custom Contract</Policy>
                  </div>
                </PolicySelector>
              </Section>
              {policyType === 'prepaid' && (
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
                        value={details.rate || ''} />
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
                        value={details.initialTerm || ''} />
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
                        value={details.noticePeriod || ''} />
                      <span>months</span>
                    </div>
                  </PrepaidInputBlock>
                  <PrepaidInputBlock>
                    <label>Grace Period</label>
                    <div>
                      <UncontrolledTextInput
                        disabled
                        value={1.0} />
                      <span>months</span>
                    </div>
                  </PrepaidInputBlock>
                </>
              )}
              {policyType === 'contract' && (
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
                onClick={() => cancelEdits()}
                size="small"
                subtle>Cancel</Button>
              <Button
                disabled={nativeBool(!isDirty || saving)}
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
              <DataRow><label>Policy Type</label><span>{config.label}</span></DataRow>
              {policyType === 'prepaid' && (
                <>
                  <DataRow><label>Price per Month</label><span><SwayIcon /> {(originalPolicyDetails?.rate || 0).toLocaleString()}</span></DataRow>
                  <DataRow><label>Minimum Period</label><span>{formatFixed(originalPolicyDetails?.initialTerm, 1)} mo</span></DataRow>
                  <DataRow><label>Notice Period</label><span>{formatFixed(originalPolicyDetails?.noticePeriod, 1)} mo</span></DataRow>
                </>
              )}
              {(policyType === 'prepaid' || policyType === 'contract') && (
                <div style={{ paddingTop: 15 }}>
                  <actionButtons.ViewAgreements.Component tally={3} />
                </div>
              )}
            </DataBlock>
          </Section>
          
          <EditBlock>
            <Button onClick={() => toggleEditing('policy')} subtle>Edit Permission Policy</Button>
          </EditBlock>

          <Section style={{ borderTop: 0, marginTop: 5 }}>
            <DataBlock style={{ paddingBottom: 5 }}>
              <DataRow><label>Allowlist</label><span>{(allowlist?.length || 0).toLocaleString()} Crew{allowlist?.length === 1 ? '' : 's'}</span></DataRow>
            </DataBlock>
            <EditBlock>
              <Button onClick={() => toggleEditing('allowlist')} subtle>Edit Allowlist</Button>
            </EditBlock>
          </Section>
        </>
      )}
    </CollapsibleBlock>
  )
};


const AdminBuilding = ({}) => {
  const lotId = useStore(s => s.asteroids.lot);
  const { data: lot } = useLot(lotId);

  const permPolicies = useMemo(() => lot?.building ? getEntityPolicies(lot?.building) : {}, [lot?.building]);
 
  return (
    <>
      <Scrollable>
        <LotTitleArea lot={lot} />

        <HudMenuCollapsibleSection titleText="Update Name" collapsed>
          <EntityNameForm
            entity={lot?.building ? { id: lot.building.id, label: Entity.IDS.BUILDING } : null}
            originalName={lot?.building?.Name?.name}
            label="Building Name" />
        </HudMenuCollapsibleSection>

        <HudMenuCollapsibleSection titleText="Update Description" collapsed>
          <EntityDescriptionForm
            entity={lot?.building ? { id: lot.building.id, label: Entity.IDS.BUILDING } : null}
            originalDesc={``}
            label="Building Description" />
        </HudMenuCollapsibleSection>

        <HudMenuCollapsibleSection titleText="Update Permissions" collapsed>
          {Object.keys(permPolicies).map((permission) => (
            <PolicyAdminPanel
              key={permission}
              entity={lot?.building}
              permission={permission} />
          ))}
        </HudMenuCollapsibleSection>

        {lot?.building?.Building?.buildingType === Building.IDS.MARKETPLACE && (
          <HudMenuCollapsibleSection titleText="Marketplace Settings">
            <MarketplaceSettings marketplace={lot?.building} />
          </HudMenuCollapsibleSection>
        )}
      </Scrollable>
    </>
  );
};

export default AdminBuilding;
