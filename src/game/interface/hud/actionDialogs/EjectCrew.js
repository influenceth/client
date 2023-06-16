import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CoreSample, Asteroid, Extraction, Inventory } from '@influenceth/sdk';
import styled from 'styled-components';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { CoreSampleIcon, ExtractionIcon, InventoryIcon, LaunchShipIcon, LocationIcon, MyAssetIcon, ResourceIcon, RouteIcon, SetCourseIcon, ShipIcon, StationCrewIcon, StationPassengersIcon, WarningOutlineIcon } from '~/components/Icons';
import { useBuildingAssets, useResourceAssets, useShipAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useShip from '~/hooks/useShip';
import { formatFixed, formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import {
  ExtractionAmountSection,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogTabs,
  getBonusDirection,
  formatResourceVolume,
  formatSampleMass,
  formatSampleVolume,
  TravelBonusTooltip,
  TimeBonusTooltip,
  ActionDialogBody,
  FlexSection,
  FlexSectionInputBlock,
  EmptyResourceImage,
  FlexSectionSpacer,
  BuildingImage,
  EmptyBuildingImage,
  Section,
  SectionTitle,
  SectionBody,
  ProgressBarSection,
  CoreSampleSelectionDialog,
  DestinationSelectionDialog,
  SublabelBanner,
  AsteroidImage,
  ProgressBarNote,
  GenericSection,
  BarChart,
  PropellantSection,
  ShipImage,
  formatMass,
  MiniBarChart,
  MiniBarChartSection,
  ShipTab,
  CrewInputBlock,
  CrewOwnerBlock,
  SwayInput,
  CrewOwnerInner,
  SwayInputBlock,
  TransferDistanceDetails,
  TransferDistanceTitleDetails,
  ShipInputBlock
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, theming, useAsteroidAndLot } from '../ActionDialog';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import actionStages from '~/lib/actionStages';
import theme, { hexToRGB } from '~/theme';
import CrewCardFramed from '~/components/CrewCardFramed';
import useCrew from '~/hooks/useCrew';
import useCrewMember from '~/hooks/useCrewMember';

// TODO: should probably be able to select a ship (based on ships on that lot -- i.e. might have two ships in a spaceport)
//  - however, could you launch two ships at once? probably not because crew needs to be on ship?

const Warning = styled.div`
  align-items: center;
  background: rgba(${p => hexToRGB(p.theme.colors.orange)}, 0.3);
  color: ${p => p.theme.colors.orange};
  display: flex;
  flex-direction: row;
  padding: 10px;
  & > svg {
    font-size: 30px;
    margin-right: 12px;
  }
`;
const Note = styled.div`
  color: white;
  font-size: 95%;
  padding: 15px 10px 10px;
`;

const EjectCrew = ({ asteroid, lot, manager, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const buildings = useBuildingAssets();
  const ships = useShipAssets();
  
  const { currentStationing, stationingStatus, stationOnShip } = manager;

  const { data: dbShip } = useShip(1);
  const ship = { ...ships[0], ...(dbShip || {}) };

  const { crew, crewMemberMap } = useCrewContext();
  const { data: crewOriginLot } = useLot(asteroid?.i, currentStationing?.originLotId);
  const { data: ownerCrew } = useCrew(ship?.owner);
  
  const crewIsOwner = ship.owner === crew?.i;

  const crewMembers = currentStationing?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
  const launchBonus = 0;

  const transportDistance = Asteroid.getLotDistance(asteroid?.i, currentStationing?.originLotId, lot?.i) || 0;

  const stats = useMemo(() => ([
    {
      label: 'Travel Time',
      value: formatTimer(0),
      direction: 0,
      isTimeStat: true,
    },
    {
      label: 'Crewmates Stationed',
      value: `5`,
      direction: 0,
    },
  ]), []);

  const onStation = useCallback(() => {
    stationOnShip();
  }, []);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (['READY', 'READY_TO_FINISH', 'FINISHING'].includes(lastStatus.current)) {
      if (stationingStatus !== lastStatus.current) {
        console.log('on Close');
        props.onClose();
      }
    }
    lastStatus.current = stationingStatus;
  }, [stationingStatus]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: crewIsOwner ? <StationCrewIcon /> : <StationPassengersIcon />,
          label: crewIsOwner ? 'Station Flight Crew' : 'Station Passengers',
          status: stage === actionStages.NOT_STARTED ? `Send to ${crewIsOwner ? 'My ' : ''} Ship` : undefined,
        }}
        captain={captain}
        crewAvailableTime={0}
        overrideColor={stage === actionStages.NOT_STARTED ? (crewIsOwner ? theme.colors.main : theme.colors.green) : undefined}
        taskCompleteTime={0}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection>
          <FlexSectionInputBlock
            title="Origin"
            image={<BuildingImage building={buildings[crewOriginLot?.building?.capableType || 0]} />}
            label={`${buildings[crewOriginLot?.building?.capableType || 0].name}`}
            disabled={stage !== actionStages.NOT_STARTED}
            sublabel={`Lot #${crewOriginLot?.i || 1}`}
          />

          <FlexSectionSpacer />

          <ShipInputBlock
            disabled={stage !== actionStages.NOT_STARTED}
            title="Ship"
            titleDetails={
              ship?.status === 'IN_ORBIT' // TODO: not orbital transfer if in-orbit to in-orbit transfer
              ? <TransferDistanceTitleDetails><label>Orbital Transfer</label></TransferDistanceTitleDetails>
              : <TransferDistanceDetails distance={transportDistance} />
            }
            ship={ship}
            hasMyCrew
            isMine />
        </FlexSection>

        <FlexSection>
          <CrewInputBlock
            title={crewIsOwner ? 'Flight Crew' : 'Passengers'}
            crew={{ ...crew, members: crewMembers }} />

          <FlexSectionSpacer />

          <div style={{ alignSelf: 'flex-start', width: '50%' }}>
            {!crewIsOwner && <CrewOwnerInner crew={ownerCrew} isMe={crew?.i === ownerCrew?.i} />}
            <MiniBarChart
              color="#92278f"
              label="Crewmate Count"
              valueLabel={`7 / ${ship.maxPassengers}`}
              value={7 / ship.maxPassengers}
              deltaColor="#f644fa"
              deltaValue={crew?.crewMembers?.length / ship.maxPassengers}
            />
          </div>
        </FlexSection>

        {!crewIsOwner && (
          <FlexSection style={{ alignItems: 'flex-start' }}>
            <SwayInputBlock
              title="Sway Payment"
              instruction="OPTIONAL: Include with transfer" />

            <FlexSectionSpacer />

            <div style={{ width: '50%' }} />

          </FlexSection>
        )}

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={false/* TODO: no permission */}
        goLabel="Station"
        onGo={onStation}
        stage={stage}
        {...props} />
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  const { data: ship } = useShip();
  
  // TODO: ...
  // const extractionManager = useExtractionManager(asteroid?.i, lot?.i);
  // const { actionStage } = extractionManager;
  const manager = {};
  const actionStage = actionStages.NOT_STARTED;

  useEffect(() => {
    if (!asteroid || !lot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  return (
    <ActionDialogInner
      actionImage={travelBackground}
      asteroid={asteroid}
      isLoading={isLoading}
      lot={lot}
      onClose={props.onClose}
      overrideColor={actionStage === actionStages.NOT_STARTED && (props.passengers ? theme.colors.green : theme.colors.main)}
      ship={ship}
      stage={actionStage}>
      <EjectCrew
        asteroid={asteroid}
        lot={lot}
        manager={manager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
