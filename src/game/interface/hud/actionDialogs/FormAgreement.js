import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Entity, Permission, Product } from '@influenceth/sdk';
import styled from 'styled-components';

import headerBackground from '~/assets/images/modal_headers/CrewManagement.png';
import { ExtendAgreementIcon, FoodIcon, FormAgreementIcon, ForwardIcon, InventoryIcon, LocationIcon, RouteIcon, SurfaceTransferIcon, WarningOutlineIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { reactBool, formatTimer, locationsArrToObj, getCrewAbilityBonuses, formatFixed } from '~/lib/utils';
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
import { BuildingInputBlock } from './components';
import { ShipInputBlock } from './components';
import useCrew from '~/hooks/useCrew';

const PseudoStatRow = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  & > label {
    flex: 1;
  }
  & > span {
    color: white;
    font-weight: bold;
    white-space: nowrap;
  }
`;

const UnderLabel = styled.span`
  overflow: hidden;
  text-align: center;
  width: 25%;
  
  &:first-child {
    text-align: left;
  }
  &:last-child {
    text-align: right;
  }
`;

const Alert = styled.div`
  background: #555;
  & > div:first-child {
    background: blue;
  }
`;

const FormAgreement = ({
  agreementManager,
  entity,
  isExtension,
  permission,
  stage,
  ...props
}) => {
  const { changePending } = agreementManager;
  const { crew } = useCrewContext();
  // const blockTime = useBlockTime();

  const crewmates = crew?._crewmates;
  const captain = crewmates[0];
  const location = useHydratedLocation(locationsArrToObj(entity?.Location?.locations || []));

  const { data: controller } = useCrew(entity?.Control?.controller);

  // const crewTravelBonus = useMemo(() => {
  //   if (!crew) return {};
  //   return getCrewAbilityBonuses(Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, crew) || {};
  // }, [crew]);

  // const [originSelectorOpen, setOriginSelectorOpen] = useState(false);
  // const [tab, setTab] = useState(0);
  // const [transferSelectorOpen, setTransferSelectorOpen] = useState();
  // const [selectedItems, setSelectedItems] = useState(props.preselect?.selectedItems || {});

  // // get origin* data
  // const [originSelection, setOriginSelection] = useState(
  //   (currentFeeding && currentFeeding.vars?.origin && {
  //     id: currentFeeding.vars?.origin?.id,
  //     label: currentFeeding.vars?.origin?.label,
  //     slot: currentFeeding.vars?.origin_slot,
  //   }) || undefined
  // );
  // const { data: origin } = useEntity(originSelection ? { id: originSelection.id, label: originSelection.label } : undefined);
  // const originLotId = useMemo(() => origin && locationsArrToObj(origin?.Location?.locations || []).lotId, [origin]);
  // const { data: originLot } = useLot(originLotId);
  // const originInventory = useMemo(() => (origin?.Inventories || []).find((i) => i.slot === originSelection?.slot), [origin, originSelection]);

  // // handle "currentFeeding" state
  // useEffect(() => {
  //   if (currentFeeding) {
  //     setSelectedItems({ [Product.IDS.FOOD]: currentFeeding.vars?.food || 0 });
  //   }
  // }, [currentFeeding]);

  // const [transportDistance, transportTime] = useMemo(() => {
  //   if (!asteroid?.id || !originLot?.id) return [0, 0];
  //   const originLotIndex = Lot.toIndex(originLot?.id);
  //   const destinationLotIndex = crew?._location?.lotIndex;
  //   const transportDistance = Asteroid.getLotDistance(asteroid?.id, originLotIndex, destinationLotIndex);
  //   const transportTime = Time.toRealDuration(
  //     Asteroid.getLotTravelTime(asteroid?.id, originLotIndex, destinationLotIndex, crewTravelBonus.totalBonus),
  //     crew?._timeAcceleration
  //   );
  //   return [transportDistance, transportTime];
  // }, [asteroid?.id, originLot?.id, crewTravelBonus, crew?._location?.lotIndex, crew?._timeAcceleration]);

  // const { totalMass, totalVolume } = useMemo(() => {
  //   return Object.keys(selectedItems).reduce((acc, resourceId) => {
  //     acc.totalMass += selectedItems[resourceId] * Product.TYPES[resourceId].massPerUnit;
  //     acc.totalVolume += selectedItems[resourceId] * Product.TYPES[resourceId].volumePerUnit;
  //     return acc;
  //   }, { totalMass: 0, totalVolume: 0 })
  // }, [selectedItems]);

  // const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => {
  //   return [
  //     transportTime,
  //     0
  //   ];
  // }, [transportTime]);

  // const stats = useMemo(() => ([
  //   {
  //     label: 'Task Duration',
  //     value: formatTimer(transportTime),
  //     direction: getBonusDirection(crewTravelBonus),
  //     isTimeStat: true,
  //     tooltip: (
  //       <TimeBonusTooltip
  //         bonus={crewTravelBonus}
  //         title="Transport Time"
  //         totalTime={transportTime}
  //         crewRequired="start" />
  //     )
  //   },
  //   {
  //     label: 'Transfer Distance',
  //     value: `${Math.round(transportDistance)} km`,
  //     direction: 0
  //   },
  //   {
  //     label: 'Transfered Mass',
  //     value: `${formatMass(totalMass)}`,
  //     direction: 0
  //   },
  //   {
  //     label: 'Transfered Volume',
  //     value: `${formatVolume(totalVolume)}`,
  //     direction: 0
  //   },
  // ]), [totalMass, totalVolume, transportDistance, transportTime]);

  // const onStartFeeding = useCallback(() => {
  //   feedCrew({
  //     origin,
  //     originSlot: originInventory?.slot,
  //     amount: Math.floor(selectedItems[Product.IDS.FOOD])
  //   });
  // }, [asteroid?.id, origin, originInventory, originLot, selectedItems]);

  // const foodStats = useMemo(() => {
  //   const maxFood = (crew?._crewmates?.length || 1) * Crew.CREWMATE_FOOD_PER_YEAR;
  //   const timeSinceFed = Time.toGameDuration(blockTime - (crew?.Crew?.lastFed || 0), crew?._timeAcceleration);
  //   const currentFood = Math.floor(maxFood * Crew.getCurrentFoodRatio(timeSinceFed, crew._foodBonuses?.consumption)); // floor to quanta
  //   const addingFood = selectedItems[Product.IDS.FOOD] || 0;
  //   const postValue = (currentFood + addingFood) / maxFood;
  //   const postTimeSinceFed = Crew.getTimeSinceFed((currentFood + addingFood) / maxFood, crew._foodBonuses?.consumption);
  //   const rationingTimeSinceFed = Crew.getTimeSinceFed(0.5, crew._foodBonuses?.consumption);
  //   const rationingPenalty = 1 - Crew.getFoodMultiplier(postTimeSinceFed, crew._foodBonuses?.consumption, crew._foodBonuses?.rationing);
  //   const timeUntilRationing = Time.toRealDuration(Math.max(0, rationingTimeSinceFed - postTimeSinceFed));
  
  //   const barColor = postValue >= 0.5 ? theme.colors.green : theme.colors.warning;
  //   const deltaValue = addingFood / maxFood;

  //   return {
  //     addingFood,
  //     barColor,
  //     currentFood,
  //     deltaValue,
  //     maxFood,
  //     postValue,
  //     rationingPenalty,
  //     timeUntilRationing
  //   }
  // }, [crew?._crewmates, crew?.Crew?.lastFed, crew?._timeAcceleration, blockTime, selectedItems]);

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

  const insufficientAssets = false;// TODO
  const stats = [];

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

        <FlexSection>
          <div>
            {entity.label === Entity.IDS.BUILDING && (
              <BuildingInputBlock />
            )}
            {entity.label === Entity.IDS.LOT && (
              <LotInputBlock />
            )}
            {entity.label === Entity.IDS.SHIP && (
              <ShipInputBlock />
            )}

            <CrewIndicator crew={controller} />
          </div>
          
          <FlexSectionSpacer>
            <ForwardIcon />
          </FlexSectionSpacer>

          <div>
            form goes here
          </div>
        </FlexSection>

        <FlexSection style={{ alignItems: 'flex-start' }}>
        <FlexSectionBlock
            title="Agreement Details"
            bodyStyle={{ height: 'auto', padding: 0 }}
            style={{ width: '100%' }}>
            <Alert insufficientAssets={reactBool(insufficientAssets)}>
              <div>
                blurf
              </div>
            </Alert>

          </FlexSectionBlock>

        </FlexSection>

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={false/* TODO */}
        finalizeLabel="Complete"
        goLabel="Transfer"
        onGo={() => {}}
        stage={stage}
        {...props} />
    </>
  );
};

const Wrapper = ({ entity: entityId, permission, isExtension, ...props }) => {
  const { crewIsLoading } = useCrewContext();
  const { data: entity, isLoading: entityIsLoading } = useEntity(entity);
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
