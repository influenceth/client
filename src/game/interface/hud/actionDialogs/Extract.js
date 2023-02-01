import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CoreSample, Asteroid, Extraction, Inventory } from '@influenceth/sdk';

import extractionBackground from '~/assets/images/modal_headers/Extraction.png';
import { ExtractionIcon } from '~/components/Icons';
import { useResourceAssets } from '~/hooks/useAssets';
import useCrew from '~/hooks/useCrew';
import useExtractionManager from '~/hooks/useExtractionManager';
import { formatFixed, formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import {
  DestinationPlotSection,
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
import usePlot from '~/hooks/usePlot';
import useStore from '~/hooks/useStore';

const Extract = ({ asteroid, plot, ...props }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const resources = useResourceAssets();
  const { currentExtraction, extractionStatus, startExtraction, finishExtraction } = useExtractionManager(asteroid?.i, plot?.i);
  const { crew, crewMemberMap } = useCrew();
  const { data: currentExtractionDestinationPlot } = usePlot(asteroid.i, currentExtraction?.destinationLotId);

  const [amount, setAmount] = useState(0);
  const [destinationPlot, setDestinationPlot] = useState();
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

  const usableSamples = useMemo(() => (plot?.coreSamples || []).filter((c) => (
    c.owner === crew?.i
    && c.remainingYield > 0
    && c.status >= CoreSample.STATUS_FINISHED
  )), [plot?.coreSample, crew?.i]);

  const selectCoreSample = useCallback((sample) => {
    setSelectedCoreSample(sample);
    setAmount(sample.remainingYield);
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
      if (plot?.coreSamples) {
        const currentSample = plot.coreSamples.find((c) => c.resourceId === currentExtraction.resourceId && c.sampleId === currentExtraction.sampleId);
        if (currentSample) {
          setSelectedCoreSample(currentSample);
          setAmount(currentExtraction.yield);
        }
      }
    }
  }, [currentExtraction, plot?.coreSamples]);

  useEffect(() => {
    if (currentExtractionDestinationPlot) {
      setDestinationPlot(currentExtractionDestinationPlot);
    }
  }, [currentExtractionDestinationPlot]);

  const resource = useMemo(() => {
    if (!selectedCoreSample) return null;
    return resources[selectedCoreSample.resourceId];
  }, [selectedCoreSample]);

  const extractionTime = useMemo(() => {
    if (!selectedCoreSample) return 0;
    return Extraction.getExtractionTime(
      amount,
      selectedCoreSample.remainingYield || 0,
      selectedCoreSample.initialYield || 0,
      extractionBonus.totalBonus
    );
  }, [amount, extractionBonus, selectedCoreSample]);

  // TODO: ...
  // const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
  //   if (!asteroid?.i || !plot?.i) return {};
  //   return getTripDetails(asteroid.i, crewTravelBonus.totalBonus, 1, [ // TODO
  //     { label: 'Travel to destination', plot: plot.i },
  //     { label: 'Return from destination', plot: 1 },
  //   ]);
  // }, [asteroid?.i, plot?.i, crewTravelBonus]);
  const crewTravelTime = 0;
  const tripDetails = null;

  const transportDistance = useMemo(() => {
    if (destinationPlot) {
      return Asteroid.getLotDistance(asteroid?.i, plot?.i, destinationPlot?.i) || 0;
    }
    return 0;
  }, [asteroid?.i, plot?.i, destinationPlot?.i]);

  const transportTime = useMemo(() => {
    if (!destinationPlot) return 0;
    return Asteroid.getLotTravelTime(asteroid?.i, plot?.i, destinationPlot?.i, crewTravelBonus.totalBonus) || 0;
  }, [asteroid?.i, plot?.i, destinationPlot?.i, crewTravelBonus]);

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
    let destCapacityRemaining = Inventory.CAPACITIES[destinationPlot?.building?.capableType][destInvId];
    if (destinationPlot?.building?.inventories && destinationPlot?.building?.inventories[destInvId]) {
      // Capacities are in tonnes and cubic meters, Inventories are in grams and mLs
      destCapacityRemaining.mass -= 1e-6 * ((destinationPlot.building.inventories[destInvId].mass || 0) + (destinationPlot.building.inventories[destInvId].reservedMass || 0));
      destCapacityRemaining.volume -= 1e-6 * ((destinationPlot.building.inventories[destInvId].volume || 0) + (destinationPlot.building.inventories[destInvId].reservedVolume || 0));
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

    startExtraction(amount, selectedCoreSample, destinationPlot);
  }, [amount, selectedCoreSample, destinationPlot, resource]);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (['READY', 'READY_TO_FINISH'].includes(lastStatus.current)) {
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
        plot={plot}
        action={{
          actionIcon: <ExtractionIcon />,
          headerBackground: extractionBackground,
          label: 'Extract Resource',
          completeLabel: 'Extraction',
          crewRequirement: 'start',
        }}
        status={status}
        startTime={plot?.building?.extraction?.startTime}
        targetTime={plot?.building?.extraction?.completionTime}
        {...props} />

      <ExtractSampleSection
        amount={amount}
        plot={plot}
        resources={resources}
        onSelectSample={selectCoreSample}
        selectedSample={selectedCoreSample}
        status={status}
        usableSamples={usableSamples} />

      <DestinationPlotSection
        asteroid={asteroid}
        destinationPlot={destinationPlot}
        originPlot={plot}
        onDestinationSelect={setDestinationPlot}
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
        goDisabled={!destinationPlot || !selectedCoreSample || amount === 0}
        finalizeLabel="Complete"
        goLabel="Begin Extraction"
        onFinalize={finishExtraction}
        onGo={onStartExtraction}
        status={status} />
    </>
  );
};

export default Extract;