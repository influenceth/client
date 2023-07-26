import { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';
import { Inventory } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';
import useLot from '~/hooks/useLot';
import { ResourceImage } from '~/components/ResourceThumbnail';
import { formatResourceAmount } from './actionDialogs/components';
import { formatFixed } from '~/lib/utils';

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

const LotInventory = ({ active }) => {
  const { asteroidId, lotId } = useStore(s => s.asteroids.lot || {});
  const { data: lot } = useLot(asteroidId, lotId);

  const inventory = (lot?.building?.inventories || []).find((i) => !i.locked);

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

    const mass = 1E-6 * inventory.mass || 0;
    const reservedMass = 1E-6 * inventory.reservedMass || 0;
    const volume = 1E-6 * inventory.volume || 0;
    const reservedVolume = 1E-6 * inventory.reservedVolume || 0;

    const massUsage = mass / Inventory.TYPES[inventory.inventoryType].mass;
    const massReservedUsage = reservedMass / Inventory.TYPES[inventory.inventoryType].mass;
    const volumeUsage = volume / Inventory.TYPES[inventory.inventoryType].volume;
    const volumeReservedUsage = reservedVolume / Inventory.TYPES[inventory.inventoryType].volume;
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
            <label>Stored:</label>
            <span>
              <b>{activeUse > 0 && activeUse < 0.05 ? '> ' : ''}{formatFixed(activeUse, 1)}</b> / {Inventory.TYPES[inventory.inventoryType][massOrVolume || 'mass'].toLocaleString()}{' '}
              {massOrVolume === 'volume' ? <>m<sup>3</sup></> : 'tonnes'}
            </span>
          </StorageTotal>
          {reservedUse > 0 && (
            <StorageTotal>
              <label>Reserved:</label>
              <span>
                <b>{reservedUse > 0 && reservedUse < 0.05 ? '> ' : ''}{formatFixed(reservedUse, 1)}</b> / {Inventory.TYPES[inventory.inventoryType][massOrVolume || 'mass'].toLocaleString()}{' '}
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
              resource={Product.TYPES[resourceId]} />
          ))}
        </InventoryItems>
      </InnerWrapper>
    </Wrapper>
  );
};

export default LotInventory;