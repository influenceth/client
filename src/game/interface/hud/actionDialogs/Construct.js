import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
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
  WarningOutlineIcon,
  TransferToSiteIcon
} from '~/components/Icons';
import Poppable from '~/components/Popper';
import SliderInput from '~/components/SliderInput';
import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import { useBuildingAssets, useResourceAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import theme, { hexToRGB } from '~/theme';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import useConstructionManager from '~/hooks/useConstructionManager';
import useInterval from '~/hooks/useInterval';
import { formatTimer, getCrewAbilityBonus } from '~/lib/utils';

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
  ActionDialogStats,
  ActionDialogTimers,

  ConstructionBonusTooltip,
  TravelBonusTooltip,

  getBonusDirection,
  getTripDetails,
  TimeBonusTooltip,
  ActionDialogLoader,
  ActionDialogBody,
  FlexSection,
  FlexSectionInputBlock,
  BuildingImage,
  FlexSectionSpacer,
  ProgressBarSection,
  MouseoverContent,
  getBuildingRequirements,
} from './components';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStage from '~/lib/actionStages';
import ActionButtonComponent from '../actionButtons/ActionButton';

const MouseoverWarning = styled.span`
  & b { color: ${theme.colors.error}; }
`;

const TransferToSite = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  font-size: 18px;
  height: 100%;
  padding-left: 10px;
  & > label {
    color: ${p => p.theme.colors.orange};
    padding-left: 4px;
  }
`;

const Construct = ({ asteroid, lot, constructionManager, stage, ...props }) => {
  const buildings = useBuildingAssets();
  const resources = useResourceAssets();
  const { crew, crewMemberMap } = useCrewContext();
  const { currentConstruction, constructionStatus, startConstruction, finishConstruction } = constructionManager;

  const crewMembers = currentConstruction?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
  const constructionBonus = getCrewAbilityBonus(5, crewMembers);

  // TODO: ...
  // const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
  //   if (!asteroid?.i || !lot?.i) return {};
  //   return getTripDetails(asteroid.i, crewTravelBonus.totalBonus, 1, [
  //     { label: 'Travel to destination', lot: lot.i },
  //     { label: 'Return from destination', lot: 1 },
  //   ])
  // }, [asteroid?.i, lot?.i, crewTravelBonus]);
  const crewTravelTime = 0;
  const tripDetails = null;

  const constructionTime = useMemo(() =>
    lot?.building?.capableType ? Construction.getConstructionTime(lot?.building?.capableType, constructionBonus.totalBonus) : 0,
    [lot?.building?.capableType, constructionBonus.totalBonus]
  );

  const stats = useMemo(() => ([
    {
      label: 'Crew Travel',
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
      label: 'Construction Time',
      value: formatTimer(constructionTime),
      isTimeStat: true,
      direction: getBonusDirection(constructionBonus),
      tooltip: constructionBonus.totalBonus !== 1 && (
        <TimeBonusTooltip
          bonus={constructionBonus}
          title="Construction Time"
          totalTime={constructionTime}
          crewRequired="start" />
      )
    },
  ]), [constructionBonus, constructionTime, crewTravelTime, crewTravelBonus, tripDetails]);

  const status = useMemo(() => {
    if (constructionStatus === 'PLANNED') {
      return 'BEFORE';
    } else if (constructionStatus === 'UNDER_CONSTRUCTION') {
      return 'DURING';
    }
    return 'AFTER';
  }, [constructionStatus]);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (always close on)
    if (['OPERATIONAL'].includes(constructionStatus)) {
      props.onClose();
    }
    // (close on status change from)
    else if (['PLANNED', 'READY_TO_FINISH'].includes(lastStatus.current)) {
      if (constructionStatus !== lastStatus.current) {
        props.onClose();
      }
    }
    lastStatus.current = constructionStatus;
  }, [constructionStatus]);

  const transferToSite = useCallback(() => {
    props.onSetAction('TRANSFER_TO_SITE', {});  // TODO: 
  }, []);

  const [buildingRequirements, requirementsMet, waitingOnTransfer] = useMemo(() => {
    const reqs = getBuildingRequirements(lot?.building);
    const met = !reqs.find((req) => req.inNeed > 0);
    const wait = reqs.find((req) => req.inTransit > 0);
    return [reqs, met, wait];
  }, [lot?.building]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <ConstructIcon />,
          label: 'Construct Building',
        }}
        captain={captain}
        crewAvailableTime={crewTravelTime}
        taskCompleteTime={constructionTime}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection>
          <FlexSectionInputBlock
            title="Building"
            image={(
              <BuildingImage
                building={buildings[lot?.building?.capableType]}
                iconOverlay={requirementsMet ? null : <span style={{ color: theme.colors.lightOrange, fontSize: '36px', lineHeight: '30px' }}><WarningOutlineIcon /></span>} />
            )}
            label={buildings[lot?.building?.capableType].name}
            bodyStyle={requirementsMet ? {} : { background: `rgba(${hexToRGB(theme.colors.lightOrange)}, 0.15)` }}
            sublabel="Building"
            tooltip={(
              <>
                This site is missing construction materials. Use <b>Transfer Materials to Site</b> to transfer
                all required materials to the site before construction can begin.
              </>
            )}
          />
          
          {!requirementsMet && (
            <>
              <FlexSectionSpacer />

              <FlexSectionInputBlock
                bodyStyle={{ borderColor: '#333', background: 'transparent' }}
                isSelected
                onClick={transferToSite}>
                <TransferToSite>
                  <ActionButtonComponent icon={<TransferToSiteIcon />} style={{ pointerEvents: 'none' }} />
                  <label>
                    Transfer Materials<br/>
                    To Site
                  </label>
                </TransferToSite>
              </FlexSectionInputBlock>
            </>
          )}
        </FlexSection>

        {stage === actionStage.NOT_STARTED && (
          <BuildingRequirementsSection
            label="Construction Requirements"
            mode="gathering"
            requirementsMet={requirementsMet && !waitingOnTransfer}
            requirements={buildingRequirements}
            resources={resources} />
        )}

        {stage === actionStage.NOT_STARTED && (
          <ProgressBarSection
            completionTime={lot?.gracePeriodEnd}
            startTime={lot?.gracePeriodEnd - Lot.GRACE_PERIOD}
            isCountDown
            overrides={{
              barColor: requirementsMet ? theme.colors.main : theme.colors.lightOrange,
              color: 'white',
              left: <span style={{ display: 'flex', alignItems: 'center' }}><WarningOutlineIcon /> <span style={{ marginLeft: 6 }}>Site Timer</span></span>,
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
        disabled={!requirementsMet || waitingOnTransfer}
        goLabel="Construct"
        onGo={startConstruction}
        finalizeLabel="Complete"
        onFinalize={finishConstruction}
        stage={stage}
        {...props} />
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
      stage={stageByActivity.construct}>
      <Construct
        asteroid={asteroid}
        lot={lot}
        constructionManager={constructionManager}
        stage={stageByActivity.construct}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
