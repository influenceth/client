import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Inventory, Product, Ship } from '@influenceth/sdk';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { EmergencyModeGenerateIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useShip from '~/hooks/useShip';
import { reactBool, formatTimer } from '~/lib/utils';

import {
  ResourceAmountSlider,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogBody,
  FlexSection,
  FlexSectionInputBlock,
  FlexSectionSpacer,
  Section,
  SectionTitle,
  SectionBody,
  formatMass,
  ShipInputBlock,
  EmergencyPropellantSection
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner } from '../ActionDialog';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import actionStages from '~/lib/actionStages';
import theme, { hexToRGB } from '~/theme';
import useAsteroid from '~/hooks/useAsteroid';

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

const EmergencyModeGenerate = ({ asteroid, lot, manager, ship, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  
  const { currentStationing, stationingStatus, stationOnShip } = manager;

  const { crew, crewmateMap } = useCrewContext();

  const crewmates = currentStationing?._crewmates || (crew?._crewmates || []).map((i) => crewmateMap[i]);
  const captain = crewmates[0];

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

  const propellantInventory = ship.Inventories.find((i) => i.slot === Ship.TYPES[ship.Ship.shipType].propellantSlot);
  const maxEmergencyPropellant = 0.1 * Inventory.TYPES[propellantInventory?.inventoryType]?.massConstraint;
  const maxTonnageToGenerate = (maxEmergencyPropellant - propellantInventory.mass) / 1e6;
  const generationTime = 1000;

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
            image={<ResourceThumbnail resource={Product.TYPES[resourceId]} tooltipContainer="none" />}
            label={(
              <>
                <div style={{ color: theme.colors.orange }}>EMERGENCY</div>
                {Product.TYPES[resourceId].name}
              </>
            )}
            disabled={stage !== actionStages.NOT_STARTED}
            sublabel={`${formatMass(propellantInventory.mass)}t`}
            bodyStyle={{ backgroundColor: `rgba(${hexToRGB(theme.colors.orange)}, 0.2)` }}
          />

          <FlexSectionSpacer />

          <ShipInputBlock
            title="Ship"
            disabled={stage !== actionStages.NOT_STARTED}
            ship={ship} />

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
                resource={Product.TYPES[resourceId]}
                setAmount={setAmount} />
            </SectionBody>
          </Section>
        )}

        <FlexSection style={{ marginBottom: -15 }}>
          <EmergencyPropellantSection
            title="Propellant"
            propellantPregeneration={propellantInventory.mass}
            propellantPostgeneration={propellantInventory.mass + amount}
            propellantTankMax={maxEmergencyPropellant}
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
      <EmergencyModeGenerate
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
