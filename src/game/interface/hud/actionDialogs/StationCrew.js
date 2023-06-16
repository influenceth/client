import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CoreSample, Asteroid, Extraction, Inventory } from '@influenceth/sdk';
import styled from 'styled-components';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { CoreSampleIcon, ExtractionIcon, InventoryIcon, LaunchShipIcon, LocationIcon, ResourceIcon, RouteIcon, SetCourseIcon, ShipIcon, StationCrewIcon, StationPassengersIcon, WarningOutlineIcon } from '~/components/Icons';
import { useBuildingAssets, useResourceAssets, useShipAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useExtractionManager from '~/hooks/useExtractionManager';
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
import useShip from '~/hooks/useShip';

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

// TODO: this is copied from StationOnShip, we can/should potentially provide them

const StationOnShip = ({ asteroid, lot, manager, ship, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const buildings = useBuildingAssets();
  
  const { currentStationing, stationingStatus, stationOnShip } = manager;

  const { crew, crewMemberMap } = useCrewContext();
  const { data: crewOriginLot } = useLot(asteroid?.i, currentStationing?.originLotId);
  const { data: ownerCrew } = useCrew(ship?.owner);
  
  const crewIsOwner = ship.owner === crew?.i;

  const crewMembers = currentStationing?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
  const launchBonus = 0;

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
        }}
        captain={captain}
        crewAvailableTime={0}
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
            title="ship"
            disabled={stage !== actionStages.NOT_STARTED}
            ship={ship}
            hasMyCrew
            isMine />
        </FlexSection>

        <FlexSection>
          <CrewInputBlock title="Station Crew" crew={{ ...crew, members: crewMembers }} />

          <FlexSectionSpacer />

          <CrewOwnerBlock title="Ship Owner" crew={ownerCrew} isMe={crew?.i === ownerCrew?.i} />
        </FlexSection>

        <FlexSection style={{ alignItems: 'flex-start' }}>
          <FlexSectionInputBlock
            title="Crew Manifest"
            bodyStyle={{ background: 'transparent' }}>
            <MiniBarChart
              color="#92278f"
              label="Passengers"
              valueLabel={`7 / ${ship.maxPassengers}`}
              value={7 / ship.maxPassengers}
              deltaColor="#f644fa"
              deltaValue={2 / ship.maxPassengers}
            />
          </FlexSectionInputBlock>

          <FlexSectionSpacer />

          <div style={{ alignSelf: 'flex-start', width: '50%' }}>
            {(true || crew?.i !== ownerCrew?.i) && (
              <>
                <Warning>
                  <WarningOutlineIcon />
                  <span>The selected ship is owned by another player.</span>
                </Warning>
                <Note>
                  [OPTIONAL] Include a SWAY payment to the owner with transfer:
                </Note>
                <SwayInput />
              </>
            )}
          </div>

        </FlexSection>

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
      ship={ship}
      stage={actionStage}>
      <StationOnShip
        asteroid={asteroid}
        lot={lot}
        manager={manager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
