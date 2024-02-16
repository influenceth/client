import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Building, Crewmate, Lot, Permission } from '@influenceth/sdk';

import {
  PlanBuildingIcon,
  WarningIcon,
  WarningOutlineIcon
} from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import theme from '~/theme';
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
  ProgressBarSection,
  TravelBonusTooltip,
  ActionDialogBody,
  getBuildingRequirements,
  getTripDetails,
  LotControlWarning
} from './components';
import actionStage from '~/lib/actionStages';
import EntityName from '~/components/EntityName';

const ControlWarning = styled.div`
  align-items: center;
  color: ${p => p.theme.colors.error};
  display: flex;
  justify-content: center;
  padding: 20px 0 5px;
  & > svg {
    font-size: 125%;
    margin-right: 10px;
  }
`;

const MouseoverWarning = styled.span`
  & b { color: ${theme.colors.error}; }
  & em { font-weight: bold; font-style: normal; color: white; }
`;

const PlanBuilding = ({ asteroid, lot, constructionManager, stage, ...props }) => {
  const { currentConstructionAction, planConstruction } = constructionManager;
  const { captain, crew } = useCrewContext();

  const [buildingType, setBuildingType] = useState();

  const crewTravelBonus = useMemo(() => {
    if (!crew) return {};
    return getCrewAbilityBonuses(Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, crew) || {};
  }, [crew]);

  const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
    if (!asteroid?.id || !crew?._location?.lotId || !lot?.id) return {};
    const crewLotIndex = Lot.toIndex(crew?._location?.lotId);
    return getTripDetails(asteroid.id, crewTravelBonus, crewLotIndex, [
      { label: 'Travel to Construction Site', lotIndex: Lot.toIndex(lot.id) },
      { label: 'Return to Crew Station', lotIndex: crewLotIndex },
    ], crew?._timeAcceleration);
  }, [asteroid?.id, lot?.id, crew?._location?.lotId, crew?._timeAcceleration, crewTravelBonus]);

  const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => {
    if (!tripDetails) return [];
    return [crewTravelTime, 0];
  }, [crewTravelTime, tripDetails]);

  const stats = useMemo(() => {
    if (!asteroid?.id || !lot?.id) return [];
    const taskTime = 0;
    return [
      {
        label: 'Crew Travel Time',
        value: formatTimer(crewTravelTime),
        isTimeStat: true,
        direction: getBonusDirection(crewTravelBonus),
        tooltip: (
          <TravelBonusTooltip
            bonus={crewTravelBonus}
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
        captain={captain}
        location={{ asteroid, lot }}
        crewAvailableTime={crewTimeRequirement}
        taskCompleteTime={taskTimeRequirement}
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

        {stage === actionStage.NOT_STARTED && (
          <ProgressBarSection
            overrides={{
              barColor: buildingType ? theme.colors.main : '#bbbbbb',
              color: buildingType ? '#ffffff' : undefined,
              left: `Site Timer`,
              right: formatTimer(Building.GRACE_PERIOD)
            }}
            stage={stage}
            title="Staging Time"
            tooltip={(
              <MouseoverWarning>
                <em>Building Sites</em> are used to stage materials before construction. If you are the <em>Lot Contoller</em>,
                any assets moved to the building site are protected for the duration of the <em>Site Timer</em>.
                <br/><br/>
                A site is designated as <b>Abandoned</b> if it has not started construction before the
                timer expires. Materials left on an <b>Abandoned Site</b> are public, and are thus subject to
                be claimed by other players!
                <br/><br/>
                If you are not the <em>Lot Contoller</em>, the <em>Lot Contoller</em> may takeover your Building Site and its
                materials at any time (even before the <em>Site Timer</em> elapses).
              </MouseoverWarning>
            )}
          />
        )}

        <LotControlWarning lot={lot} />

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />
      </ActionDialogBody>

      <ActionDialogFooter
        disabled={!buildingType}
        goLabel="Create Site"
        onGo={() => planConstruction(buildingType)}
        stage={stage}
        waitForCrewReady
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
      props.onSetAction('CONSTRUCT');
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
