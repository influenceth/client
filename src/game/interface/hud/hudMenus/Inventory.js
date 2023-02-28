import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';
import { Inventory } from '@influenceth/sdk';

import Dropdown from '~/components/Dropdown';
import { CheckedIcon, UncheckedIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import { useResourceAssets } from '~/hooks/useAssets';
import usePlot from '~/hooks/usePlot';
import useStore from '~/hooks/useStore';
import { formatFixed } from '~/lib/utils';
import { formatResourceAmount } from '../actionDialogs/components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
`;

const InnerWrapper = styled.div`
  border-radius: 10px 0 0 10px;
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  width: 100%;
  & > div {
    margin-bottom: 15px;
    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const StorageTotal = styled.div`
  align-items: center;
  color: #888;
  display: flex;
  flex-direction: row;
  font-size: 14px;
  padding-bottom: 4px;
  & label {
    flex: 1;
    font-size: 90%;
  }
  & > span {
    color: white;
    font-weight: normal;
    color: ${p =>
      p.utilization < 0.7
      ? p.theme.colors.success
      : (
        p.utilization < 0.9
        ? p.theme.colors.yellow
        : p.theme.colors.error
      )
    };
  }
`;

const ProgressBar = styled.div`
  background: #333;
  border-radius: 3px;
  height: 3px;
  position: relative;
  width: 100%;

  &:after {
    content: "";
    background: ${p => p.theme.colors.main};
    border-radius: 3px;
    position: absolute;
    left: 0;
    height: 100%;
    width: ${p => Math.min(1, p.progress) * 100}%;
  }
  ${p => p.secondaryProgress && `
    &:before {
      content: "";
      background: white;
      border-radius: 3px;
      position: absolute;
      left: 0;
      height: 100%;
      width: ${Math.min(1, p.secondaryProgress) * 100}%;
    }
  `}
`;

const Controls = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 10px;
  position: relative;
  width: 100%;
  z-index: 1;

  & > label {
    align-items: center;
    cursor: ${p => p.theme.cursors.active};
    display: flex;
    flex-direction: row;
    & > svg {
      color: ${p => p.theme.colors.main};
    }
    & > span {
      color: #999;
      font-size: 85%;
      margin-left: 4px;
      transition: color 250ms ease;
    }
    &:hover > span {
      color: white;
    }
  }
`;

const InventoryItems = styled.div`
  display: grid;
  flex: 1;
  grid-gap: 4px;
  grid-template-columns: repeat(4, 83px);
  flex-direction: row;
  flex-wrap: wrap;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 1px;
  padding-right: 10px;
  margin-right: -10px;
  & > div {
    height: 83px;
    width: 83px;
  }
`;

const sortOptions = ['Name', 'Mass', 'Volume'];

const PlotInventory = () => {
  const { asteroidId, plotId } = useStore(s => s.asteroids.plot) || {};
  const { data: plot } = usePlot(asteroidId, plotId);
  const resources = useResourceAssets();

  const [order, setOrder] = useState(sortOptions[0]);
  const [displayVolumes, setDisplayVolumes] = useState(true);

  const inventory = plot?.building?.inventories ? plot?.building?.inventories[1] : null;
  const { used, usedOrReserved } = useMemo(() => {
    if (!inventory) {
      return {
        used: 0,
        usedOrReserved: 0,
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
        used: volumeUsage,
        usedOrReserved: volumeUsage + volumeReservedUsage,
      };
    }
    return {
      used: massUsage,
      usedOrReserved: massUsage + massReservedUsage,
    };

  }, [inventory]);

  const toggleVolumeDisplay = useCallback(() => {
    setDisplayVolumes((d) => !d);
  }, []);

  const sortedResources = useMemo(() => {
    if (!inventory?.resources) return [];
    console.log('inventory.resources', inventory.resources);
    return Object.keys(inventory.resources).sort((a, b) => {
      if (order === 'Mass') return inventory.resources[a] * resources[a].massPerUnit > inventory.resources[b] * resources[b].massPerUnit ? -1 : 1;
      else if (order === 'Volume') return inventory.resources[a] * resources[a].volumePerUnit > inventory.resources[b] * resources[b].volumePerUnit ? -1 : 1;
      return resources[a].name < resources[b].name ? -1 : 1;
    });
  }, [inventory?.resources, order]);

  useEffect(() => ReactTooltip.rebuild(), []);

  if (!inventory === 0) return null;
  return (
    <Wrapper>
      <InnerWrapper>
        <div>
          <StorageTotal utilization={usedOrReserved}>
            <label>Used Capacity:</label>
            <span>
              {usedOrReserved > 0 && usedOrReserved < 0.01 ? '> ' : ''}{formatFixed(100 * usedOrReserved, 1)}%
            </span>
          </StorageTotal>
          <ProgressBar progress={used} secondaryProgress={usedOrReserved} />
        </div>
        <Controls>
          <label onClick={toggleVolumeDisplay}>
            {displayVolumes ? <CheckedIcon /> : <UncheckedIcon />}
            <span>Show Volumes</span>
          </label>
          <div>
            <Dropdown
              options={sortOptions}
              onChange={(l) => setOrder(l)}
              width="160px" />
          </div>
        </Controls>
        <InventoryItems>
          {sortedResources.map((resourceId) => (
            <ResourceThumbnail
              key={resourceId}
              badge={formatResourceAmount(inventory.resources[resourceId], resourceId)}
              progress={displayVolumes
                ? inventory.resources[resourceId] * resources[resourceId].volumePerUnit / (1E-6 * plot.building.inventories[1]?.volume)
                : undefined}
              resource={resources[resourceId]}
              showTooltip={true} />
          ))}
        </InventoryItems>
      </InnerWrapper>
    </Wrapper>
  );
};

export default PlotInventory;