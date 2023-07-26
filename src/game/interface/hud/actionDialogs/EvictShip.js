import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Building, Ship } from '@influenceth/sdk';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { CoreSampleIcon, ExtractionIcon, InventoryIcon, LaunchShipIcon, LocationIcon, ResourceIcon, RouteIcon, SetCourseIcon, ShipIcon, WarningOutlineIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useExtractionManager from '~/hooks/useExtractionManager';
import { formatFixed, formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import {
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogTabs,
  ActionDialogBody,
  FlexSection,
  FlexSectionInputBlock,
  FlexSectionSpacer,
  BuildingImage,
  ProgressBarSection,
  AsteroidImage,
  ProgressBarNote,
  PropellantSection,
  ShipTab,
  PropulsionTypeSection
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, theming, useAsteroidAndLot } from '../ActionDialog';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import actionStages from '~/lib/actionStages';
import theme from '~/theme';
import CrewCardFramed from '~/components/CrewCardFramed';
import formatters from '~/lib/formatters';

// TODO: should probably be able to select a ship (based on ships on that lot -- i.e. might have two ships in a spaceport)
//  - however, could you launch two ships at once? probably not because crew needs to be on ship?

const EvictShip = ({ asteroid, lot, manager, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  
  const { currentLaunch, launchStatus, startLaunch } = manager;

  const { crew, crewMemberMap } = useCrewContext();
  const { data: launchOriginLot } = useLot(asteroid?.i, currentLaunch?.originLotId);

  const [tab, setTab] = useState(0);
  const ship = Ship.TYPES[1];  // TODO

  const crewMembers = currentLaunch?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
  const launchBonus = 0;

  const stats = useMemo(() => ([
    {
      label: 'Propellant Used',
      value: `0 tonnes`,
      direction: 0
    },
    {
      label: 'Launch Time',
      value: formatTimer(0),
      direction: 0,
      isTimeStat: true,
    },
    {
      label: 'Delta-V Used',
      value: `1.712 m/s`,
      direction: 0,
    },
    {
      label: 'Max Acceleration',
      value: <>1.712 m/s<sup>2</sup></>,
      direction: 0,
    },
    {
      label: 'Wet Mass',
      value: `10,000 t`,
      direction: 0,
    },
    {
      label: 'Cargo Mass',
      value: `1,000 t`,
      direction: 0,
    },
    {
      label: 'Cargo Volume',
      value: <>1,000 m<sup>3</sup></>,
      direction: 0,
    },
    {
      label: 'Passengers',
      value: `5`,
      direction: 0,
    },
  ]), []);

  const onLaunch = useCallback(() => {
    startLaunch();
  }, []);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (['READY', 'READY_TO_FINISH', 'FINISHING'].includes(lastStatus.current)) {
      if (launchStatus !== lastStatus.current) {
        console.log('on Close');
        props.onClose();
      }
    }
    lastStatus.current = launchStatus;
  }, [launchStatus]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <LaunchShipIcon />,
          label: 'Force Launch Ship',
          status: stage === actionStages.NOT_STARTED ? 'Evict from my Spaceport' : undefined,
        }}
        captain={captain}
        location={{ asteroid, lot, ship }}
        crewAvailableTime={0}
        taskCompleteTime={0}
        onClose={props.onClose}
        overrideColor={stage === actionStages.NOT_STARTED ? theme.colors.error : undefined}
        stage={stage} />

      <ActionDialogBody>

        <ActionDialogTabs
          onSelect={setTab}
          selected={tab}
          tabs={[
            { icon: <RouteIcon />, label: 'Launch' },
            { icon: <ShipIcon />, label: 'Ship' },
          ]}
        />

        {tab === 0 && (
          <>
            <FlexSection>
              <FlexSectionInputBlock
                title="Origin"
                image={<BuildingImage building={Building.TYPES[lot?.building?.capableType || 0]} />}
                label={`${Building.TYPES[lot?.building?.capableType || 0].name}`}
                disabled={stage !== actionStages.NOT_STARTED}
                sublabel={`Lot #${lot?.i}`}
              />

              <FlexSectionSpacer />

              <FlexSectionInputBlock
                title="Destination"
                image={<AsteroidImage asteroid={asteroid} />}
                label={formatters.asteroidName(asteroid)}
                sublabel="Orbit"
              />
            </FlexSection>

            <FlexSection>
              <PropulsionTypeSection
                objectLabel="Launch"
                selected="tug"
                warning={`Evicted ships must use\nHopper-assisted launch.`} />

              <FlexSectionSpacer />

              <PropellantSection
                title="Propellant"
                deltaVLoaded={1500}
                deltaVRequired={0}
                propellantLoaded={840e3}
                propellantRequired={0}
                narrow
              />
            </FlexSection>

            {/* TODO: only need "port traffic" bar if launching from spaceport AND there is > 0 traffic (see also: landing) */}
            {stage === actionStages.NOT_STARTED && (
              <>
                <ProgressBarSection
                  overrides={{
                    barColor: theme.colors.lightOrange,
                    color: theme.colors.lightOrange,
                    left: <><WarningOutlineIcon /> Launch Delay</>,
                    right: formatTimer(2700)
                  }}
                  stage={stage}
                  title="Port Traffic"
                />
                <ProgressBarNote themeColor="lightOrange" style={{ marginBottom: 45 }}>
                  <b>6 ships</b> are queued to launch ahead of you.
                </ProgressBarNote>
              </>
            )}
          </>
        )}

        {tab === 1 && (
          <>
            <ShipTab
              pilotCrew={{ ...crew, members: crewMembers }}
              ship={ship}
              stage={stage} />

            {/* stats are on ship tab only in ship eviction per the mocks */}
            <ActionDialogStats
              stage={stage}
              stats={stats}
            />
          </>
        )}

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={false/* TODO: insufficient propellant + anything else? */}
        goLabel="Evict"
        onGo={onLaunch}
        stage={stage}
        {...props} />
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
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
      isLoading={isLoading}
      stage={actionStage}>
      <EvictShip
        asteroid={asteroid}
        lot={lot}
        manager={manager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
