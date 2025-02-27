import { useEffect, useMemo, useState } from 'react';
import { Building, Crewmate, Lot, Permission } from '@influenceth/sdk';

import { PlanBuildingIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import { reactBool, formatTimer, getCrewAbilityBonuses } from '~/lib/utils';

import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import {
  BuildingRequirementsSection,

  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,

  getBonusDirection,
  FlexSection,
  FlexSectionInputBlock,
  BuildingImage,
  EmptyBuildingImage,
  SitePlanSelectionDialog,
  TravelBonusTooltip,
  ActionDialogBody,
  getBuildingRequirements,
  getTripDetails,
  LotControlWarning,
  formatTimeRequirements
} from './components';
import actionStage from '~/lib/actionStages';
import useSimulationState from '~/hooks/useSimulationState';
import useSimulationEnabled from '~/hooks/useSimulationEnabled';

const PlanBuilding = ({ asteroid, lot, constructionManager, stage, ...props }) => {
  const { currentConstructionAction, planConstruction } = constructionManager;
  const { crew, crewCan } = useCrewContext();

  const [buildingType, setBuildingType] = useState();

  const crewTravelBonus = useMemo(() => {
    if (!crew) return {};
    return getCrewAbilityBonuses(Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, crew) || {};
  }, [crew]);

  const crewDistBonus = useMemo(() => {
    if (!crew) return {};
    return getCrewAbilityBonuses(Crewmate.ABILITY_IDS.FREE_TRANSPORT_DISTANCE, crew) || {};
  }, [crew]);

  const lotIsControlled = useMemo(() => crewCan(Permission.IDS.USE_LOT, lot), [crewCan, lot]);

  const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
    if (!asteroid?.id || !crew?._location?.lotId || !lot?.id) return {};
    if (lotIsControlled) return { totalTime: 0, tripDetails: null };
    const crewLotIndex = Lot.toIndex(crew?._location?.lotId);
    return getTripDetails(asteroid.id, crewTravelBonus, crewDistBonus, crewLotIndex, [
      { label: 'Travel to Construction Site', lotIndex: Lot.toIndex(lot.id) },
      { label: 'Return to Crew Station', lotIndex: crewLotIndex },
    ], crew?._timeAcceleration);
  }, [asteroid?.id, lot, crew?._location?.lotId, crew?._timeAcceleration, crewTravelBonus, crewDistBonus, lotIsControlled]);

  const crewTimeRequirement = useMemo(() => {
    const oneWayCrewTravelTime = crewTravelTime / 2;
    return formatTimeRequirements([
      [oneWayCrewTravelTime, 'Travel to Site'],
      [0, 'Initiate Building Plan'],
      [oneWayCrewTravelTime, 'Return to Station']
    ]);
  }, [crewTravelTime]);

  const stats = useMemo(() => {
    if (!asteroid?.id || !lot?.id) return [];
    const taskTime = 0;
    return [
      {
        label: 'Crew Travel Time',
        value: formatTimer(crewTravelTime),
        isTimeStat: true,
        direction: crewTravelTime ? getBonusDirection(crewTravelBonus) : 0,
        tooltip: (
          <TravelBonusTooltip
            bonus={crewTravelTime ? crewTravelBonus : {}}
            totalTime={crewTravelTime}
            tripDetails={tripDetails}
            crewRequired="start" />
        )
      },
      {
        label: 'Task Duration',
        value: formatTimer(taskTime),
        isTimeStat: true
      },
    ];
  }, [crewTravelTime, tripDetails]);

  useEffect(() => {
    if (currentConstructionAction?.buildingType) setBuildingType(currentConstructionAction.buildingType)
  }, [currentConstructionAction?.buildingType]);

  const [siteSelectorOpen, setSiteSelectorOpen] = useState();
  const onBuildingSelected = (type) => {
    setBuildingType(type);
    setSiteSelectorOpen();
  }

  const buildingRequirements = useMemo(() => getBuildingRequirements({ Building: { buildingType } }), [buildingType]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <PlanBuildingIcon />,
          label: 'Create Building Site',
        }}
        actionCrew={crew}
        location={{ asteroid, lot }}
        crewAvailableTime={crewTimeRequirement}
        onClose={props.onClose}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection>
          <FlexSectionInputBlock
            title="Building Site"
            image={
              buildingType
                ? <BuildingImage buildingType={buildingType} unfinished />
                : <EmptyBuildingImage iconOverride={<PlanBuildingIcon />} />
            }
            isSelected={stage === actionStage.NOT_STARTED}
            label={buildingType ? Building.TYPES[buildingType].name : 'Select'}
            onClick={() => setSiteSelectorOpen(true)}
            disabled={stage !== actionStage.NOT_STARTED}
            sublabel="Site"
          />
        </FlexSection>

        {buildingType && stage === actionStage.NOT_STARTED && (
          <BuildingRequirementsSection
            label="Required Materials"
            mode="simple"
            requirements={buildingRequirements}
            requirementsMet />
        )}

        <LotControlWarning lot={lot} />

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />
      </ActionDialogBody>

      <ActionDialogFooter
        crewAvailableTime={crewTimeRequirement}
        disabled={!buildingType}
        goLabel="Create Site"
        onGo={() => planConstruction(buildingType)}
        stage={stage}
        waitForCrewReady={!lotIsControlled}
        {...props} />

      {stage === actionStage.NOT_STARTED && (
        <SitePlanSelectionDialog
          initialSelection={buildingType}
          onClose={() => setSiteSelectorOpen(false)}
          onSelected={onBuildingSelected}
          open={siteSelectorOpen}
        />
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  const constructionManager = useConstructionManager(lot?.id);
  const { stageByActivity } = constructionManager;

  const simulationEnabled = useSimulationEnabled();
  const simulation = useSimulationState();

  useEffect(() => {
    if (!asteroid || !lot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  // stay in this window until PLANNED, then swap to CONSTRUCT
  useEffect(() => {
    if (!['READY_TO_PLAN', 'PLANNING'].includes(constructionManager.constructionStatus)) {
      if (simulationEnabled && !simulation?.canFastForward) {
        if (props.onClose) props.onClose();
      } else {
        props.onSetAction('CONSTRUCT');
      }
    }
  }, [constructionManager.constructionStatus]);

  return (
    <ActionDialogInner
      actionImage="ConstructionPlan"
      isLoading={reactBool(isLoading)}
      stage={stageByActivity.plan}>
      <PlanBuilding
        asteroid={asteroid}
        lot={lot}
        constructionManager={constructionManager}
        stage={stageByActivity.plan}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
