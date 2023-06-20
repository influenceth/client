import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Capable, Extraction } from '@influenceth/sdk';
import styled from 'styled-components';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { CloseIcon, CoreSampleIcon, EjectPassengersIcon, EmergencyModeEnterIcon, EmergencyModeExitIcon, EmergencyModeGenerateIcon, ExtractionIcon, InventoryIcon, LaunchShipIcon, LocationIcon, MyAssetIcon, ResourceIcon, RouteIcon, SetCourseIcon, ShipIcon, StationCrewIcon, StationPassengersIcon, WarningOutlineIcon } from '~/components/Icons';
import { useBuildingAssets, useResourceAssets, useShipAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useShip from '~/hooks/useShip';
import { formatFixed, formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import {
  ResourceAmountSlider,
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
  ShipInputBlock,
  EmergencyPropellantSection
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
import useAsteroid from '~/hooks/useAsteroid';
import useAsteroidShips from '~/hooks/useAsteroidShips';
import useCrewMembers from '~/hooks/useCrewMembers';
import ResourceSelection from '~/components/ResourceSelection';

// TODO: should probably be able to select a ship (based on ships on that lot -- i.e. might have two ships in a spaceport)
//  - however, could you launch two ships at once? probably not because crew needs to be on ship?

const Warning = styled.div`
  align-items: center;
  background: rgba(${p => hexToRGB(p.theme.colors.red)}, 0.2);
  color: ${p => p.theme.colors.red};
  display: flex;
  flex-direction: row;
  font-size: 96%;
  padding: 10px;
  width: 100%;
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

const resourceId = 170;

const EmergencyModeGenerate = ({ asteroid, lot, manager, ship, stage, targetCrew, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const resources = useResourceAssets();
  const shipAssets = useShipAssets();
  
  const { currentStationing, stationingStatus, stationOnShip } = manager;

  const { crew, crewMemberMap } = useCrewContext();

  const crewMembers = currentStationing?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];

  const [amount, setAmount] = useState(0);

  const stats = useMemo(() => ([
    {
      label: 'Action Time',
      value: formatTimer(0),
      direction: 0,
      isTimeStat: true,
    },
    {
      label: 'Propellant Mass Jettisoned',
      value: 0,
      direction: 0,
    },
    {
      label: 'Propellant Volume Jettisoned',
      value: 0,
      direction: 0,
    },
    {
      label: 'Cargo Mass Jettisoned',
      value: 0,
      direction: 0,
    },
    {
      label: 'Cargo Volume Jettisoned',
      value: 0,
      direction: 0,
    },
  ]), [ship]);

  const currentPropellantMass = 0;
  const maxTonnageToGenerate = 0.1 * (shipAssets[ship?.type]?.maxPropellantMass - currentPropellantMass);
  const generationTime = Extraction.getExtractionTime( // TODO: ...
    amount,
    0,
    1
  );

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

  const actionDetails = useMemo(() => {
    const icon = ship?.inEmergencyMode ? <EmergencyModeExitIcon /> : <EmergencyModeEnterIcon />;
    const label = `${ship?.inEmergencyMode ? 'Exit' : 'Enter'} Emergency Mode`;
    const status = stage === actionStages.NOT_STARTED
      ? `${ship?.inEmergencyMode ? 'Restore' : 'Prepare'} Ship`
      : undefined;
    return { icon, label, status };
  }, [ship, stage]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <EmergencyModeGenerateIcon />,
          label: 'Emergency Generation',
          status: stage === actionStages.NOT_STARTED ? 'Generate Propellant' : undefined
        }}
        captain={captain}
        crewAvailableTime={0}
        location={{ asteroid, lot, ship }}
        onClose={props.onClose}
        overrideColor={stage === actionStages.NOT_STARTED ? theme.colors.orange : undefined}
        taskCompleteTime={0}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection>

          <FlexSectionInputBlock
            title="Propellant"
            image={<ResourceThumbnail resource={resources[resourceId]} tooltipContainer="none" />}
            label={(
              <>
                <div style={{ color: theme.colors.orange }}>EMERGENCY</div>
                {resources[resourceId].name}
              </>
            )}
            disabled={stage !== actionStages.NOT_STARTED}
            sublabel={`${formatSampleMass(1234)}t`}
            bodyStyle={{ backgroundColor: `rgba(${hexToRGB(theme.colors.orange)}, 0.2)` }}
          />

          <FlexSectionSpacer />

          <ShipInputBlock
            title="Ship"
            disabled={stage !== actionStages.NOT_STARTED}
            ship={ship}
            hasMyCrew
            isMine />

        </FlexSection>
          
        {stage === actionStages.NOT_STARTED && (
          <Section>
            <SectionTitle>Amount Generated</SectionTitle>
            <SectionBody style={{ paddingTop: 5 }}>
              <ResourceAmountSlider
                amount={amount || 0}
                extractionTime={generationTime || 0}
                min={0}
                max={maxTonnageToGenerate}
                resource={resources[resourceId]}
                setAmount={setAmount} />
            </SectionBody>
          </Section>
        )}

        <FlexSection style={{ marginBottom: -15 }}>
          <EmergencyPropellantSection
            title="Propellant"
            propellantPregeneration={0}
            propellantPostgeneration={0 + amount}
            propellantTankMax={shipAssets[ship?.type || 0].maxPropellantMass}
          />
        </FlexSection>

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={false/* TODO: no permission */}
        goLabel="Generate"
        onGo={onStation}
        stage={stage}
        {...props} />
    </>
  );
};

const Wrapper = (props) => {
  const { crew } = useCrewContext();

  const originAsteroid = useStore(s => s.asteroids.origin);
  const originLot = useStore(s => s.asteroids.lot || {});
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const asteroidId = props.guests ? originAsteroid : crew?.station?.asteroidId;
  const lotId = props.guests ? originLot?.lotId : crew?.station?.lotId;
  const shipId = props.guests ? (zoomScene?.type === 'SHIP' && zoomScene.shipId) : crew?.station?.shipId;

  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(asteroidId);
  const { data: lot, isLoading: lotIsLoading } = useLot(asteroidId, lotId);
  const { data: ship, isLoading: shipIsLoading } = useShip(shipId);

  const targetCrewId = props.guests ? ship?.stationedCrews.find((c) => c !== crew?.i) : crew?.i;
  const { data: targetCrew, isLoading: crewIsLoading } = useCrew(targetCrewId);
  const { data: targetCrewMembers, isLoading: targetCrewMembersLoading } = useCrewMembers(targetCrew?.crewMembers ? { ids: targetCrew?.crewMembers.join(',') } : []);

  // TODO: ...
  // const extractionManager = useExtractionManager(asteroid?.i, lot?.i);
  // const { actionStage } = extractionManager;
  const manager = {};
  const actionStage = actionStages.NOT_STARTED;

  const isLoading = asteroidIsLoading || lotIsLoading || shipIsLoading || crewIsLoading || targetCrewMembersLoading;
  useEffect(() => {
    if (!asteroid || (!lot && !ship)) {// || !targetCrew) { // TODO: restore this
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, ship, isLoading]);

  return (
    <ActionDialogInner
      actionImage={travelBackground}
      isLoading={isLoading}
      stage={actionStage}>
      <EmergencyModeGenerate
        asteroid={asteroid}
        lot={lot}
        ship={ship}
        targetCrew={{ ...targetCrew, crewMembers: targetCrewMembers }}
        manager={manager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
