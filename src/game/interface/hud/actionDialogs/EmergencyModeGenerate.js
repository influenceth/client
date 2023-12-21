import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Inventory, Product, Ship, Time } from '@influenceth/sdk';

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
  EmergencyPropellantSection,
  ProgressBarSection,
  formatResourceMass,
  formatResourceVolume
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner } from '../ActionDialog';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import actionStages from '~/lib/actionStages';
import theme, { hexToRGB } from '~/theme';
import useAsteroid from '~/hooks/useAsteroid';
import useInterval from '~/hooks/useInterval';
import useShipEmergencyManager from '~/hooks/actionManagers/useShipEmergencyManager';
import useChainTime from '~/hooks/useChainTime';

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

const EMERGENCY_PROP_GEN_TIME = 10368000; // in-game seconds to generate 10% of tank from 0
const getEmergencyPropellantAmount = (generationTime, propellantInvType, startingAmount, resourceId = Product.IDS.HYDROGEN_PROPELLANT) => {
  const maxEmergencyPropellantAmount = 0.1 * Inventory.TYPES[propellantInvType].massConstraint / Product.TYPES[resourceId].massPerUnit;
  const generationRate = maxEmergencyPropellantAmount / EMERGENCY_PROP_GEN_TIME;
  const uncappedGenerationAmount = generationRate * generationTime;
  return Math.min(maxEmergencyPropellantAmount, startingAmount + uncappedGenerationAmount);
};

const getTimeUntilEmergencyPropellantFull = (propellantInvType, startingAmount, resourceId = Product.IDS.HYDROGEN_PROPELLANT) => {
  const maxEmergencyPropellantAmount = 0.1 * Inventory.TYPES[propellantInvType].massConstraint / Product.TYPES[resourceId].massPerUnit;
  const maxAmountCanGenerate = maxEmergencyPropellantAmount - startingAmount;
  const generationRate = maxEmergencyPropellantAmount / EMERGENCY_PROP_GEN_TIME;
  return maxAmountCanGenerate / generationRate;
};


const EmergencyModeGenerate = ({ asteroid, lot, manager, ship, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const chainTime = useChainTime();
  
  const { collectEmergencyPropellant, actionStage } = manager;

  const { crew } = useCrewContext();

  const crewmates = crew?._crewmates || [];
  const captain = crewmates[0];

  const resourceId = Product.IDS.HYDROGEN_PROPELLANT;

  const propellantInventory = ship.Inventories.find((i) => i.slot === Ship.TYPES[ship.Ship.shipType].propellantSlot);
  const propellantInventoryConfig = Inventory.TYPES[propellantInventory.inventoryType];
  const startingAmount = propellantInventory.mass / Product.TYPES[resourceId].massPerUnit;
  const maxTankAmount = propellantInventoryConfig.massConstraint / Product.TYPES[resourceId].massPerUnit;
  const maxEmergencyAmount = 0.1 * maxTankAmount;

  const [collectableAmount, setCollectableAmount] = useState(0);
  const recalculateCollectableAmount = useCallback(() => {
    setCollectableAmount(
      Math.floor(
        getEmergencyPropellantAmount(
          Time.toGameDuration(Date.now() / 1000 - ship?.Ship?.emergencyAt, crew?._timeAcceleration),
          propellantInventory.inventoryType,
          startingAmount
        ) - startingAmount
      )
    );
  }, [crew?._timeAcceleration, ship?.Ship?.emergencyAt, propellantInventory, startingAmount]);

  useEffect(() => {
    recalculateCollectableAmount();
    const i = setInterval(recalculateCollectableAmount, 1000);
    return () => clearInterval(i);
  }, [recalculateCollectableAmount]);

  const totalAmount = startingAmount + collectableAmount;
  const totalEmergencyFraction = totalAmount / maxEmergencyAmount;
  const totalTankFraction = totalAmount / maxTankAmount;

  // console.log({ totalAmount, totalEmergencyFraction, totalTankFraction });

  const maxGenerationTime = useMemo(() => {
    // console.log(propellantInventory.inventoryType, propellantInventory.mass, Product.TYPES[resourceId].massPerUnit)
    return Time.toRealDuration(
      getTimeUntilEmergencyPropellantFull(
        propellantInventory.inventoryType,
        propellantInventory.mass / Product.TYPES[resourceId].massPerUnit
      ),
      crew?._timeAcceleration
    );
  }, [crew?._timeAcceleration, ship?.emergencyAt]);

  const stats = useMemo(() => ([
    {
      label: 'Generation Time',
      value: formatTimer(
        Math.min(
          maxGenerationTime,
          chainTime - ship.Ship.emergencyAt
        )
      ),
      direction: 0,
      isTimeStat: true,
    },
    {
      label: 'Remaining Time Until Limit',
      value: formatTimer(
        Math.max(0, maxGenerationTime - (chainTime - ship.Ship.emergencyAt))
      ),
      direction: 0,
    },
    {
      label: 'Propellant Mass Generated',
      value: formatResourceMass(collectableAmount, resourceId),
      direction: 0,
    },
    {
      label: 'Propellant Volume Generated',
      value: formatResourceVolume(collectableAmount, resourceId),
      direction: 0,
    },
  ]), [chainTime, maxGenerationTime, ship]);

  const onCollect = useCallback(() => {
    collectEmergencyPropellant();
  }, [collectEmergencyPropellant]);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (lastStatus.current && actionStage !== lastStatus.current) {
      props.onClose();
    }
    lastStatus.current = actionStage;
  }, [actionStage]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <EmergencyModeGenerateIcon />,
          label: 'Collect Propellant',
          status: stage === actionStages.NOT_STARTED ? 'Emergency Generation Active' : undefined
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
            sublabel={`${formatMass(propellantInventory.mass)}`}
            bodyStyle={{ backgroundColor: `rgba(${hexToRGB(theme.colors.orange)}, 0.2)` }}
          />

          <FlexSectionSpacer />

          <ShipInputBlock
            title="Ship"
            disabled={stage !== actionStages.NOT_STARTED}
            ship={ship} />

        </FlexSection>
          
        <ProgressBarSection
          overrides={{
            barColor: theme.colors.lightOrange,
            // color: 'white',//theme.colors.lightOrange,
            left: `${Math.floor(totalEmergencyFraction * 100)}%`,
            center: (
              <small style={{ textTransform: 'uppercase' }}>
                {totalEmergencyFraction >= 1 ? 'Max Emergency Propellant Generated' : 'Generating Emergency Propellant...'}
              </small>
            ),
            right: <span style={{ opacity: 0 }}>{Math.floor(totalEmergencyFraction * 100)}</span>,
          }}
          finishTime={ship.Ship.emergencyAt + maxGenerationTime}
          startTime={ship.Ship.emergencyAt}
          stage={actionStages.IN_PROGRESS}
          title="Generated Amount"
          width="100%"
        />

        <FlexSection style={{ marginBottom: -15 }}>
          <EmergencyPropellantSection
            title="Propellant Tank"
            propellantPregeneration={startingAmount * Product.TYPES[resourceId].massPerUnit}
            propellantPostgeneration={totalAmount * Product.TYPES[resourceId].massPerUnit}
            propellantTankMax={propellantInventoryConfig.massConstraint}
          />
        </FlexSection>

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      {/* TODO: add waitForCrewReady? */}
      <ActionDialogFooter
        disabled={!(ship?.Ship?.emergencyAt > 0) || collectableAmount <= 0}
        goLabel="Collect"
        onGo={onCollect}
        stage={stage}
        {...props} />
    </>
  );
};

const Wrapper = (props) => {
  const { crew } = useCrewContext();

  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(crew?._location?.asteroidId);
  const { data: lot, isLoading: lotIsLoading } = useAsteroid(crew?._location?.lotId);
  const { data: ship, isLoading: shipIsLoading } = useShip(crew?._location?.shipId);

  const manager = useShipEmergencyManager();
  const { actionStage } = manager;

  const isLoading = asteroidIsLoading || lotIsLoading || shipIsLoading;
  useEffect(() => {
    if (!asteroid || !ship) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, ship, isLoading]);

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
