import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Building, Crewmate, Deposit, Extractor, Inventory, Product } from '@influenceth/sdk';
import styled from 'styled-components';

import extractionBackground from '~/assets/images/modal_headers/Extraction.png';
import { CoreSampleIcon, ExtractionIcon, InventoryIcon, LocationIcon, ResourceIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useExtractionManager from '~/hooks/useExtractionManager';
import { boolAttr, formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import {
  ResourceAmountSlider, ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats, getBonusDirection,
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
  getBuildingInputDefaults
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, theming, useAsteroidAndLot } from '../ActionDialog';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import actionStage from '~/lib/actionStages';

const SampleAmount = styled.span`
  & > span {
    margin: 0 2px;
    &:last-child {
      color: ${p => p.theme.colors.main};
    }
  }
`;

const Extract = ({ asteroid, lot, extractionManager, stage, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const { currentExtraction, extractionStatus, startExtraction, finishExtraction } = extractionManager;
  const { crew, crewmateMap } = useCrewContext();
  const { data: currentExtractionDestinationLot } = useLot(asteroid.i, currentExtraction?.destinationLotId);

  const [amount, setAmount] = useState(0);
  const [destinationLot, setDestinationLot] = useState();
  const [selectedCoreSample, setSelectedCoreSample] = useState();
  const [sampleSelectorOpen, setSampleSelectorOpen] = useState(false);
  const [destinationSelectorOpen, setDestinationSelectorOpen] = useState(false);

  const crewmates = currentExtraction?._crewmates || (crew?.crewmates || []).map((i) => crewmateMap[i]);
  const captain = crewmates[0];
  const crewTravelBonus = getCrewAbilityBonus(Crewmate.ABILITY_IDS.SURFACE_TRANSPORT_SPEED, crewmates);
  const extractionBonus = useMemo(() => {
    const bonus = getCrewAbilityBonus(Crewmate.ABILITY_IDS.EXTRACTION_RATE, crewmates);
    const asteroidBonus = Asteroid.Entity.getBonusByResource(asteroid, selectedCoreSample?.resourceId);
    if (asteroidBonus.totalBonus !== 1) {
      bonus.totalBonus *= asteroidBonus.totalBonus;
      bonus.others = [{
        text: `${Product.TYPES[selectedCoreSample?.resourceId].category} Yield Bonus`,
        bonus: asteroidBonus.totalBonus - 1,
        direction: 1
      }];
    }
    return bonus;
  }, [asteroid, crewmates, selectedCoreSample?.resourceId]);

  const usableSamples = useMemo(() => (lot?.deposits || []).filter((d) => (
    d.Control.controller.id === crew?.i
    && d.Deposit.remainingYield > 0
    && d.Deposit.status >= Deposit.STATUSES.SAMPLED
  )), [lot?.deposits, crew?.i]);

  const selectCoreSample = useCallback((sample) => {
    setSelectedCoreSample(sample);
    setAmount(0);
    setTimeout(() => {
      setAmount(sample.Deposit.remainingYield);
    }, 0);
  }, []);

  useEffect(() => {
    let defaultSelection;
    if (!currentExtraction && !selectedCoreSample) {
      if (props.preselect) {
        defaultSelection = usableSamples.find((s) => s.Deposit.resource === props.preselect.resourceId && s.i === props.preselect.sampleId);
      } else if (usableSamples.length === 1) {
        defaultSelection = usableSamples[0];
      }
      if (defaultSelection) {
        selectCoreSample(defaultSelection);
      }
    }
  }, [!currentExtraction, !selectedCoreSample, usableSamples]);

  // handle "currentExtraction" state
  useEffect(() => {
    if (currentExtraction) {
      if (lot?.deposits) {
        const currentSample = lot.deposits.find((c) => c.Deposit.resource === currentExtraction.resourceId && c.i === currentExtraction.sampleId);
        if (currentSample) {
          setSelectedCoreSample({
            ...currentSample,
            remainingYield: currentSample.Deposit.remainingYield + (currentExtraction.isCoreSampleUpdated ? currentExtraction.yield : 0)
          });
          setAmount(currentExtraction.yield);
        }
      }
    }
  }, [currentExtraction, lot?.deposits]);

  useEffect(() => {
    if (currentExtractionDestinationLot) {
      setDestinationLot(currentExtractionDestinationLot);
    }
  }, [currentExtractionDestinationLot]);

  const resource = useMemo(() => {
    if (!selectedCoreSample) return null;
    return Product.TYPES[selectedCoreSample.Deposit.resource];
  }, [selectedCoreSample]);

  const extractionTime = useMemo(() => {
    if (!selectedCoreSample) return 0;
    return Extractor.getExtractionTime(
      amount,
      selectedCoreSample.Deposit.remainingYield || 0,
      extractionBonus.totalBonus || 1
    );
  }, [amount, extractionBonus, selectedCoreSample]);

  // TODO: ...
  // const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
  //   if (!asteroid?.i || !lot?.i) return {};
  //   return getTripDetails(asteroid.i, crewTravelBonus.totalBonus, 1, [ // TODO
  //     { label: 'Travel to destination', lot: lot.i },
  //     { label: 'Return from destination', lot: 1 },
  //   ]);
  // }, [asteroid?.i, lot?.i, crewTravelBonus]);

  const crewTravelTime = 0;
  const tripDetails = null;

  const transportDistance = useMemo(() => {
    if (destinationLot) {
      return Asteroid.getLotDistance(asteroid?.i, lot?.i, destinationLot?.i) || 0;
    }
    return 0;
  }, [asteroid?.i, lot?.i, destinationLot?.i]);

  const transportTime = useMemo(() => {
    if (!destinationLot) return 0;
    return Asteroid.getLotTravelTime(asteroid?.i, lot?.i, destinationLot?.i, crewTravelBonus.totalBonus) || 0;
  }, [asteroid?.i, lot?.i, destinationLot?.i, crewTravelBonus]);

  const stats = useMemo(() => ([
    {
      label: 'Extraction Mass',
      value: `${formatSampleMass(amount * resource?.massPerUnit || 0)} tonnes`,
      direction: 0
    },
    {
      label: 'Extraction Volume',
      value: `${formatResourceVolume(amount, resource?.i)}`,
      direction: 0
    },
    // {
    //   label: 'Transport Distance',
    //   value: `${formatFixed(transportDistance, 1)} km`,
    //   direction: 0
    // },
    {
      label: 'Crew Travel',
      value: formatTimer(crewTravelTime),
      direction: getBonusDirection(crewTravelBonus),
      isTimeStat: true,
      tooltip: (
        <TravelBonusTooltip
          bonus={crewTravelBonus}
          totalTime={crewTravelTime}
          tripDetails={tripDetails}
          crewRequired="start" />
      )
    },
    {
      label: 'Extraction Time',
      value: formatTimer(extractionTime),
      direction: getBonusDirection(extractionBonus),
      isTimeStat: true,
      tooltip: extractionBonus.totalBonus !== 1 && extractionTime > 0 && (
        <TimeBonusTooltip
          bonus={extractionBonus}
          title="Extraction Time"
          totalTime={extractionTime}
          crewRequired="start" />
      )
    },
    // {
    //   label: 'Transport Time',
    //   value: formatTimer(transportTime),
    //   direction: getBonusDirection(crewTravelBonus),
    //   isTimeStat: true,
    //   tooltip: (
    //     <TimeBonusTooltip
    //       bonus={crewTravelBonus}
    //       title="Transport Time"
    //       totalTime={transportTime}
    //       crewRequired="start" />
    //   )
    // },
  ]), [amount, crewTravelBonus, crewTravelTime, extractionBonus, extractionTime, resource]);

  const onStartExtraction = useCallback(() => {
    const inventory = destinationLot?.building?.inventories.find((i) => !i.locked);
    const inventoryConfig = Inventory.getType(inventory.inventoryType) || {};
    if (inventory) {
      inventoryConfig.massConstraint -= ((inventory.mass || 0) + (inventory.reservedMass || 0));
      inventoryConfig.volumeConstraint -= ((inventory.volume || 0) + (inventory.reservedVolume || 0));
    }
    const neededCapacity = {
      mass: amount * resource?.massPerUnit,
      volume: amount * resource?.volumePerUnit
    }
    if (inventoryConfig.massConstraint < neededCapacity.mass || inventoryConfig.volumeConstraint < neededCapacity.volume) {
      createAlert({
        type: 'GenericAlert',
        level: 'warning',
        content: `Insufficient capacity remaining at selected destination: ${formatSampleMass(inventoryConfig.massConstraint)} tonnes or ${formatSampleVolume(inventoryConfig.volumeConstraint)} m³`,
        duration: 10000
      });
      return;
    }

    startExtraction(amount, selectedCoreSample, destinationLot);
  }, [amount, selectedCoreSample, destinationLot, resource]);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (['READY', 'READY_TO_FINISH', 'FINISHING'].includes(lastStatus.current)) {
      if (extractionStatus !== lastStatus.current) {
        props.onClose();
      }
    }
    lastStatus.current = extractionStatus;
  }, [extractionStatus]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <ExtractionIcon />,
          label: 'Extract Resource',
        }}
        captain={captain}
        location={{ asteroid, lot }}
        crewAvailableTime={crewTravelTime}
        taskCompleteTime={crewTravelTime + extractionTime}
        onClose={props.onClose}
        stage={stage} />

      <ActionDialogBody>

        <FlexSection>
          <FlexSectionInputBlock
            title="Deposit"
            image={
              resource
                ? <ResourceThumbnail resource={resource} tooltipContainer="none" />
                : <EmptyResourceImage iconOverride={<CoreSampleIcon />} />
            }
            isSelected={stage === actionStage.NOT_STARTED}
            label={resource ? `${resource.name} Deposit` : 'Select'}
            onClick={() => { setSampleSelectorOpen(true) }}
            disabled={stage !== actionStage.NOT_STARTED}
            sublabel={
              selectedCoreSample
                ? (
                  stage === actionStage.NOT_STARTED
                    ? (
                      <SampleAmount>
                        <ResourceIcon />
                        <span>{formatSampleMass(selectedCoreSample.Deposit.remainingYield * resource.massPerUnit)}t</span>
                        <span>({formatSampleMass((selectedCoreSample.Deposit.remainingYield - amount) * resource.massPerUnit)}t)</span>
                      </SampleAmount>
                    )
                    : (
                      <SublabelBanner color={theming[stage].highlight} style={{ fontWeight: 'normal' }}>
                        {formatSampleMass(amount * resource.massPerUnit)}t
                      </SublabelBanner>
                    )
                )
                : 'Deposit'
            }
          />
          
          <FlexSectionSpacer />

          <FlexSectionInputBlock
            title="Destination"
            {...getBuildingInputDefaults(destinationLot, 'Inventory')}
            image={
              destinationLot
                ? (
                  <BuildingImage
                    buildingType={destinationLot.building?.Building?.buildingType || 0}
                    inventories={destinationLot.building?.Inventories}
                    showInventoryStatusForType={1} />
                )
                : <EmptyBuildingImage iconOverride={<InventoryIcon />} />
            }
            isSelected={stage === actionStage.NOT_STARTED}
            onClick={() => { setDestinationSelectorOpen(true) }}
            disabled={stage !== actionStage.NOT_STARTED}
          />
        </FlexSection>

        {stage === actionStage.NOT_STARTED && (
          <Section>
            <SectionTitle>Extraction Amount</SectionTitle>
            <SectionBody style={{ paddingTop: 5 }}>
              <ResourceAmountSlider
                amount={amount || 0}
                extractionTime={extractionTime || 0}
                min={0}
                max={selectedCoreSample?.Deposit?.remainingYield || 0}
                resource={resource}
                setAmount={setAmount} />
            </SectionBody>
          </Section>
        )}

        {stage !== actionStage.NOT_STARTED && (
          <ProgressBarSection
            finishTime={currentExtraction?.finishTime}
            startTime={currentExtraction?.startTime}
            stage={stage}
            title="Progress"
            totalTime={crewTravelTime + extractionTime}
          />
        )}

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={!destinationLot || !selectedCoreSample || amount === 0}
        goLabel="Extract"
        onGo={onStartExtraction}
        finalizeLabel="Complete"
        onFinalize={finishExtraction}
        stage={stage}
        {...props} />

      {stage === actionStage.NOT_STARTED && (
        <>
          <CoreSampleSelectionDialog
            options={usableSamples}
            initialSelection={selectedCoreSample}
            lotId={lot?.i}
            onClose={() => setSampleSelectorOpen(false)}
            onSelected={setSelectedCoreSample}
            open={sampleSelectorOpen}
          />

          <DestinationSelectionDialog
            asteroid={asteroid}
            originLotId={lot?.i}
            initialSelection={undefined/* TODO: if only one warehouse, use it... */}
            onClose={() => setDestinationSelectorOpen(false)}
            onSelected={setDestinationLot}
            open={destinationSelectorOpen}
          />
        </>
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  const extractionManager = useExtractionManager(asteroid?.i, lot?.i);
  const { actionStage } = extractionManager;

  useEffect(() => {
    if (!asteroid || !lot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  return (
    <ActionDialogInner
      actionImage={extractionBackground}
      isLoading={boolAttr(isLoading)}
      stage={actionStage}>
      <Extract
        asteroid={asteroid}
        lot={lot}
        extractionManager={extractionManager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
