import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Building, Crew, Crewmate, Product } from '@influenceth/sdk';

import constructionBackground from '~/assets/images/modal_headers/Construction.png';
import {
  PlanBuildingIcon,
  WarningOutlineIcon
} from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import theme from '~/theme';
import useConstructionManager from '~/hooks/useConstructionManager';
import { boolAttr, formatTimer } from '~/lib/utils';

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
  getBuildingRequirements
} from './components';
import actionStage from '~/lib/actionStages';

const MouseoverWarning = styled.span`
  & b { color: ${theme.colors.error}; }
`;

const PlanBuilding = ({ asteroid, lot, constructionManager, stage, ...props }) => {
  const { currentConstruction, planConstruction } = constructionManager;
  const { captain, crew, crewmateMap } = useCrewContext();

  const [buildingType, setBuildingType] = useState();

  const crewTravelTime = useMemo(() => 0, []);  // TODO: ...
  const taskTime = useMemo(() => 0, []);
  const stats = useMemo(() => {
    if (!asteroid?.i || !lot?.i) return [];
    const crewmates = (crew?.crewmates || []).map((i) => crewmateMap[i]);
    const crewTravelBonus = Crew.getAbilityBonus(Crewmate.ABILITY_IDS.SURFACE_TRANSPORT_SPEED, crewmates);
    const tripDetails = []; // TODO: 
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
  }, [crew?.crewmates]);

  useEffect(() => {
    if (currentConstruction?.buildingType) setBuildingType(currentConstruction.buildingType)
  }, [currentConstruction?.buildingType]);

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
        crewAvailableTime={crewTravelTime}
        onClose={props.onClose}
        taskCompleteTime={crewTravelTime + taskTime}
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
            label="Required for Construction"
            mode="display"
            requirements={buildingRequirements} />
        )}

        {/* TODO: if crew travel becomes part of planning, will need to configure this */}
        {stage === actionStage.NOT_STARTED && (
          <ProgressBarSection
            overrides={{
              barColor: buildingType ? theme.colors.lightOrange : '#bbbbbb',
              color: buildingType ? theme.colors.lightOrange : undefined,
              left: <><WarningOutlineIcon /> Site Timer</>,
              right: formatTimer(Building.GRACE_PERIOD)
            }}
            stage={stage}
            title="Lot Reservation"
            tooltip={(
              <MouseoverWarning>
                Building Sites are used to stage materials before construction. While the{' '}<b>Site Timer</b> 
                {' '}is active, any assets moved to the building site are protected. However, a site becomes 
                {' '}<b>Abandoned</b>{' '}if it has not started construction when the time expires.
                <br/><br/>
                Warning: Any materials on an{' '}<b>Abandoned Site</b>{' '}become public, and are subject to be
                claimed by other players!
              </MouseoverWarning>
            )}
          />
        )}

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
  const constructionManager = useConstructionManager(asteroid?.i, lot?.i);
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
      actionImage={constructionBackground}
      isLoading={boolAttr(isLoading)}
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
