import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Entity, Permission, Product, Time } from '@influenceth/sdk';
import styled from 'styled-components';

import headerBackground from '~/assets/images/modal_headers/CrewManagement.png';
import { ExtendAgreementIcon, FoodIcon, FormAgreementIcon, ForwardIcon, InventoryIcon, LocationIcon, PermissionIcon, RouteIcon, SurfaceTransferIcon, SwayIcon, WarningOutlineIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { reactBool, formatTimer, locationsArrToObj, getCrewAbilityBonuses, formatFixed, monthsToSeconds, secondsToMonths } from '~/lib/utils';
import {
  ItemSelectionSection,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  formatMass,
  formatSampleMass,
  formatSampleVolume,
  formatVolume,
  getBonusDirection,
  TimeBonusTooltip,
  EmptyBuildingImage,
  BuildingImage,
  FlexSectionSpacer,
  ActionDialogBody,
  FlexSectionInputBlock,
  FlexSection,
  TransferSelectionDialog,
  DestinationSelectionDialog,
  ProgressBarSection,
  Mouseoverable,
  ActionDialogTabs,
  InventoryChangeCharts,
  CrewOwnerBlock,
  TransferDistanceDetails,
  FlexSectionBlock,
  WarningAlert,
  SwayInputBlock,
  SwayInputBlockInner,
  LotInputBlock,
  InventorySelectionDialog,
  getCapacityStats,
  InventoryInputBlock,
  CrewInputBlock,
  MiniBarChart,
  formatResourceMass,
  BuildingInputBlock,
  ShipInputBlock,
} from './components';
import { ActionDialogInner } from '../ActionDialog';
import actionStages from '~/lib/actionStages';
import theme from '~/theme';
import CrewIndicator from '~/components/CrewIndicator';
import useEntity from '~/hooks/useEntity';
import formatters from '~/lib/formatters';
import useAsteroid from '~/hooks/useAsteroid';
import useInterval from '~/hooks/useInterval';
import useAuth from '~/hooks/useAuth';
import useBlockTime from '~/hooks/useBlockTime';
import useAgreementManager from '~/hooks/actionManagers/useAgreementManager';
import useHydratedLocation from '~/hooks/useHydratedLocation';
import useCrew from '~/hooks/useCrew';
import UncontrolledTextInput, { TextInputWrapper } from '~/components/TextInputUncontrolled';
import useSwayBalance from '~/hooks/useSwayBalance';
import { current } from 'immer';

const FormSection = styled.div`
  margin-top: 12px;
  &:first-child {
    margin-top: 0px;
  }
`;

const InputLabel = styled.div`
  align-items: center;
  color: #888;
  display: flex;
  flex-direction: row;
  font-size: 14px;
  margin-bottom: 3px;
  & > label {
    flex: 1;
  }
  & > span {
    b {
      color: white;
      font-weight: normal;
    }
  }
`;

const DisabledUncontrolledTextInput = styled(UncontrolledTextInput)`
  background: rgba(${p => p.theme.colors.mainRGB}, 0.15);
`;

const InputSublabels = styled.div`
  display: flex;
  flex-direction: row;
  font-size: 80%;
  justify-content: space-between;
  margin: 6px 0;
  & > div > b {
    color: white;
    font-weight: normal;
  }
`;

const InsufficientAssets = styled.span`
  color: ${p => p.theme.colors.red};
`;
const Alert = styled.div`
  & > div {
    display: flex;

    &:first-child {
      align-items: center;
      background: rgba(${p => p.theme.colors.mainRGB}, 0.4);
      color: white;
      display: flex;
      font-size: 20px;
      padding: 8px 8px;
      & > svg {
        font-size: 24px;
        margin-right: 6px;
      }
    }

    &:last-child {
      align-items: flex-end;
      justify-content: space-between;
      padding: 8px 10px 0;
      b {
        color: white;
        font-weight: normal;
      }
    }
  }
`;

const FormAgreement = ({
  agreementManager,
  entity,
  isExtension = true,
  permission,
  stage,
  ...props
}) => {
  const { currentAgreement, currentPolicy, enterAgreement, extendAgreement } = agreementManager;
  const { crew } = useCrewContext();
  const { data: swayBalance } = useSwayBalance();
  // const blockTime = useBlockTime();

  const crewmates = crew?._crewmates;
  const captain = crewmates[0];
  const location = useHydratedLocation(locationsArrToObj(entity?.Location?.locations || []));

  const { data: controller } = useCrew(entity?.Control?.controller?.id);

  const maxTerm = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    if (currentAgreement?.endTime > now) {
      return 12 - secondsToMonths(Math.max(0, currentAgreement?.endTime - now - 3600));
    }
    return 12;
  }, [currentAgreement]);

  const [initialPeriod, setInitialPeriod] = useState(isExtension ? maxTerm : (currentPolicy?.policyDetails?.initialTerm || 0));

  // TODO: ? the stats in the mock are very redundant
  const stats = useMemo(() => {
    if (currentPolicy?.policyType === Permission.POLICY_IDS.PREPAID) {
      return [
        {
          label: `${isExtension ? 'Updated ' : ''}Lease Length`,
          value: `${initialPeriod} month${initialPeriod === 1 ? '' : 's'}`,
          direction: 0,
        },
        {
          label: 'Lease Length (Adalian Days)',
          value: Time.toGameDuration(monthsToSeconds(initialPeriod) / 86400, crew?._timeAcceleration).toLocaleString(),
          direction: 0,
        },
        {
          label: 'Notice Period',
          value: isExtension
            ? `${currentAgreement?.noticePeriod || 0} month${currentAgreement?.noticePeriod === 1 ? '' : 's'}`
            : `${currentPolicy?.policyDetails?.noticePeriod || 0} month${currentPolicy?.policyDetails?.noticePeriod === 1 ? '' : 's'}`,
          direction: 0,
        },
      ];
    }
    return [];
  }, [crew, currentAgreement, currentPolicy, initialPeriod, isExtension]);

  const totalLeaseCost = useMemo(() => {
    return (initialPeriod || 0) * (currentPolicy?.policyDetails?.rate || 0)
  }, [initialPeriod, currentPolicy]);

  const insufficientAssets = useMemo(
    () => BigInt(Math.ceil(totalLeaseCost)) > swayBalance,
    [swayBalance, totalLeaseCost]
  );

  const handlePeriodChange = useCallback((e) => {
    // TODO: validate min/max before updating state
    setInitialPeriod(e.currentTarget.value);
  }, []);

  const onEnterAgreement = useCallback(() => {
    const recipient = controller?.Crew?.delegatedTo;
    // TODO: should these conversions be in useAgreementManager?
    const term = monthsToSeconds(initialPeriod);
    const termPrice = totalLeaseCost * 1e6;
    if (isExtension) {
      extendAgreement({ recipient, term, termPrice });
    } else {
      enterAgreement({ recipient, term, termPrice });
    }
  }, [controller?.Crew?.delegatedTo, initialPeriod, totalLeaseCost]);

  const actionDetails = useMemo(() => {
    const policyType = Permission.POLICY_IDS.PREPAID; // TODO: ...
    if (isExtension) {
      return {
        icon: <ExtendAgreementIcon />,
        label: `Extend ${entity.label === Entity.IDS.LOT ? 'Lot' : 'Asset'} Agreement`,
        status: stage === actionStages.NOT_STARTED ? 'Prepaid Lease' : undefined,
      };
    }
    return {
      icon: <FormAgreementIcon />,
      label: `Form ${entity.label === Entity.IDS.LOT ? 'Lot' : 'Asset'} Agreement`,
      status: stage === actionStages.NOT_STARTED
        ? (policyType === Permission.POLICY_IDS.PREPAID ? 'Prepaid Lease' : 'Custom Contract')
        : undefined,
    }
  }, [entity, isExtension, stage]);

  return (
    <>
      <ActionDialogHeader
        action={actionDetails}
        captain={captain}
        location={location}
        crewAvailableTime={0}
        taskCompleteTime={0}
        onClose={props.onClose}
        overrideColor={stage === actionStages.NOT_STARTED ? theme.colors.main : undefined}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection style={{ alignItems: 'flex-start' }}>
          <FlexSectionBlock
            title="Agreement Details"
            bodyStyle={{ height: 'auto', padding: 0 }}>

            {entity.label === Entity.IDS.BUILDING && (
              <BuildingInputBlock building={entity} style={{ width: '100%' }} />
            )}
            {entity.label === Entity.IDS.LOT && (
              <LotInputBlock lot={entity} style={{ width: '100%' }} />
            )}
            {entity.label === Entity.IDS.SHIP && (
              <ShipInputBlock ship={entity} style={{ width: '100%' }} />
            )}

            <div style={{ padding: '20px 10px' }}>
              <CrewIndicator crew={controller} />
            </div>
          </FlexSectionBlock>
          
          <FlexSectionSpacer />

          <FlexSectionBlock
            title={`${isExtension ? 'Extend' : 'Lease'} For`}
            bodyStyle={{ height: 'auto', padding: '6px 12px' }}>
            
            <FormSection>
              <InputLabel>
                <label>{isExtension ? 'Added' : 'Leasing'} Period</label>
              </InputLabel>
              <TextInputWrapper rightLabel="months">
                <UncontrolledTextInput
                  disabled={stage !== actionStages.NOT_STARTED}
                  min={currentPolicy?.policyDetails?.initialTerm || 0}
                  max={12}
                  onChange={handlePeriodChange}
                  step={0.1}
                  type="number"
                  value={initialPeriod || 0} />
              </TextInputWrapper>
              <InputSublabels>
                {isExtension
                  ? <div>Min <b>{formatFixed(0, 1)} months</b></div>
                  : <div>Min <b>{formatFixed(currentPolicy?.policyDetails?.initialTerm || 0, 1)} month{currentPolicy?.policyDetails?.initialTerm === 1 ? '' : 's'}</b></div>
                }
                <div>Max <b>{formatFixed(maxTerm, 1)} months</b></div>
              </InputSublabels>
            </FormSection>
            
            <FormSection>
              <InputLabel>
                <label>Price</label>
              </InputLabel>
              <TextInputWrapper rightLabel="SWAY / month">
                <DisabledUncontrolledTextInput
                  disabled
                  value={(currentPolicy?.policyDetails?.rate || 0)} />
              </TextInputWrapper>
            </FormSection>

          </FlexSectionBlock>
        </FlexSection>

        <FlexSection style={{ alignItems: 'flex-start' }}>
          <FlexSectionInputBlock
            title="Agreement Details"
            bodyStyle={{ height: 'auto', padding: 6 }}
            style={{ width: '100%' }}>
            <Alert>
              <div>
                <PermissionIcon /> {Permission.TYPES[permission].name}
              </div>
              <div>
                <div>
                  {insufficientAssets
                    ? <InsufficientAssets>Insufficient Wallet Balance</InsufficientAssets>
                    : <>Granted For: <b>{' '}{initialPeriod} months</b></>
                  }
                </div>
                <div style={{ position: 'relative', top: 4 }}>
                  <span style={{ position: 'relative', bottom: 4 }}>Total:</span>
                  <span style={{ color: 'white', display: 'inline-flex', fontSize: '32px', height: '32px', lineHeight: '32px' }}>
                    <SwayIcon /> <span>{formatFixed(totalLeaseCost)}</span>
                  </span>
                </div>
              </div>
            </Alert>

          </FlexSectionInputBlock>

        </FlexSection>

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={insufficientAssets}
        goLabel={`${isExtension ? 'Update' : 'Create'} Agreement`}
        onGo={onEnterAgreement}
        stage={stage}
        {...props} />
    </>
  );
};

const Wrapper = ({ entity: entityId, permission, isExtension, ...props }) => {
  const { crewIsLoading } = useCrewContext();
  const { data: entity, isLoading: entityIsLoading } = useEntity(entityId);
  const agreementManager = useAgreementManager(entity, permission);

  const stage = agreementManager.changePending ? actionStages.STARTING : actionStages.NOT_STARTED;

  // handle auto-closing on any status change
  const lastStatus = useRef();
  useEffect(() => {
    if (lastStatus.current && stage !== lastStatus.current) {
      props.onClose();
    }
    if (lastStatus.current) {
      lastStatus.current = stage;
    }
  }, [stage]);

  useEffect(() => {
    if (!entityIsLoading && !entity) {
      props.onClose();
    }
  }, [entity, entityIsLoading]);

  return (
    <ActionDialogInner
      actionImage={headerBackground}
      isLoading={reactBool(entityIsLoading || crewIsLoading)}
      stage={stage}>
      <FormAgreement
        entity={entity}
        agreementManager={agreementManager}
        permission={permission}
        isExtension={isExtension}
        stage={stage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
