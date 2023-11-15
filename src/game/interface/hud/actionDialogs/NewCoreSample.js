import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Crew, Crewmate, Deposit, Lot, Product } from '@influenceth/sdk';

import coreSampleBackground from '~/assets/images/modal_headers/CoreSample.png';
import { NewCoreSampleIcon, ResourceIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import useCoreSampleManager from '~/hooks/actionManagers/useCoreSampleManager';
import actionStage from '~/lib/actionStages';
import { reactBool, formatFixed, formatTimer } from '~/lib/utils';

import {
  ActionDialogBody,

  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,

  getBonusDirection,
  formatSampleMass,
  TravelBonusTooltip,
  TimeBonusTooltip,
  MaterialBonusTooltip,
  EmptyResourceImage,
  FlexSection,
  FlexSectionInputBlock,
  FlexSectionSpacer,
  SourceInventorySelectionDialog,
  ResourceSelectionDialog,
  ProgressBarSection,
  SublabelBanner,
  getTripDetails,
  InventorySelectionDialog,
} from './components';
import { ActionDialogInner, theming, useAsteroidAndLot } from '../ActionDialog';

const NewCoreSample = ({ asteroid, lot, coreSampleManager, stage, ...props }) => {
  const { currentSamplingAction, startSampling, finishSampling, samplingStatus } = coreSampleManager;
  const { crew, crewmateMap } = useCrewContext();

  const dispatchResourceMapSelect = useStore(s => s.dispatchResourceMapSelect);
  const dispatchResourceMapToggle = useStore(s => s.dispatchResourceMapToggle);
  const resourceMap = useStore(s => s.asteroids.resourceMap);

  // if an active sample is detected, set "sample" for remainder of dialog's lifespan
  const [sampleId, setSampleId] = useState();
  const [resourceId, setResourceId] = useState(props.preselect?.resourceId || (resourceMap?.active && resourceMap?.selected || undefined));
  const [drillSource, setDrillSource] = useState();
  const [resourceSelectorOpen, setResourceSelectorOpen] = useState(false);
  const [sourceSelectorOpen, setSourceSelectorOpen] = useState(false);

  useEffect(() => {
    if (currentSamplingAction) {
      setSampleId(currentSamplingAction.sampleId);

      setDrillSource({
        // ...currentSamplingAction.origin,
        // // TODO: need to populate lotIndex from origin entity
        // slot: currentSamplingAction.origin_slot

        // TODO: remove this, uncomment above
        lotIndex: 1615682,
        slot: 1,
      });
      if (currentSamplingAction.resourceId !== resourceId) {
        setResourceId(currentSamplingAction.resourceId)
      }
      if (resourceMap?.active && currentSamplingAction.resourceId !== resourceMap?.selected) {
        dispatchResourceMapSelect(currentSamplingAction.resourceId);
        dispatchResourceMapToggle(true);
      }
    }
  }, [currentSamplingAction]);

  const onSelectResource = useCallback((r) => {
    setResourceId(r);

    // if open to a different resource map, switch... if a resource map is not open, don't open one
    if (resourceMap?.active && resourceMap.selected !== r) {
      dispatchResourceMapSelect(r);
    }
  }, [resourceMap?.active]);

  const [sample, initialYieldTonnage]  = useMemo(() => {
    if (lot?.deposits && resourceId && sampleId) {
      const thisSample = lot.deposits.find((s) => s.id === sampleId && s.Deposit.resource === resourceId);
      if (thisSample) {
        // TODO: ecs refactor: with the db changes, double-check that key is still only conditionally included
        const initialYieldTonnage = Object.keys(thisSample.Deposit).includes('initialYield')
          ? thisSample.Deposit.initialYield * Product.TYPES[resourceId].massPerUnit
          : undefined;
        return [thisSample, initialYieldTonnage];
      }
    }
    return [null, 0];
  }, [lot?.deposits, sampleId, resourceId]);

  // get lot abundance
  const lotAbundances = useMemo(() => {
    if (!asteroid?.Celestial?.abundances || !lot?.id) return {};

    // TODO: do this in worker? takes about 200ms on decent cpu
    const lotIndex = Lot.toIndex(lot.id);
    const abundances = Asteroid.Entity.getAbundances(asteroid);
    return Object.keys(abundances).reduce((acc, r) => {
      if (abundances[r] > 0) {
        acc[r] = Asteroid.Entity.getAbundanceAtLot(asteroid, lotIndex, r)
      }
      return acc;
    }, {});
  }, [asteroid, lot]);

  const lotAbundance = resourceId ? lotAbundances[resourceId] : 0;

  const crewmates = currentSamplingAction?._crewmates || crew?._crewmates || [];
  const captain = crewmates[0];
  // console.log('Crewmate.ABILITY_IDS.CORE_SAMPLE_TIME', Crewmate.ABILITY_IDS.CORE_SAMPLE_TIME, crewmates.map((c) => c.Crewmate));
  const sampleTimeBonus = Crew.getAbilityBonus(Crewmate.ABILITY_IDS.CORE_SAMPLE_TIME, crewmates);
  const sampleQualityBonus = Crew.getAbilityBonus(Crewmate.ABILITY_IDS.CORE_SAMPLE_QUALITY, crewmates);
  const crewTravelBonus = Crew.getAbilityBonus(Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, crewmates);

  const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
    if (!asteroid?.id || !crew?._location?.lotId || !lot?.id || !drillSource?.lotIndex) return {};
    const crewLotIndex = Lot.toIndex(crew?._location?.lotId);
    return getTripDetails(asteroid.id, crewTravelBonus.totalBonus, crewLotIndex, [
      { label: `Retrieve ${Product.TYPES[175].name}`, lotIndex: drillSource.lotIndex },
      { label: 'Travel to Sampling Site', lotIndex: Lot.toIndex(lot.id) },
      { label: 'Return to Crew Station', lotIndex: crewLotIndex },
    ]);
  }, [asteroid?.id, crew?._location?.lotId, drillSource?.lotIndex, lot?.id, crewTravelBonus]);

  const sampleBounds = Deposit.getSampleBounds(lotAbundance, 0, sampleQualityBonus.totalBonus);
  const sampleTime = Deposit.getSampleTime(sampleTimeBonus.totalBonus);

  const stats = useMemo(() => ([
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
          crewRequired="duration" />
      )
    },
    {
      label: 'Sample Time',
      value: formatTimer(sampleTime),
      direction: getBonusDirection(sampleTimeBonus),
      isTimeStat: true,
      tooltip: sampleTimeBonus.totalBonus !== 1 && (
        <TimeBonusTooltip
          bonus={sampleTimeBonus}
          title="Sample Time"
          totalTime={sampleTime}
          crewRequired="duration" />
      )
    },
    {
      label: 'Discovery Minimum',
      value: `${formatSampleMass(sampleBounds.lower)} tonnes`,
      direction: sampleQualityBonus.totalBonus > 1 ? getBonusDirection(sampleQualityBonus) : 0,
      tooltip: sampleQualityBonus.totalBonus > 1 && (
        <MaterialBonusTooltip
          bonus={sampleQualityBonus}
          title="Minimum Yield"
          titleValue={`${formatSampleMass(sampleBounds.lower)} tonnes`} />
      )
    },
    {
      label: 'Discovery Maximum',
      value: `${formatSampleMass(sampleBounds.upper)} tonnes`,
      direction: sampleQualityBonus.totalBonus < 1 ? getBonusDirection(sampleQualityBonus) : 0,
      tooltip: sampleQualityBonus.totalBonus < 1 && (
        <MaterialBonusTooltip
          bonus={sampleQualityBonus}
          title="Maximum Yield"
          titleValue={`${formatSampleMass(sampleBounds.upper)} tonnes`} />
      )
    },
  ]), [crewTravelBonus, crewTravelTime, sampleBounds, sampleQualityBonus, sampleTime, tripDetails]);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (['READY'].includes(lastStatus.current)) {
      if (samplingStatus !== lastStatus.current) {
        props.onClose();
      }
    }
    lastStatus.current = samplingStatus;
  }, [samplingStatus]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <NewCoreSampleIcon />,
          label: 'Prospect',
        }}
        captain={captain}
        location={{ asteroid, lot }}
        crewAvailableTime={crewTravelTime + sampleTime}
        taskCompleteTime={crewTravelTime + sampleTime}
        onClose={props.onClose}
        stage={stage} />

      <ActionDialogBody>
        {stage === actionStage.COMPLETED && (
          <FlexSection>
            <FlexSectionInputBlock
              title="Discovered"
              image={<ResourceThumbnail resource={Product.TYPES[resourceId]} tooltipContainer="none" />}
              label={`${Product.TYPES[resourceId]?.name} Deposit`}
              disabled
              style={{ width: '100%' }}
              sublabel={initialYieldTonnage && (
                <SublabelBanner color={theming[actionStage.COMPLETED].highlight}>
                  <ResourceIcon /> {formatSampleMass(initialYieldTonnage)}t
                </SublabelBanner>
              )}
            />
          </FlexSection>
        )}
        {stage !== actionStage.COMPLETED && (
          <FlexSection>
            <FlexSectionInputBlock
              title="Resource"
              image={
                resourceId
                  ? <ResourceThumbnail resource={Product.TYPES[resourceId]} tooltipContainer="none" />
                  : <EmptyResourceImage iconOverride={<ResourceIcon />} />
              }
              isSelected={stage === actionStage.NOT_STARTED}
              label={resourceId ? Product.TYPES[resourceId].name : 'Select'}
              onClick={() => setResourceSelectorOpen(true)}
              disabled={stage !== actionStage.NOT_STARTED}
              sublabel={
                resourceId
                ? <><b style={{ color: 'white' }}>{formatFixed(100 * lotAbundance, 0)}%</b> Lot Abundance</>
                : 'Resource'
              }
            />
            
            <FlexSectionSpacer />

            <FlexSectionInputBlock
              title="Tool"
              image={
                drillSource
                  ? <ResourceThumbnail badge="1" resource={Product.TYPES[175]} tooltipContainer="none" />
                  : <EmptyResourceImage />
              }
              isSelected={stage === actionStage.NOT_STARTED}
              label={drillSource ? 'Core Drill' : 'Select'}
              onClick={() => setSourceSelectorOpen(true)}
              disabled={stage !== actionStage.NOT_STARTED}
              sublabel={drillSource ? 'Tool' : 'Select'}
            />
          </FlexSection>
        )}

        {stage !== actionStage.NOT_STARTED && stage !== actionStage.COMPLETED && (
          <ProgressBarSection
            finishTime={currentSamplingAction?.finishTime}
            startTime={currentSamplingAction?.startTime}
            stage={stage}
            title="Progress"
            totalTime={crewTravelTime + sampleTime}
          />
        )}

        <ActionDialogStats
          stage={stage}
          stats={stats} />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={lotAbundance === 0 || !drillSource}
        goLabel="Prospect"
        onGo={() => startSampling(resourceId, drillSource)}
        finalizeLabel="Analyze"
        onFinalize={finishSampling}
        stage={stage}
        {...props} />

      {stage === actionStage.NOT_STARTED && (
        <>
          <ResourceSelectionDialog
            abundances={lotAbundances}
            initialSelection={resourceId}
            lotId={lot?.id}
            onClose={() => setResourceSelectorOpen(false)}
            onSelected={onSelectResource}
            open={resourceSelectorOpen}
          />

          <InventorySelectionDialog
            otherLotId={lot?.id}
            itemIds={[175]}
            onClose={() => setSourceSelectorOpen(false)}
            onSelected={setDrillSource}
            open={sourceSelectorOpen}
            requirePresenceOfItemIds
          />
        </>
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  const coreSampleManager = useCoreSampleManager(lot?.id);
  const { actionStage } = coreSampleManager;

  useEffect(() => {
    if (!asteroid || !lot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  return (
    <ActionDialogInner
      actionImage={coreSampleBackground}
      isLoading={reactBool(isLoading)}
      stage={actionStage}>
      <NewCoreSample
        asteroid={asteroid}
        lot={lot}
        coreSampleManager={coreSampleManager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
