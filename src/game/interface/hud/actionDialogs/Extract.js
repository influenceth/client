import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CoreSample, Asteroid, Extraction, Inventory } from '@influenceth/sdk';

import extractionBackground from '~/assets/images/modal_headers/Extraction.png';
import { ExtractionIcon } from '~/components/Icons';
import { useResourceAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useExtractionManager from '~/hooks/useExtractionManager';
import { formatFixed, formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import {
  DestinationLotSection,
  ExtractionAmountSection,
  ExtractSampleSection,

  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogTimers,

  getBonusDirection,
  formatResourceVolume,
  formatSampleMass,
  formatSampleVolume,
  TravelBonusTooltip,
  TimeBonusTooltip,
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';

const Extract = ({ asteroid, lot, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const resources = useResourceAssets();
  const { currentExtraction, extractionStatus, startExtraction, finishExtraction } = useExtractionManager(asteroid?.i, lot?.i);
  const { crew, crewMemberMap } = useCrewContext();
  const { data: currentExtractionDestinationLot } = useLot(asteroid.i, currentExtraction?.destinationLotId);

  const [amount, setAmount] = useState(0);
  const [destinationLot, setDestinationLot] = useState();
  const [selectedCoreSample, setSelectedCoreSample] = useState();

  const crewMembers = currentExtraction?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
  const extractionBonus = useMemo(() => {
    const bonus = getCrewAbilityBonus(4, crewMembers);
    const asteroidBonus = Asteroid.getBonusByResource(asteroid?.bonuses, selectedCoreSample?.resourceId);
    if (asteroidBonus.totalBonus !== 1) {
      bonus.totalBonus *= asteroidBonus.totalBonus;
      bonus.others = [{
        text: `${resources[selectedCoreSample?.resourceId].category} Yield Bonus`,
        bonus: asteroidBonus.totalBonus - 1,
        direction: 1
      }];
    }
    return bonus;
  }, [asteroid?.bonuses, crewMembers, selectedCoreSample?.resourceId]);

  const usableSamples = useMemo(() => (lot?.coreSamples || []).filter((c) => (
    c.owner === crew?.i
    && c.remainingYield > 0
    && c.status >= CoreSample.STATUS_FINISHED
  )), [lot?.coreSample, crew?.i]);

  const selectCoreSample = useCallback((sample) => {
    setSelectedCoreSample(sample);
    setAmount(0);
    setTimeout(() => {
      setAmount(sample.remainingYield);
    }, 0);
  }, []);

  useEffect(() => {
    let defaultSelection;
    if (!currentExtraction && !selectedCoreSample) {
      if (props.preselect) {
        defaultSelection = usableSamples.find((s) => s.resourceId === props.preselect.resourceId && s.sampleId === props.preselect.sampleId);
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
      if (lot?.coreSamples) {
        const currentSample = lot.coreSamples.find((c) => c.resourceId === currentExtraction.resourceId && c.sampleId === currentExtraction.sampleId);
        if (currentSample) {
          setSelectedCoreSample({
            ...currentSample,
            remainingYield: currentSample.remainingYield + (currentExtraction.isCoreSampleUpdated ? currentExtraction.yield : 0)
          });
          setAmount(currentExtraction.yield);
        }
      }
    }
  }, [currentExtraction, lot?.coreSamples]);

  useEffect(() => {
    if (currentExtractionDestinationLot) {
      setDestinationLot(currentExtractionDestinationLot);
    }
  }, [currentExtractionDestinationLot]);

  const resource = useMemo(() => {
    if (!selectedCoreSample) return null;
    return resources[selectedCoreSample.resourceId];
  }, [selectedCoreSample]);

  const extractionTime = useMemo(() => {
    if (!selectedCoreSample) return 0;
    return Extraction.getExtractionTime(
      amount,
      selectedCoreSample.remainingYield || 0,
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
  ]), [amount, crewTravelBonus, crewTravelTime, extractionBonus, extractionTime, resource]);

  const status = useMemo(() => {
    if (extractionStatus === 'READY') {
      return 'BEFORE';
    } else if (extractionStatus === 'EXTRACTING') {
      return 'DURING';
    }
    return 'AFTER';
  }, [extractionStatus]);

  const onStartExtraction = useCallback(() => {
    const destInvId = 1;
    let destCapacityRemaining = { ...Inventory.CAPACITIES[destinationLot?.building?.capableType][destInvId] };
    if (destinationLot?.building?.inventories && destinationLot?.building?.inventories[destInvId]) {
      // Capacities are in tonnes and cubic meters, Inventories are in grams and mLs
      destCapacityRemaining.mass -= 1e-6 * ((destinationLot.building.inventories[destInvId].mass || 0) + (destinationLot.building.inventories[destInvId].reservedMass || 0));
      destCapacityRemaining.volume -= 1e-6 * ((destinationLot.building.inventories[destInvId].volume || 0) + (destinationLot.building.inventories[destInvId].reservedVolume || 0));
    }
    const neededCapacity = {
      mass: amount * resource?.massPerUnit,
      volume: amount * resource?.volumePerUnit
    }
    if (destCapacityRemaining.mass < neededCapacity.mass || destCapacityRemaining.volume < neededCapacity.volume) {
      createAlert({
        type: 'GenericAlert',
        level: 'warning',
        content: `Insufficient capacity remaining at selected destination: ${formatSampleMass(destCapacityRemaining.mass)} tonnes or ${formatSampleVolume(destCapacityRemaining.volume)} m³`,
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
        asteroid={asteroid}
        captain={captain}
        lot={lot}
        action={{
          actionIcon: <ExtractionIcon />,
          headerBackground: extractionBackground,
          label: 'Extract Resource',
          completeLabel: 'Extraction',
          crewRequirement: 'start',
        }}
        status={status}
        startTime={lot?.building?.extraction?.startTime}
        targetTime={lot?.building?.extraction?.completionTime}
        {...props} />

      <ExtractSampleSection
        amount={amount}
        lot={lot}
        resources={resources}
        onSelectSample={selectCoreSample}
        selectedSample={selectedCoreSample}
        status={status}
        usableSamples={usableSamples} />

      <DestinationLotSection
        asteroid={asteroid}
        destinationLot={destinationLot}
        originLot={lot}
        onDestinationSelect={setDestinationLot}
        status={status} />

      {status === 'BEFORE' && (
        <ExtractionAmountSection
          amount={amount || 0}
          extractionTime={extractionTime || 0}
          min={0}
          max={selectedCoreSample?.remainingYield || 0}
          resource={resource}
          setAmount={setAmount} />
      )}

      <ActionDialogStats stats={stats} status={status} />

      {status === 'BEFORE' && (
        <ActionDialogTimers
          crewAvailableIn={crewTravelTime}
          actionReadyIn={crewTravelTime + extractionTime + transportTime} />
      )}

      <ActionDialogFooter
        {...props}
        buttonsLoading={extractionStatus === 'FINISHING' || undefined}
        goDisabled={!destinationLot || !selectedCoreSample || amount === 0}
        finalizeLabel="Complete"
        goLabel="Begin Extraction"
        onFinalize={finishExtraction}
        onGo={onStartExtraction}
        status={extractionStatus === 'FINISHING' ? 'DURING' : status} />
    </>
  );
};

export default Extract;