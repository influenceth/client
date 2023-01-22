import { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';
import { Inventory } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';
import usePlot from '~/hooks/usePlot';
import { formatResourceAmount, ResourceImage } from './actionDialogs/components';
import { useResourceAssets } from '~/hooks/useAssets';

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
`;

const InnerWrapper = styled.div`
  background: rgba(0, 0, 0, 0.6);
  border-radius: 10px 0 0 10px;
  display: flex;
  flex-direction: column;
  margin-right: -32px;
  max-height: 350px;
  padding: 10px 32px 10px 20px;
  pointer-events: all;
  width: 306px;
`;

const StorageTotal = styled.div`
  align-items: center;
  color: #888;
  display: flex;
  flex-direction: row;
  padding-bottom: 4px;
  & label {
    flex: 1;
    font-size: 90%;
  }
  & > span > b {
    color: white;
    font-weight: normal;
  }
`;

const ProgressBar = styled.div`
  background: #333;
  border-radius: 3px;
  height: 5px;
  position: relative;
  width: 100%;

  &:after {
    content: "";
    background: ${p => p.theme.colors.main};
    border-radius: 2px;
    position: absolute;
    left: 0;
    height: 100%;
    width: ${p => Math.min(1, p.progress) * 100}%;
  }
  ${p => p.secondaryProgress && `
    &:before {
      content: "";
      background: white;
      border-radius: 2px;
      position: absolute;
      left: 0;
      height: 100%;
      width: ${Math.min(1, p.secondaryProgress) * 100}%;
    }
  `}
`;

const InventoryItems = styled.div`
  display: grid;
  flex: 1;
  grid-gap: 8px;
  grid-template-columns: repeat(2, 122px);
  flex-direction: row;
  flex-wrap: wrap;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 1px;
  padding-right: 10px;
  margin-right: -10px;
  & > div {
    height: 120px;
    width: 120px;
  }
`;

const PlotInventory = ({ active }) => {
  const { asteroidId, plotId } = useStore(s => s.asteroids.plot) || {};
  const { data: plot } = usePlot(asteroidId, plotId);
  const resources = useResourceAssets();

  const inventory = plot?.building?.inventories ? plot?.building?.inventories[1] : null;
  const { progress, secondaryProgress, activeUse, reservedUse, massOrVolume } = useMemo(() => {
    if (!inventory) {
      return {
        progress: 0,
        secondaryProgress: 0,
        activeUse: 0,
        reservedUse: 0,
        massOrVolume: 'mass'
      };
    }

    const mass = 1E-6 * plot.building.inventories[1]?.mass || 0;
    const reservedMass = 1E-6 * plot.building.inventories[1]?.reservedMass || 0;
    const volume = 1E-6 * plot.building.inventories[1]?.volume || 0;
    const reservedVolume = 1E-6 * plot.building.inventories[1]?.reservedVolume || 0;

    const massUsage = mass / Inventory.CAPACITIES[1][1].mass;
    const massReservedUsage = reservedMass / Inventory.CAPACITIES[1][1].mass;
    const volumeUsage = volume / Inventory.CAPACITIES[1][1].volume;
    const volumeReservedUsage = reservedVolume / Inventory.CAPACITIES[1][1].volume;
    if (volumeUsage + volumeReservedUsage > massUsage + massReservedUsage) {
      return {
        progress: volumeUsage,
        secondaryProgress: volumeUsage + volumeReservedUsage,
        activeUse: volume,
        reservedUse: reservedVolume,
        massOrVolume: 'volume'
      };
    }
    return {
      progress: massUsage,
      secondaryProgress: massUsage + massReservedUsage,
      activeUse: mass,
      reservedUse: reservedMass,
      massOrVolume: 'mass'
    };

  }, [inventory]);

  useEffect(() => ReactTooltip.rebuild(), []);

  if (!inventory === 0) return null;
  return (
    <Wrapper>
      <InnerWrapper>
        <div style={{ paddingBottom: 10 }}>
          <StorageTotal>
            <label>In Use:</label>
            <span>
              <b>{Math.ceil(activeUse).toLocaleString()}</b> / {Inventory.CAPACITIES[1][1][massOrVolume || 'mass'].toLocaleString()}{' '}
              {massOrVolume === 'volume' ? <>m<sup>3</sup></> : 'tonnes'}
            </span>
          </StorageTotal>
          {reservedUse > 0 && (
            <StorageTotal>
              <label>Reserved:</label>
              <span>
                <b>{Math.ceil(reservedUse).toLocaleString()}</b> / {Inventory.CAPACITIES[1][1][massOrVolume || 'mass'].toLocaleString()}{' '}
                {massOrVolume === 'volume' ? <>m<sup>3</sup></> : 'tonnes'}
              </span>
            </StorageTotal>
          )}
          <ProgressBar progress={progress} secondaryProgress={secondaryProgress} />
        </div>
        <InventoryItems>
          {inventory?.resources && Object.keys(inventory.resources).map((resourceId) => (
            <ResourceImage
              key={resourceId}
              badge={formatResourceAmount(inventory.resources[resourceId], resourceId)}
              resource={resources[resourceId]}
              showTooltip={true} />
          ))}
        </InventoryItems>
      </InnerWrapper>
    </Wrapper>
  );
};

export default PlotInventory;