import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { usePopper } from 'react-popper';
import ReactTooltip from 'react-tooltip';
import { Delivery, Inventory, Product } from '@influenceth/sdk';

import Dropdown from '~/components/Dropdown';
import { CheckedIcon, DotsIcon, UncheckedIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import useActionButtons from '~/hooks/useActionButtons';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { formatFixed } from '~/lib/utils';
import theme from '~/theme';
import actionButtons from '../actionButtons';
import { formatMass, formatResourceAmount, formatVolume } from '../actionDialogs/components';
import { Tray, TrayLabel } from './components';

const resourceItemWidth = 83;

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  flex: 1;
  height: 100%;
`;

const InnerWrapper = styled.div`
  border-radius: 10px 0 0 10px;
  display: flex;
  flex-direction: column;
  height: 100%;
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
  align-content: flex-start;
  display: grid;
  flex: 1;
  grid-gap: 4px;
  grid-template-columns: repeat(4, ${resourceItemWidth}px);
  flex-direction: row;
  flex-wrap: wrap;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 1px;
  padding-right: 10px;
  margin-right: -10px;
`;

const StackSplitButton = styled.span`
  align-items: center;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 5px;
  color: white;
  display: flex;
  height: 24px;
  left: 4px;
  justify-content: center;
  opacity: 0;
  position: absolute;
  top: 4px;
  transition: background 250ms ease, opacity 250ms ease;
  width: 24px;
  z-index: 2;
  ${p => p.isSplitting && `
    background: rgba(${p.theme.colors.mainRGB}, 0.7);
    opacity: 1;
  `}

  &:hover {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.7);
  }
`;

const ThumbnailWrapper = styled.div`
  cursor: ${p => p.theme.cursors.active};
  height: ${resourceItemWidth}px;
  position: relative;
  width: ${resourceItemWidth}px;
  & > div {
    height: 100%;
    width: 100%;

    & > div {
      transition: background-color 250ms ease;
    }

    ${p => p.selected && `
      border-color: ${p.theme.colors.main};
      & > div {
        background-color: rgba(${p.theme.colors.mainRGB}, 0.15);
      }
      & > svg {
        stroke: ${p.theme.colors.main};
      }
    `};
  }

  &:hover {
    opacity: 0.8;
    & > div {
      border-color: ${p => p.theme.colors.main};
      & > div {
        background-color: rgba(${p => p.theme.colors.mainRGB}, 0.05);
      }
      & > svg {
        stroke: ${p => p.theme.colors.main};
      }
    }
    ${StackSplitButton} {
      opacity: 1;
    }
  }
`;

const sortOptions = ['Name', 'Mass', 'Volume'];

const StackSplitter = styled.div`
  background: black;
  padding: 6px;
  pointer-events: all;
  label {
    display: block;
    font-size: 14px;
    margin-bottom: 4px;
    text-align: center;
  }
`;

const QuantaInput = styled.input`
  background: rgba(${p => p.theme.colors.mainRGB}, 0.2);
  border: 1px solid ${p => p.theme.colors.main};
  color: white;
  font-family: inherit;
  font-size: 16px;
  text-align: right;
  width: 100%;
`;

const StackSplitterPopper = ({ children, referenceEl }) => {
  const [popperEl, setPopperEl] = useState();
  const { styles, attributes } = usePopper(referenceEl, popperEl, {
    placement: 'top',
    modifiers: [
      {
        name: 'flip',
        options: {
          fallbackPlacements: ['top-start', 'top-end', 'right', 'left'],
        },
      },
    ],
  });

  return createPortal(
    <div ref={setPopperEl} style={{ ...styles.popper, zIndex: 1000, pointerEvents: 'none' }} {...attributes.popper}>
      {children}
    </div>,
    document.body
  );
}

const LotInventory = () => {
  const { props: actionProps } = useActionButtons();
  const lotId = useStore(s => s.asteroids.lot);
  const { data: lot } = useLot(lotId);

  const [amount, setAmount] = useState();
  const [focused, setFocused] = useState();
  const [order, setOrder] = useState(sortOptions[0]);
  const [displayVolumes, setDisplayVolumes] = useState(true);
  const [selectedItems, setSelectedItems] = useState({});
  const [splittingResourceId, setSplittingResourceId] = useState();

  const resourceItemRefs = useRef([]);

  const inventory = Object.values(lot?.building?.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE);
  inventory.contentsObj = useMemo(() => {
    return inventory?.contents?.reduce((acc, c) => {
      acc[c.product] = c.amount;
      return acc;
    }, {});
  }, [inventory?.contents])

  const { used, usedOrReserved } = useMemo(() => {
    if (!inventory) {
      return {
        used: 0,
        usedOrReserved: 0,
      };
    }

    const mass = inventory?.mass || 0;
    const reservedMass = inventory?.reservedMass || 0;
    const volume = inventory?.volume || 0;
    const reservedVolume = inventory?.reservedVolume || 0;

    // TODO: use Inventory.getFilledCapacity() instead?
    const inventoryConfig = Inventory.getType(inventory.inventoryType) || {};
    const massUsage = mass / inventoryConfig.massConstraint;
    const massReservedUsage = reservedMass / inventoryConfig.massConstraint;
    const volumeUsage = volume / inventoryConfig.volumeConstraint;
    const volumeReservedUsage = reservedVolume / inventoryConfig.volumeConstraint;
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
    if (!inventory?.contentsObj) return [];
    return Object.keys(inventory.contentsObj).sort((a, b) => {
      if (order === 'Mass') return inventory.contentsObj[a] * Product.TYPES[a].massPerUnit > inventory.contentsObj[b] * Product.TYPES[b].massPerUnit ? -1 : 1;
      else if (order === 'Volume') return inventory.contentsObj[a] * Product.TYPES[a].volumePerUnit > inventory.contentsObj[b] * Product.TYPES[b].volumePerUnit ? -1 : 1;
      return Product.TYPES[a].name < Product.TYPES[b].name ? -1 : 1;
    });
  }, [inventory?.contentsObj, order]);

  const isIncomingDelivery = useMemo(() => {
    return (lot?.deliveries || []).find((d) => d.Delivery.status !== Delivery.STATUSES.COMPLETE)  
  }, [lot]);

  const handleSelected = useCallback((resourceId, newTotal) => {
    setSelectedItems((s) => {
      const newS = { ...s };
      if (newTotal === 0) {
        delete newS[resourceId];
      } else {
        newS[resourceId] = newTotal;
      }
      return newS;
    });
  }, []);

  const splitStack = useCallback((resourceId) => (e) => {
    e.stopPropagation();
    setSplittingResourceId(resourceId);
    setAmount(selectedItems[resourceId] || inventory?.contentsObj[resourceId] || 0);
  }, [selectedItems, inventory?.contentsObj]);

  const onChangeAmount = useCallback((e) => {
    let newValue = parseInt(e.target.value.replace(/^0+/g, '').replace(/[^0-9]/g, ''));
    if (!(newValue > -1)) newValue = 0;
    if (newValue > e.target.max) newValue = e.target.max;
    setAmount(newValue);
  }, []);

  const onKeyDown = useCallback((e) => {
    if (['Enter', 'Tab'].includes(e.key) && e.currentTarget.value) {
      handleSelected(splittingResourceId, amount);
      setFocused(false);
      setSplittingResourceId();
    }
  }, [amount, splittingResourceId]);

  const onMouseLeave = useCallback(() => {
    if (!focused) {
      setSplittingResourceId();
    }
  }, [focused]);

  const onFocusAmount = useCallback((e) => {
    if (e.type === 'focus') {
      setFocused(true);
    } else {
      setFocused(false);
      setSplittingResourceId();
    }
  }, []);

  const trayLabel = useMemo(() => {
    const selectedTally = Object.keys(selectedItems).length;
    if (selectedTally > 0) {
      const [totalMass, totalVolume] = Object.keys(selectedItems).reduce((acc, resourceId) => {
        acc[0] += selectedItems[resourceId] * Product.TYPES[resourceId].massPerUnit;
        acc[1] += selectedItems[resourceId] * Product.TYPES[resourceId].volumePerUnit;
        return acc;
      }, [0, 0]);
      return `${selectedTally} Product${selectedTally === 1 ? '' : 's'}: ${formatMass(totalMass)} | ${formatVolume(totalVolume)}`;
    }
    return null;
  }, [selectedItems]);

  useEffect(() => ReactTooltip.rebuild(), []);

  if (!inventory === 0) return null;
  return (
    <>
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
                onChange={(l) => setOrder(sortOptions[l])}
                size="legacy"
                style={{ width: 160 }} />
            </div>
          </Controls>
          <InventoryItems>
            {splittingResourceId && (
              <StackSplitterPopper referenceEl={resourceItemRefs.current[splittingResourceId]}>
                <StackSplitter onMouseLeave={onMouseLeave}>
                  <label>Selected Amount ({Product.TYPES[splittingResourceId].isAtomic ? '' : 'kg'})</label>
                  <QuantaInput
                    type="number"
                    max={inventory.contentsObj[splittingResourceId]}
                    min={0}
                    onBlur={onFocusAmount}
                    onChange={onChangeAmount}
                    onKeyDown={onKeyDown}
                    onFocus={onFocusAmount}
                    step={1}
                    value={amount} />
                </StackSplitter>
              </StackSplitterPopper>
            )}
            {sortedResources.map((resourceId) => (
              <ThumbnailWrapper
                key={resourceId}
                onClick={() => handleSelected(resourceId, selectedItems[resourceId] > 0 ? 0 : inventory.contentsObj[resourceId])}
                selected={selectedItems[resourceId]}>
                <StackSplitButton
                  ref={ref => (resourceItemRefs.current[resourceId] = ref)}
                  onClick={splitStack(resourceId)}
                  isSplitting={splittingResourceId === resourceId}>
                  <DotsIcon />
                </StackSplitButton>
                <ResourceThumbnail
                  badge={formatResourceAmount(selectedItems[resourceId] || inventory.contentsObj[resourceId], resourceId)}
                  badgeColor={
                    selectedItems[resourceId]
                    ? (
                      selectedItems[resourceId] === inventory.contentsObj[resourceId]
                      ? theme.colors.main
                      : theme.colors.orange
                    )
                    : undefined
                  }
                  progress={displayVolumes
                    ? inventory.contentsObj[resourceId] * Product.TYPES[resourceId].volumePerUnit / inventory.volume
                    : undefined}
                  resource={Product.TYPES[resourceId]}
                  tooltipContainer="hudMenu" />
              </ThumbnailWrapper>
            ))}
          </InventoryItems>
        </InnerWrapper>
      </Wrapper>

      {(isIncomingDelivery || Object.keys(selectedItems).length > 0) && (
        <Tray>
          {trayLabel && <TrayLabel content={trayLabel} />}
          {Object.keys(selectedItems).length > 0 && (
            <actionButtons.SurfaceTransferOutgoing.Component {...actionProps} preselect={{ selectedItems }} />
          )}
          {isIncomingDelivery && (
            <actionButtons.SurfaceTransferIncoming.Component {...actionProps} />
          )}
        </Tray>
      )}
    </>
  );
};

export default LotInventory;