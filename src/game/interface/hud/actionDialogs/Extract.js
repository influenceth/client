import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Asteroid, Crew, Crewmate, Deposit, Extractor, Inventory, Lot, Product, Time } from '@influenceth/sdk';

import extractionBackground from '~/assets/images/modal_headers/Extraction.png';
import { CoreSampleIcon, ExtractionIcon, InventoryIcon, LocationIcon, ResourceIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useExtractionManager from '~/hooks/actionManagers/useExtractionManager';
import { reactBool, formatTimer, locationsArrToObj, getCrewAbilityBonuses, formatFixed } from '~/lib/utils';

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
  LotInputBlock,
  InventorySelectionDialog,
  InventoryInputBlock,
  TransferDistanceDetails,
  getTripDetails
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, theming, useAsteroidAndLot } from '../ActionDialog';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import actionStage from '~/lib/actionStages';
import useEntity from '~/hooks/useEntity';
import formatters from '~/lib/formatters';

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

  const [amount, setAmount] = useState(0);
  const [selectedCoreSample, setSelectedCoreSample] = useState();
  const [sampleSelectorOpen, setSampleSelectorOpen] = useState(false);
  const [destinationSelectorOpen, setDestinationSelectorOpen] = useState(false);

  // get destinationLot and destinationInventory
  const [destinationSelection, setDestinationSelection] = useState();
  const { data: destination } = useEntity(destinationSelection ? { id: destinationSelection.id, label: destinationSelection.label } : undefined);
  const destinationLotId = useMemo(() => destination && locationsArrToObj(destination?.Location?.locations || []).lotId, [destination]);
  const { data: destinationLot } = useLot(destinationLotId);
  const destinationInventory = useMemo(() => (destination?.Inventories || []).find((i) => i.slot === destinationSelection?.slot), [destination, destinationSelection]);

  useEffect(() => {
    const defaultSelection = props.preselect || currentExtraction;
    if (defaultSelection?.destination) {
      setDestinationSelection({
        id: defaultSelection?.destination.id,
        label: defaultSelection?.destination.label,
        lotIndex: null,
        slot: defaultSelection?.destinationSlot
      });
    }
  }, [currentExtraction?.destination]);

  const crewmates = currentExtraction?._crewmates || (crew?._crewmates || []).map((i) => crewmateMap[i]);
  const captain = crewmates[0];

  const [crewTravelBonus, extractionBonus] = useMemo(() => {
    const bonusIds = [
      Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME,
      Crewmate.ABILITY_IDS.EXTRACTION_TIME,
    ];
    const abilities = getCrewAbilityBonuses(bonusIds, crew);

    // apply asteroid bonus to extraction time
    const asteroidBonus = Asteroid.Entity.getBonusByResource(asteroid, selectedCoreSample?.resourceId);
    if (asteroidBonus.totalBonus !== 1) {
      abilities[Crewmate.ABILITY_IDS.EXTRACTION_TIME].totalBonus *= asteroidBonus.totalBonus;
      abilities[Crewmate.ABILITY_IDS.EXTRACTION_TIME].others = [{
        text: `${Product.TYPES[selectedCoreSample?.resourceId].category} Yield Bonus`,
        bonus: asteroidBonus.totalBonus - 1,
        direction: 1
      }];
    }

    return bonusIds.map((id) => abilities[id] || {});
  }, [crew, selectedCoreSample?.resourceId]);

  const usableSamples = useMemo(() => (lot?.deposits || []).filter((d) => (
    d.Control.controller.id === crew?.id
    && d.Deposit.remainingYield > 0
    && d.Deposit.status >= Deposit.STATUSES.SAMPLED
  )), [lot?.deposits, crew?.id]);

  const selectCoreSample = useCallback((sample) => {
    setSelectedCoreSample(sample);
    setAmount(0);
    if (sample) {
      setTimeout(() => {
        setAmount(sample.Deposit.remainingYield);
      }, 0);
    }
  }, []);

  useEffect(() => {
    let defaultSelection;
    if (currentExtraction) {
      setSelectedCoreSample(usableSamples.find((s) => s.id === currentExtraction.depositId));
      setAmount(currentExtraction.yield);
    } else if (!selectedCoreSample) {
      if (props?.preselect) {
        defaultSelection = usableSamples.find((s) => s.id === props.preselect.depositId);
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
        const currentSample = lot.deposits.find((c) => c.Deposit.resource === currentExtraction.resourceId && c.id === currentExtraction.depositId);
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

  const resource = useMemo(() => {
    if (!selectedCoreSample) return null;
    return Product.TYPES[selectedCoreSample.Deposit.resource];
  }, [selectedCoreSample]);

  const extractionTime = useMemo(() => {
    if (!selectedCoreSample) return 0;
    return Time.toRealDuration(
      Extractor.getExtractionTime(
        amount * resource?.massPerUnit || 0,
        selectedCoreSample.Deposit.remainingYield * resource?.massPerUnit || 0,
        extractionBonus.totalBonus || 1
      ),
      crew?._timeAcceleration
    );
  }, [amount, crew?._timeAcceleration, extractionBonus, selectedCoreSample]);

  const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
    if (!asteroid?.id || !crew?._location?.lotId || !lot?.id) return {};
    const crewLotIndex = Lot.toIndex(crew?._location?.lotId);
    return getTripDetails(asteroid.id, crewTravelBonus, crewLotIndex, [
      { label: 'Travel to Extraction Site', lotIndex: Lot.toIndex(lot.id) },
      { label: 'Return to Crew Station', lotIndex: crewLotIndex },
    ], crew?._timeAcceleration);
  }, [asteroid?.id, lot?.id, crew?._location?.lotId, crew?._timeAcceleration, crewTravelBonus]);

  const [transportDistance, transportTime] = useMemo(() => {
    if (!destinationLot?.id) return [];
    return [
      Asteroid.getLotDistance(asteroid?.id, Lot.toIndex(lot?.id), Lot.toIndex(destinationLot?.id)) || 0,
      Time.toRealDuration(
        Asteroid.getLotTravelTime(asteroid?.id, Lot.toIndex(lot?.id), Lot.toIndex(destinationLot?.id), crewTravelBonus.totalBonus) || 0,
        crew?._timeAcceleration
      )
    ];
  }, [asteroid?.id, lot?.id, crew?._timeAcceleration, destinationLot?.id, crewTravelBonus]);

  const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => {
    if (!extractionTime || !crewTravelTime || !transportTime) return [];
    const oneWayCrewTravelTime = crewTravelTime / 2;
    return [
      crewTravelTime,
      oneWayCrewTravelTime + extractionTime + transportTime
    ];
  }, [extractionTime, crewTravelTime, transportTime]);


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
    {
      label: 'Transport Distance',
      value: `${formatFixed(transportDistance, 1)} km`,
      direction: 0
    },
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
    {
      label: 'Transport Time',
      value: formatTimer(transportTime),
      direction: getBonusDirection(crewTravelBonus),
      isTimeStat: true,
      tooltip: (
        <TimeBonusTooltip
          bonus={crewTravelBonus}
          title="Transport Time"
          totalTime={transportTime}
          crewRequired="start" />
      )
    },
  ]), [amount, crewTravelBonus, crewTravelTime, extractionBonus, extractionTime, resource, transportDistance, transportTime]);

  const onStartExtraction = useCallback(() => {
    if (!(amount && selectedCoreSample && destination && destinationInventory)) {
      return;
    }

    const inventoryConfig = Inventory.getType(destinationInventory.inventoryType) || {};
    if (destinationInventory) {
      inventoryConfig.massConstraint -= ((destinationInventory.mass || 0) + (destinationInventory.reservedMass || 0));
      inventoryConfig.volumeConstraint -= ((destinationInventory.volume || 0) + (destinationInventory.reservedVolume || 0));
    }

    const safeAmount = Math.ceil(amount); // round up to nearest gram
    const neededCapacity = {
      mass: safeAmount * resource?.massPerUnit,
      volume: safeAmount * resource?.volumePerUnit
    }
    if (inventoryConfig.massConstraint < neededCapacity.mass || inventoryConfig.volumeConstraint < neededCapacity.volume) {
      createAlert({
        type: 'GenericAlert',
        level: 'warning',
        data: { content: `Insufficient capacity remaining at selected destination: ${formatSampleMass(inventoryConfig.massConstraint)} tonnes or ${formatSampleVolume(inventoryConfig.volumeConstraint)} m³` },
        duration: 10000
      });
      return;
    }

    startExtraction(
      safeAmount,
      selectedCoreSample,
      destination,
      destinationInventory.slot
    );
  }, [amount, selectedCoreSample, destination, destinationInventory, resource]);

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
        crewAvailableTime={crewTimeRequirement}
        taskCompleteTime={taskTimeRequirement}
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
            style={{ whiteSpace: 'nowrap' }}
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

          <InventoryInputBlock
            title="Destination"
            titleDetails={<TransferDistanceDetails distance={transportDistance} crewTravelBonus={crewTravelBonus} />}
            entity={destination}
            inventorySlot={destinationInventory?.slot}
            imageProps={{
              iconOverride: <InventoryIcon />
            }}
            isSelected={stage === actionStage.NOT_STARTED}
            onClick={() => { setDestinationSelectorOpen(true) }}
            disabled={stage !== actionStage.NOT_STARTED}
            sublabel={
              destinationLot
              ? <><LocationIcon /> {formatters.lotName(destinationSelection?.lotIndex)}</>
              : 'Inventory'
            }
            transferMass={amount * resource?.massPerUnit || 0}
            transferVolume={amount * resource?.volumePerUnit || 0} />

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
        waitForCrewReady
        {...props} />

      {stage === actionStage.NOT_STARTED && (
        <>
          <CoreSampleSelectionDialog
            options={usableSamples}
            initialSelection={selectedCoreSample}
            lotId={lot?.id}
            onClose={() => setSampleSelectorOpen(false)}
            onSelected={setSelectedCoreSample}
            open={sampleSelectorOpen}
          />

          {/* TODO: reset if resource changes? */}
          <InventorySelectionDialog
            otherEntity={lot?.building}
            otherLotId={lot?.id}
            itemIds={[selectedCoreSample?.resource]}
            onClose={() => setDestinationSelectorOpen(false)}
            onSelected={setDestinationSelection}
            open={destinationSelectorOpen}
          />
        </>
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  const extractionManager = useExtractionManager(lot?.id);
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
      isLoading={reactBool(isLoading)}
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
