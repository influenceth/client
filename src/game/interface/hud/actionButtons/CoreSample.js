import { useCallback, useMemo, useRef } from 'react';
import { Asteroid, Building, Deposit, Lot, Product } from '@influenceth/sdk';

import { NewCoreSampleIcon, ImproveCoreSampleIcon } from '~/components/Icons';
import useCoreSampleManager from '~/hooks/actionManagers/useCoreSampleManager';
import useStore from '~/hooks/useStore';
import { formatFixed } from '~/lib/utils';
import ActionButton, { getCrewDisabledReason } from './ActionButton';

const labelDict = {
  READY: 'Start Core Sample',
  SAMPLING: 'Sampling...',
  READY_TO_FINISH: 'Analyze Sample',
  FINISHING: 'Analyzing...'
};

const isVisible = ({ asteroid, crew, lot, openHudMenu }) => {
  // if asteroid has been scanned, can core sample...
  // (only offer as main button if no building or the building is an extractor)
  // (can still zoom to lot and do through resources panel)
  return crew && asteroid && lot
    && asteroid.Celestial.scanStatus === Asteroid.SCAN_STATUSES.RESOURCE_SCANNED
    && (
      // (operational or planned extractor)
      lot?.building?.Building?.buildingType === Building.IDS.EXTRACTOR
      || openHudMenu === 'RESOURCES'
    ); 
};

const NewCoreSample = ({ asteroid, crew, lot, onSetAction, overrideResourceId, improveSample, _disabled }) => {
  const defaultResourceId = useStore(s => s.asteroids.resourceMap?.active && s.asteroids.resourceMap?.selected);
  const { currentSamplingActions } = useCoreSampleManager(lot?.id);

  const resourceId = overrideResourceId || defaultResourceId;

  // get lot abundance
  const lotAbundance = useMemo(() => {
    if (!resourceId || !asteroid?.Celestial?.abundanceSeed || !asteroid.Celestial?.abundances) return 0;
    return Asteroid.Entity.getAbundanceAtLot(asteroid, Lot.toIndex(lot.id), resourceId);
  }, [asteroid, lot, resourceId]);

  const clickTally = useRef(0);
  const handleClick = useCallback((isStackClick) => () => {

    // for now, clicking just cycles through concurrent actions' dialogs
    if (isStackClick) {
      const currentSamplingAction = currentSamplingActions[clickTally.current % currentSamplingActions?.length];
      if (currentSamplingAction) {
        onSetAction(
          currentSamplingAction.action?.isNew ? 'NEW_CORE_SAMPLE' : 'IMPROVE_CORE_SAMPLE',
          { sampleId: currentSamplingAction.action?.sampleId }
        );
      }
      clickTally.current++;

    // else, open for new...
    } else {
      if (improveSample) {
        onSetAction('IMPROVE_CORE_SAMPLE', { preselect: { ...improveSample, sampleId: improveSample.id } });
      } else {
        onSetAction('NEW_CORE_SAMPLE', resourceId ? { preselect: { resourceId } } : undefined);
      }
    }
  }, [currentSamplingActions, improveSample, onSetAction, resourceId]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (improveSample && improveSample?.Deposit?.status === Deposit.STATUSES.USED) return 'already used';
    if (improveSample && improveSample?.Deposit?.status !== Deposit.STATUSES.SAMPLED) return 'not yet analyzed';
    if (currentSamplingActions.find((c) => c.stage === 'STARTING')) return 'pending';
    return getCrewDisabledReason({ asteroid, isSequenceable: true, crew });
  }, [_disabled, asteroid, crew, currentSamplingActions, improveSample]);

  let label = labelDict.READY;
  if (!crew?._ready) label = `Schedule Next: ${label}`;
  if (improveSample) label = 'Improve Core Sample';
  else if (lotAbundance > 0) label += ` (${formatFixed(100 * lotAbundance, 1)}%)`;

  const stackAttention = useMemo(() => {
    return currentSamplingActions.find((a) => a.status === 'READY_TO_FINISH')
  }, [currentSamplingActions]);

  const stackIsImprovement = useMemo(() => {
    return !currentSamplingActions.find((a) => a.action?.isNew);
  }, [currentSamplingActions]);

  return (
    <>
      {currentSamplingActions.length > 0 && (
        <ActionButton
          label={
            currentSamplingActions.length > 1
            ? `${currentSamplingActions.length} Core Samples Started`
            : `${labelDict[currentSamplingActions[0].status]} (${Product.TYPES[currentSamplingActions[0]?.action?.resourceId]?.name})`
          }
          flags={{
            attention: stackAttention,
            loading: !stackAttention,
            tally: currentSamplingActions.length,
            finishTime: currentSamplingActions.length > 1 ? undefined : currentSamplingActions[0]?.action?.finishTime
          }}
          icon={stackIsImprovement ? <ImproveCoreSampleIcon /> : <NewCoreSampleIcon />}
          onClick={handleClick(true)} />
      )}
      <ActionButton
        label={label}
        labelAddendum={disabledReason}
        flags={{ disabled: _disabled || disabledReason }}
        icon={improveSample ? <ImproveCoreSampleIcon /> : <NewCoreSampleIcon />}
        onClick={handleClick()}
        sequenceMode={!crew?._ready || currentSamplingActions.length > 0} />
    </>
  );
};

export default { Component: NewCoreSample, isVisible };