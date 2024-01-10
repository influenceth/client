import { useCallback, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { Building, Crewmate, Lot, Time } from '@influenceth/sdk';

import constructionBackground from '~/assets/images/modal_headers/Construction.png';
import {
  ConstructIcon, WarningOutlineIcon,
  TransferToSiteIcon
} from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import theme, { hexToRGB } from '~/theme';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import { reactBool, formatTimer, getCrewAbilityBonuses } from '~/lib/utils';

import {
  BuildingRequirementsSection,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  TravelBonusTooltip,
  getBonusDirection,
  TimeBonusTooltip,
  ActionDialogBody,
  FlexSection,
  FlexSectionInputBlock,
  FlexSectionSpacer,
  ProgressBarSection,
  getBuildingRequirements,
  LotInputBlock,
  getTripDetails
} from './components';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStage from '~/lib/actionStages';
import ActionButtonComponent from '../actionButtons/ActionButton';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';

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
  const { crew, crewmateMap } = useCrewContext();
  const { currentConstructionAction, constructionStatus, startConstruction, finishConstruction } = constructionManager;
  const { currentDeliveryActions } = useDeliveryManager({ destination: lot.building });

  const crewmates = currentConstructionAction?._crewmates || (crew?._crewmates || []).map((i) => crewmateMap[i]);
  const captain = crewmates[0];

  const [crewTravelBonus, constructionBonus] = useMemo(() => {
    const bonusIds = [Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, Crewmate.ABILITY_IDS.CONSTRUCTION_TIME];
    const abilities = getCrewAbilityBonuses(bonusIds, crew);
    return bonusIds.map((id) => abilities[id] || {});
  }, [crew]);

  const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
    if (!asteroid?.id || !crew?._location?.lotId || !lot?.id) return {};
    const crewLotIndex = crew?._location?.asteroidId === asteroid.id ? Lot.toIndex(crew?._location?.lotId) : 0;
    return getTripDetails(asteroid.id, crewTravelBonus, crewLotIndex, [
      { label: 'Travel to Construction Site', lotIndex: Lot.toIndex(lot.id) },
      { label: 'Return to Crew Station', lotIndex: crewLotIndex },
    ], crew?._timeAcceleration);
  }, [asteroid?.id, lot?.id, crew?._location?.lotId, crew?._timeAcceleration, crewTravelBonus]);

  const constructionTime = useMemo(() =>
    Time.toRealDuration(
      lot?.building?.Building?.buildingType
        ? Building.getConstructionTime(lot?.building?.Building?.buildingType, constructionBonus.totalBonus)
        : 0,
      crew?._timeAcceleration
    ),
    [lot?.building?.Building?.buildingType, constructionBonus.totalBonus, crew?._timeAcceleration]
  );

  const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => {
    return [
      crewTravelTime + constructionTime / 5,
      crewTravelTime / 2 + constructionTime
    ];
  }, [crewTravelTime, constructionTime]);

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
    props.onSetAction('TRANSFER_TO_SITE', {});
  }, []);

  const [buildingRequirements, requirementsMet, waitingOnTransfer] = useMemo(() => {
    const reqs = getBuildingRequirements(lot?.building, constructionStatus === 'PLANNED' ? currentDeliveryActions : []);
    const met = !reqs.find((req) => req.inNeed > 0);
    const wait = reqs.find((req) => req.inTransit > 0);
    return [reqs, constructionStatus === 'PLANNED' ? met : true, wait];
  }, [lot?.building, constructionStatus, currentDeliveryActions]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <ConstructIcon />,
          label: 'Construct Building',
        }}
        captain={captain}
        location={{ asteroid, lot }}
        crewAvailableTime={crewTimeRequirement}
        taskCompleteTime={taskTimeRequirement}
        onClose={props.onClose}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection>
          <LotInputBlock
            lot={lot}
            fallbackSublabel="Building"
            imageProps={{
              iconOverlay: requirementsMet ? null : <WarningOutlineIcon />,
              iconOverlayColor: theme.colors.lightOrange,
            }}
            bodyStyle={requirementsMet ? {} : { background: `rgba(${hexToRGB(theme.colors.lightOrange)}, 0.15)` }}
            tooltip={!requirementsMet && (
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
            requirements={buildingRequirements} />
        )}

        {stage === actionStage.NOT_STARTED && (
          <ProgressBarSection
            finishTime={lot?.building?.Building?.plannedAt + Building.GRACE_PERIOD}
            startTime={lot?.building?.Building?.plannedAt}
            isCountDown
            overrides={{
              barColor: theme.colors.lightOrange,
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
        {stage !== actionStage.NOT_STARTED && (
          <ProgressBarSection
            finishTime={currentConstructionAction?.finishTime}
            startTime={currentConstructionAction?.startTime}
            stage={stage}
            title="Progress"
            totalTime={crewTravelTime + constructionTime}
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
        waitForCrewReady
        {...props} />
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

  return (
    <ActionDialogInner
      actionImage={constructionBackground}
      isLoading={reactBool(isLoading)}
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
