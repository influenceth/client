import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Ship } from '@influenceth/sdk';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { CloseIcon, EmergencyModeEnterIcon, EmergencyModeExitIcon, WarningOutlineIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useShip from '~/hooks/useShip';
import { reactBool, formatTimer } from '~/lib/utils';

import {
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogBody,
  ShipTab,
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import useShipCrews from '~/hooks/useShipCrews';
import actionStages from '~/lib/actionStages';
import theme, { hexToRGB } from '~/theme';
import { ActionDialogInner } from '../ActionDialog';

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

const EmergencyModeToggle = ({ asteroid, lot, manager, ship, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  
  const { currentStationing, stationingStatus, stationOnShip } = manager;

  const { crew, crewmateMap } = useCrewContext();

  const shipCrews = useShipCrews(ship?.i);
  const shipPassengerCrews = useMemo(() => {
    return shipCrews.filter((c) => c.i !== crew?.i);
  }, [shipCrews]);

  const crewmates = currentStationing?._crewmates || (crew?._crewmates || []).map((i) => crewmateMap[i]);
  const captain = crewmates[0];

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

  const inEmergencyMode = ship?.Ship?.operatingMode === Ship.MODES.EMERGENCY;

  const actionDetails = useMemo(() => {
    const icon = inEmergencyMode ? <EmergencyModeExitIcon /> : <EmergencyModeEnterIcon />;
    const label = `${inEmergencyMode ? 'Exit' : 'Enter'} Emergency Mode`;
    const status = stage === actionStages.NOT_STARTED
      ? `${inEmergencyMode ? 'Restore' : 'Prepare'} Ship`
      : undefined;
    return { icon, label, status };
  }, [ship, stage]);

  const warnings = useMemo(() => {
    const w = [];
    if (inEmergencyMode) {
      w.push({
        icon: <WarningOutlineIcon />,
        text: `WARNING: A ship must jettison up to 10% of its propellant when exiting Emergency Mode.`
      });
    } else {
      w.push({
        icon: <WarningOutlineIcon />,
        text: `WARNING: All cargo in the ship's cargo hold will be jettisoned. This action is irreversible.`
      });
      if (shipPassengerCrews.length > 0) {
        w.push({
          icon: <CloseIcon />,
          text: 'All passengers must be ejected before the ship can enter Emergency Mode.'
        });
      }
    }
    
    return w;
  }, [ship, shipPassengerCrews]);

  return (
    <>
      <ActionDialogHeader
        action={actionDetails}
        captain={captain}
        crewAvailableTime={0}
        location={{ asteroid, lot, ship }}
        onClose={props.onClose}
        overrideColor={stage === actionStages.NOT_STARTED ? theme.colors.orange : undefined}
        taskCompleteTime={0}
        stage={stage} />

      <ActionDialogBody>
        {/* TODO: set cargo's to zero and make sure delta is shown */}
        <ShipTab
          pilotCrew={{ ...crew, roster: crewmates }}
          ship={ship}
          stage={stage}
          warnings={warnings} />

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={!inEmergencyMode && shipPassengerCrews?.length > 0/* TODO: no permission */}
        goLabel={inEmergencyMode ? 'Restore' : 'Prepare'}
        onGo={onStation}
        stage={stage}
        {...props} />
    </>
  );
};

const Wrapper = (props) => {
  const { crew } = useCrewContext();

  const asteroidId = crew?._location?.asteroidId;
  const lotId = crew?._location?.lotId;
  const shipId = crew?._location?.shipId;

  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(asteroidId);
  const { data: lot, isLoading: lotIsLoading } = useLot(asteroidId, lotId);
  const { data: ship, isLoading: shipIsLoading } = useShip(shipId);

  // TODO: ...
  // const extractionManager = useExtractionManager(asteroid?.i, lot?.i);
  // const { actionStage } = extractionManager;
  const manager = {};
  const actionStage = actionStages.NOT_STARTED;

  const isLoading = asteroidIsLoading || lotIsLoading || shipIsLoading;
  useEffect(() => {
    if (!asteroid || (!lot && !ship)) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, ship, isLoading]);

  return (
    <ActionDialogInner
      actionImage={travelBackground}
      isLoading={reactBool(isLoading)}
      stage={actionStage}>
      <EmergencyModeToggle
        asteroid={asteroid}
        lot={lot}
        ship={ship}
        manager={manager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
