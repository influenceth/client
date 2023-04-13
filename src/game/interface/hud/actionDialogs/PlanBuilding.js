import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  FiCrosshair as TargetIcon,
  FiSquare as UncheckedIcon,
  FiCheckSquare as CheckedIcon
} from 'react-icons/fi';
import { RingLoader } from 'react-spinners';
import DataTable, { createTheme } from 'react-data-table-component';
import { Crew, Asteroid, Construction, Lot } from '@influenceth/sdk';

import constructionBackground from '~/assets/images/modal_headers/Construction.png';
import coreSampleBackground from '~/assets/images/modal_headers/CoreSample.png';
import extractionBackground from '~/assets/images/modal_headers/Extraction.png';
import surfaceTransferBackground from '~/assets/images/modal_headers/SurfaceTransfer.png';
import Button from '~/components/ButtonAlt';
import ButtonRounded from '~/components/ButtonRounded';
import Dialog from '~/components/Dialog';
import Dropdown from '~/components/Dropdown';
import IconButton from '~/components/IconButton';
import {
  UnplanBuildingIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  ConstructIcon,
  NewCoreSampleIcon,
  CrewIcon,
  DeconstructIcon,
  ExtractionIcon,
  ImproveCoreSampleIcon,
  PlanBuildingIcon,
  LocationIcon,
  PlusIcon,
  ResourceIcon,
  SurfaceTransferIcon,
  TimerIcon,
  WarningOutlineIcon
} from '~/components/Icons';
// import Poppable, { PoppableContent } from '~/components/Popper';
import SliderInput from '~/components/SliderInput';
import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import { useBuildingAssets, useResourceAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import useConstructionManager from '~/hooks/useConstructionManager';
import useInterval from '~/hooks/useInterval';
import { formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import { ActionDialogInner, Modal, ModalInner, theming, useAsteroidAndLot } from '../ActionDialog';
import {
  CoreSampleSelection,
  DestinationSelection,

  BuildingPlanSection,
  BuildingRequirementsSection,
  DeconstructionMaterialsSection,
  DestinationLotSection,
  ExistingSampleSection,
  ExtractionAmountSection,
  ExtractSampleSection,
  ItemSelectionSection,
  RawMaterialSection,
  ToolSection,

  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogLoader,
  ActionDialogStats,
  ActionDialogTimers,

  getBonusDirection,
  FlexSection,
  FlexSectionInputBlock,
  BuildingPlanSelection,
  BuildingImage,
  EmptyBuildingImage,
  SelectionPopper,
  SelectionDialog,
  SitePlanSelectionDialog,
  ProgressBarSection,
  TravelBonusTooltip,
  ActionDialogBody
} from './components';
import useAsteroid from '~/hooks/useAsteroid';
import { usePopper } from 'react-popper';
import { createPortal } from 'react-dom';
import actionStage from '~/lib/actionStages';

const MouseoverWarning = styled.span`
  & b { color: ${theme.colors.error}; }
`;

const PlanBuilding = ({ asteroid, lot, constructionManager, stage, ...props }) => {
  const buildings = useBuildingAssets();
  const resources = useResourceAssets();
  const { currentConstruction, planConstruction } = constructionManager;
  const { captain, crew, crewMemberMap } = useCrewContext();

  const [capableType, setCapableType] = useState();

  const crewTravelTime = useMemo(() => 0, []);  // TODO: ...
  const taskTime = useMemo(() => 0, []);
  const stats = useMemo(() => {
    if (!asteroid?.i || !lot?.i) return [];
    const crewMembers = (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
    const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
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
  }, [crew?.crewMembers]);

  useEffect(() => {
    if (currentConstruction?.capableType) setCapableType(currentConstruction.capableType)
  }, [currentConstruction?.capableType]);

  const [siteSelectorOpen, setSiteSelectorOpen] = useState();
  const onBuildingSelected = (type) => {
    setCapableType(type);
    setSiteSelectorOpen();
  }

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <PlanBuildingIcon />,
          label: 'Create Building Site',
        }}
        captain={captain}
        crewAvailableTime={crewTravelTime}
        taskCompleteTime={crewTravelTime + taskTime}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection>
          <FlexSectionInputBlock
            title="Building Site"
            image={
              capableType
                ? <BuildingImage building={buildings[capableType]} unfinished />
                : <EmptyBuildingImage iconOverride={<PlanBuildingIcon />} />
            }
            isSelected={stage === actionStage.NOT_STARTED}
            label={capableType ? buildings[capableType].name : 'Select'}
            onClick={() => setSiteSelectorOpen(true)}
            disabled={stage !== actionStage.NOT_STARTED}
            sublabel="Site"
          />
        </FlexSection>

        {capableType && stage === actionStage.NOT_STARTED && (
          <BuildingRequirementsSection
            building={buildings[capableType]}
            label="Required for Construction"
            resources={resources} />
        )}

        {/* TODO: if crew travel becomes part of planning, will need to configure this */}
        {stage === actionStage.NOT_STARTED && (
          <ProgressBarSection
            overrides={{
              barColor: capableType ? theme.colors.lightOrange : '#bbbbbb',
              color: capableType ? theme.colors.lightOrange : undefined,
              left: <><WarningOutlineIcon /> Site Timer</>,
              right: formatTimer(Lot.GRACE_PERIOD)
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
        disabled={!capableType}
        goLabel="Create Site"
        onGo={() => planConstruction(capableType)}
        stage={stage}
        {...props} />

      {stage === actionStage.NOT_STARTED && (
        <SitePlanSelectionDialog
          initialSelection={capableType}
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
      asteroid={asteroid}
      isLoading={isLoading}
      lot={lot}
      onClose={props.onClose}
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
