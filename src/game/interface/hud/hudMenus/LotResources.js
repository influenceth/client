import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Asteroid, Deposit, Lot, Product } from '@influenceth/sdk';

import useActionButtons from '~/hooks/useActionButtons';
import useAsteroid from '~/hooks/useAsteroid';
import useCoreSampleManager from '~/hooks/actionManagers/useCoreSampleManager';
import useExtractionManager from '~/hooks/actionManagers/useExtractionManager';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { HudMenuCollapsibleSection, Tray, trayHeight } from './components';
import { hexToRGB } from '~/theme';
import { CoreSampleIcon, PlusIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import useCrewContext from '~/hooks/useCrewContext';
import { formatFixed, keyify } from '~/lib/utils';
import actionButtons from '../actionButtons';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  max-height: calc(100% - ${trayHeight}px);
`;

const Circle = styled.div`
  background: currentColor;
  border-radius: 8px;
  display: inline-block;
  height: 8px;
  margin: 0 8px;
  width: 8px;
`;

const Row = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  font-size: 14px;
  padding: 2px 0;
  min-height: 32px;
  & > div:first-child {
    margin-left: 2px;
    margin-right: 6px;
  }
  & > label {
    flex: 1;
  }
  & > span {
    color: #999;
    padding-right: 8px;
  }
`;

const ShowMoreRow = styled(Row)`
  color: #777;
  cursor: ${p => p.theme.cursors.active};
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const Resource = styled(Row)`
  cursor: ${p => p.theme.cursors.active};
  &:hover {
    background: rgba(${p => hexToRGB(p.theme.colors.resources[p.category])}, 0.15);
  }
  ${p => p.selected && `
    background: rgba(${hexToRGB(p.theme.colors.resources[p.category])}, 0.3);
    label {
      color: white !important;
    }
    span {
      color: white;
    }
  `}

  ${Circle}, label, svg {
    color: ${p => p.theme.colors.resources[p.category]};
  }
`;

const Sample = styled(Resource)`
  & > svg {
    font-size: 22px;
  }
  & > label {
    color: white;
  }
`;

const Used = styled.span`
  color: ${p => p.theme.colors.error} !important;
`;
const Depleted = styled.span`
  color: ${p => p.theme.colors.error} !important;
`;
const InProgress = styled.span`
  color: ${p => p.theme.colors.main} !important;
`;


const LotResources = () => {
  const { props: actionProps } = useActionButtons();
  const { crew } = useCrewContext();
  const lotId = useStore(s => s.asteroids.lot);
  const asteroidId = useMemo(() => Lot.toPosition(lotId).asteroidId, [lotId]);

  const { data: asteroid } = useAsteroid(asteroidId);
  const { data: lot } = useLot(lotId);
  const { currentSamplingAction } = useCoreSampleManager(lotId);
  const { currentExtraction } = useExtractionManager(lotId);

  const [showAllAbundances, setShowAllAbundances] = useState();
  const [showAllSamples, setShowAllSamples] = useState();

  // get lot abundance
  const lotAbundances = useMemo(() => {
    if (!(asteroid && lot)) return [];

    // TODO: do this in worker? takes about 200ms on decent cpu
    const lotIndex = Lot.toIndex(lot.id);
    const resourceAbundances = Asteroid.Entity.getAbundances(asteroid);
    return Object.keys(resourceAbundances || {})
      .reduce((acc, i) => {
        if (resourceAbundances[i] > 0) {
          acc.push({
            i,
            abundance: Asteroid.Entity.getAbundanceAtLot(asteroid, lotIndex, i)
          });
        }
        return acc;
      }, [])
      .sort((a, b) => b.abundance - a.abundance);
  }, [asteroid, lot]);

  const [selected, setSelected] = useState();

  const onClickResource = useCallback((id) => () => {
    setSelected({ type: 'resource', id });
  }, []);
  
  const onClickSample = useCallback((id) => () => {
    setSelected({ type: 'sample', id });
  }, []);

  const [showAbundances, abundancesTruncated] = useMemo(() => {
    if (showAllAbundances || lotAbundances.length < 8) {
      return [lotAbundances, false];
    } else {
      return [lotAbundances.slice(0, 5), true];
    }
  }, [lotAbundances, showAllAbundances]);

  const [ownedSamples, depletedSamples] = useMemo(() => ([
    (lot?.deposits || [])
      .filter((s) => s.Control.controller.id === crew?.id)
      .filter((s) => showAllSamples || !s.Deposit.initialYield || s.Deposit.remainingYield > 0)
      .sort((a, b) => {
        if (!a.Deposit.initialYield && !b.Deposit.initialYield) {
          return b.Deposit.remainingYield - a.Deposit.remainingYield;
        }
        return b.Deposit.initialYield ? -1 : 1;
      }),
    (lot?.deposits || [])
    .filter((s) => s.Control.controller.id === crew?.id)
      .filter((s) => s.Deposit.initialYield > 0 && s.Deposit.remainingYield === 0),
  ]), [crew?.id, lot?.deposits, showAllSamples]);

  const getSampleYield = useCallback((sample) => {
    if (sample.Deposit.initialYield) {
      if (sample.Deposit.remainingYield > 0) {
        if (sample.Deposit.initialYield === sample.Deposit.remainingYield) {
          return `${formatFixed(sample.Deposit.remainingYield / 1e3, 0)} t`;
        }
        return <>{formatFixed(sample.Deposit.remainingYield / 1e3, 0)} t <Used>(partial)</Used></>;
      }
      return <Depleted>Depleted</Depleted>;
    }
    return <InProgress>In progress...</InProgress>;
  }, []);

  const selectedResource = useMemo(() => {
    if (selected && selected.type === 'resource') {
      return Product.TYPES[selected.id];
    }
    return null;
  }, [selected]);

  const selectedSample = useMemo(() => {
    if (selected && selected.type === 'sample') {
      return ownedSamples.find((s) => selected.id === s.id);
    }
    return null;
  }, [ownedSamples, selected]);

  const extraSampleParams = useMemo(() => {
    const params = {};
    if (!currentSamplingAction) {
      if (selectedResource?.id) {
        params.overrideResourceId = Number(selectedResource?.id);
      } else if (selectedSample) {
        params.improveSample = { ...selectedSample };
        params._disabled = !(selectedSample?.Deposit?.status === Deposit.STATUSES.SAMPLED && selectedSample?.Deposit?.initialYield === selectedSample?.Deposit?.remainingYield);
      }
    }
    return params;
  }, [currentSamplingAction, selectedResource, selectedSample]);

  const extraExtractParams = useMemo(() => {
    const params = {};
    if (!currentExtraction) {
      if (selectedSample) {
        params.preselect = { ...selectedSample };
        if (selectedSample.Deposit?.remainingYield === 0) {
          params._disabled = true;
        }
      }
    }
    return params;
  }, [currentExtraction, selectedSample]);

  const sampleTally = showAllSamples
    ? (ownedSamples.length - depletedSamples.length)
    : ownedSamples.length;
  
  // TODO: for core samples, style more like original mock

  // TODO: also consider one-at-a-time accordion or larger min-height
  //  OR someother flex strategy

  return (
    <>
      <Wrapper>
          <HudMenuCollapsibleSection titleText="Lot Resources" titleLabel="Abundance">
            <div style={{ height: '100%', overflow: 'hidden' }}>
            {showAbundances.map(({ i, abundance }) => {
              const { name, category } = Product.TYPES[i];
              const categoryKey = keyify(category);
              const isSelected = selected?.type === 'resource' && selected?.id === i;
              return (
                <Resource
                  key={i}
                  category={categoryKey}
                  onClick={onClickResource(i)}
                  selected={isSelected}>
                  {isSelected
                    ? <ResourceThumbnail resource={Product.TYPES[i]} size="75px" tooltipContainer="null" />
                    : <Circle />}
                  <label>{name}</label>
                  <span>{(abundance * 100).toFixed(1)}%</span>
                </Resource>
              );
            })}
            {abundancesTruncated && (
              <ShowMoreRow onClick={() => setShowAllAbundances(true)}>
                <PlusIcon />
                <label>
                  Show {lotAbundances.length - 5} more...
                </label>
              </ShowMoreRow>
            )}
            </div>
          </HudMenuCollapsibleSection>
          
          <HudMenuCollapsibleSection titleText="Core Samples" titleLabel={`${sampleTally} Sample${sampleTally === 1 ? '' : 's'}`}>
            {ownedSamples.map((sample) => {
              const { name, category } = Product.TYPES[sample.Deposit.resource];
              const categoryKey = keyify(category);
              const isSelected = selected?.type === 'sample' && selected?.id === sample.id;
              return (
                <Sample
                  key={sample.id}
                  category={categoryKey}
                  onClick={onClickSample(sample.id)}
                  selected={isSelected}>
                  {isSelected
                    ? (
                      <ResourceThumbnail
                        resource={Product.TYPES[sample.Deposit.resource]}
                        iconBadge={<CoreSampleIcon />}
                        size="75px"
                        tooltipContainer="hudeMenu" />
                    )
                    : <CoreSampleIcon />}
                  <label>{name}{isSelected ? '' : ' Deposit'}</label>
                  <span>{getSampleYield(sample)}</span>
                </Sample>
              );
            })}
            {!showAllSamples && depletedSamples?.length > 0 && (
              <ShowMoreRow onClick={() => setShowAllSamples(true)}>
                <PlusIcon />
                <label>
                  Show {depletedSamples.length} depleted...
                </label>
              </ShowMoreRow>
            )}
          </HudMenuCollapsibleSection>
          
          <HudMenuCollapsibleSection titleText="For Sale" titleLabel={`0 Samples`} borderless collapsed>
          </HudMenuCollapsibleSection>
      </Wrapper>

      {(currentSamplingAction || selectedResource || selectedSample || currentExtraction) && (
        <Tray>
          <>
            {(currentSamplingAction || selectedResource || selectedSample) && (
              <actionButtons.CoreSample {...actionProps} {...extraSampleParams} />
            )}
            {/* TODO: list sample for sale */}
            {/* TODO: purchase sample for sale (if one is selected) */}
            {(currentExtraction || selectedSample) && (
              <actionButtons.Extract {...actionProps} {...extraExtractParams} />
            )}
          </>
        </Tray>
      )}
    </>
  );
};

export default LotResources;