import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { css } from 'styled-components';
import { usePopper } from 'react-popper';
import ReactTooltip from 'react-tooltip';
import { Delivery, Inventory, Permission, Product } from '@influenceth/sdk';

import Dropdown from '~/components/Dropdown';
import { DotsIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import useActionButtons from '~/hooks/useActionButtons';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { formatFixed } from '~/lib/utils';
import theme from '~/theme';
import actionButtons from '../actionButtons';
import { formatMass, formatResourceAmount, formatVolume } from '../actionDialogs/components';
import { Tray, TrayLabel } from './components/components';
import useShip from '~/hooks/useShip';
import useDeliveries from '~/hooks/useDeliveries';
import TabContainer from '~/components/TabContainer';
import useCrewContext from '~/hooks/useCrewContext';

const resourceItemWidth = 83;

const tabContainerCss = css`
  color: white;
  font-size: 15px;
  flex: 1;
  height: 40px;
  margin: -6px;
`;

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

const Charts = styled.div`
  border-bottom: 1px solid #333;
  padding: 5px 0 15px;
  & > div:first-child {
    margin-bottom: 10px;
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

const sortOptions = ['Alphabetically', 'Mass', 'Volume'];

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
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const { data: lot } = useLot(lotId);
  const { data: ship } = useShip(zoomScene?.type === 'SHIP' && zoomScene.shipId);
  const entity = useMemo(() => ship || lot?.building, [lot, ship]);

  const { crew, crewCan } = useCrewContext();

  const inventories = useMemo(() => {
    return (entity?.Inventories || [])
      .filter((i) => i.status === Inventory.STATUSES.AVAILABLE)
      .map((i) => ({
        ...i,
        label: Inventory.TYPES[i.inventoryType].category,
        contentsObj: (i.contents || []).reduce((acc, c) => ({ ...acc, [c.product]: c.amount }), {})
      }))
      .sort((a, b) => a.label < b.label ? -1 : 1);
  }, [entity]);

  const [amount, setAmount] = useState();
  const [focused, setFocused] = useState();
  const [order, setOrder] = useState(sortOptions[0]);
  const [displayVolumes, setDisplayVolumes] = useState(true);
  const [inventorySlot, setInventorySlot] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});
  const [splittingResourceId, setSplittingResourceId] = useState();

  const resourceItemRefs = useRef([]);

  const canRemoveProducts = useMemo(
    () => crewCan(Permission.IDS.REMOVE_PRODUCTS, entity),
    [crewCan, entity]
  );

  // default slot
  useEffect(() => {
    if (inventorySlot === null) {
      setInventorySlot(inventories?.[0]?.slot || null);
    }
  }, [inventories]);

  useEffect(() => {
    setSelectedItems({}); // clear selected items when switching inventories
  }, [inventorySlot])

  const { data: incomingDeliveries } = useDeliveries(entity && inventorySlot ? { destination: entity, destinationSlot: inventorySlot } : undefined);

  // get selected inventory
  const inventory = useMemo(
    () => inventories.find((i) => i.slot === inventorySlot),
    [inventories, inventorySlot]
  );

  const { usedMass, usedOrReservedMass, usedVolume, usedOrReservedVolume } = useMemo(() => {
    if (!inventory) {
      return {
        usedMass: 0,
        usedOrReservedMass: 0,
        usedVolume: 0,
        usedOrReservedVolume: 0,
      };
    }

    // TODO: use Inventory.getFilledCapacity() instead?
    const inventoryConfig = Inventory.getType(inventory.inventoryType) || {};

    const mass = inventory?.mass || 0;
    const reservedMass = inventory?.reservedMass || 0;
    const massUsage = mass / inventoryConfig.massConstraint;
    const massReservedUsage = reservedMass / inventoryConfig.massConstraint;

    const volume = inventory?.volume || 0;
    const reservedVolume = inventory?.reservedVolume || 0;
    const volumeUsage = volume / inventoryConfig.volumeConstraint;
    const volumeReservedUsage = reservedVolume / inventoryConfig.volumeConstraint;

    return {
      usedMass: massUsage,
      usedOrReservedMass: massUsage + massReservedUsage,
      usedVolume: volumeUsage,
      usedOrReservedVolume: volumeUsage + volumeReservedUsage,
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
    return (incomingDeliveries || []).find((d) => d.Delivery.status !== Delivery.STATUSES.COMPLETE)  
  }, [incomingDeliveries]);

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
          {inventories?.length > 1 && (
            <div>
              <TabContainer
                containerCss={tabContainerCss}
                labelCss={{ flex: 1, textAlign: 'center' }}
                onChange={(v) => setInventorySlot(inventories[v].slot)}
                tabCss={{ flex: 1 }}
                tabs={inventories.map(({ label }) => ({ label }))}
              />
            </div>
          )}
          <Charts>
            <div>
              <StorageTotal utilization={usedOrReservedVolume}>
                <label>Volume</label>
                <span>
                  {usedOrReservedVolume > 0 && usedOrReservedVolume < 0.01 ? '> ' : ''}{formatFixed(100 * usedOrReservedVolume, 1)}%
                </span>
              </StorageTotal>
              <ProgressBar progress={usedVolume} secondaryProgress={usedOrReservedVolume} />
            </div>
            <div>
              <StorageTotal utilization={usedOrReservedMass}>
                <label>Mass</label>
                <span>
                  {usedOrReservedMass > 0 && usedOrReservedMass < 0.01 ? '> ' : ''}{formatFixed(100 * usedOrReservedMass, 1)}%
                </span>
              </StorageTotal>
              <ProgressBar progress={usedMass} secondaryProgress={usedOrReservedMass} />
            </div>
          </Charts>
          <Controls>
            <Dropdown
              background="transparent"
              options={sortOptions}
              onChange={(l) => setOrder(sortOptions[l])}
              size="small"
              textTransform="none"
              style={{ flex: 1, width: 170 }}
            />
            
            {/* TODO: mass / volume view toggle */}
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
            <actionButtons.SurfaceTransferOutgoing.Component
              {...actionProps}
              labelAddendum={canRemoveProducts ? '' : 'access restricted'}
              flags={{ disabled: !canRemoveProducts }}
              dialogProps={{ origin: entity, originSlot: inventorySlot, preselect: { selectedItems } }}
            />
          )}

          {/* TODO: may only care about incoming transfer if have permission here */}
          {/* TODO: is SurfaceTransferIncoming still supported? */}
          {isIncomingDelivery && (
            <actionButtons.SurfaceTransferIncoming.Component {...actionProps} />
          )}
        </Tray>
      )}
    </>
  );
};

export default LotInventory;