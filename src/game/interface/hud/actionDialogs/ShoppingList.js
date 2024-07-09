import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Asteroid, Building, Crewmate, Lot, Order, Product } from '@influenceth/sdk';

import {
  CheckedIcon,
  KeysIcon,
  MarketBuyIcon,
  SwayIcon,
  UncheckedIcon,
  WarningIcon
} from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import theme, { hexToRGB } from '~/theme';
import { reactBool, formatTimer, formatFixed, formatPrice, locationsArrToObj, getCrewAbilityBonuses, ordersToFills } from '~/lib/utils';

import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import {
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,

  FlexSection,
  FlexSectionInputBlock,
  ProgressBarSection,
  ActionDialogBody,
  BuildingInputBlock,
  FlexSectionSpacer,
  FlexSectionBlock,
  getBuildingRequirements,
  formatResourceAmount
} from './components';
import actionStage from '~/lib/actionStages';
import useRepoManager from '~/hooks/actionManagers/useRepoManager';
import CrewIndicator from '~/components/CrewIndicator';
import useCrew from '~/hooks/useCrew';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import useOrderSummaryByExchange from '~/hooks/useOrderSummaryByMarket';
import formatters from '~/lib/formatters';
import DataTableComponent from '~/components/DataTable';
import useSellOrderList from '~/hooks/useSellOrderList';
import useAsteroidBuildings from '~/hooks/useAsteroidBuildings';
import { TOKEN, TOKEN_SCALE } from '~/lib/priceUtils';

const ProductList = styled.div`
  width: 100%;
`;
const ProductHeader = styled.div`
  align-items: center;
  color: #999;
  display: flex;
  flex-direction: row;
  & > h4 {
    flex: 1;
    margin: 0;
    padding-left: 12px;
  }
  & > * {
    padding-right: 12px;
  }
`;
const ProductItem = styled.div`
  padding: 10px;
  &:not(:last-child) {
    border-bottom: 1px solid #333;
  }
  ${p => p.selected && `
    background: rgba(${p.theme.colors.mainRGB}, 0.2);
    ${ProductHeader} {
      color: white;
    }
  `}
`;

const Empty = styled.span`
  opacity: 0.33;
  text-transform: uppercase;
`;

const IconWrapper = styled.div`
  color: white;
  font-size: 22px;
  margin-right: 4px;
`;

const DataTableWrapper = styled.div`
  border-radius: 3px;
  margin-top: 6px;
  max-height: 256px;
  outline: 1px solid ${p => p.theme.colors.darkMain};
  overflow: auto;
  & > table {
    width: 100%;
  }
`;

const PriceField = styled.div`
  align-items: center;
  display: flex;
  & > div {
    align-items: center;
    display: flex;
    margin-right: 10px;
    min-width: 100px;
    & > div:last-child {
      flex: 1;
      font-family: 'Jetbrains Mono', sans-serif;
      text-align: right;
    }
  }
  & > small {
    opacity: 0.5;
  }
`;

const columns = [
  {
    key: 'selector',
    selector: (row, { isSelected }) => (
      isSelected ? <CheckedIcon style={{ color: theme.colors.brightMain }} /> : <UncheckedIcon />
    ),
    align: 'center',
    noMinWidth: true,
  },
  {
    key: 'marketplaceName',
    label: 'Marketplace',
    selector: (row, { tableState }) => (
      <>
        <span>{formatters.buildingName(row.marketplace || {})}</span>
      </>
    ),
    noMinWidth: true,
  },
  {
    key: 'distance',
    label: 'Distance',
    sortField: 'distance',
    alignBody: 'right',
    selector: row => `${formatFixed(row.distance, 1, 1)} km`,
    noMinWidth: true,
  },
  {
    key: 'price',
    label: 'Price (incl. fees)',
    sortField: '_dynamicUnitPrice',
    selector: (row, { tableState }) => (
      <PriceField>
        <div>
          <IconWrapper><SwayIcon /></IconWrapper>
          <div>{formatPrice(row._dynamicUnitPrice, { minPrecision: 4 })}</div>
        </div>
        <small>({row._dynamicSupply.toLocaleString()}{tableState.resource.isAtomic ? '' : ' kg'})</small>
      </PriceField>
    ),
    noMinWidth: true,
  }
];

const ProductMarketSummary = ({ asteroidId, crewBonuses, lotId, productId, onSelectionChange, targetAmount }) => {
  const [selected, setSelected] = useState([]);
  const [sort, setSort] = useState(['_dynamicUnitPrice', 'desc']);
  const [sortField, sortDirection] = sort;

  const { data: exchanges, isLoading: exchangesLoading } = useAsteroidBuildings(asteroidId, 'Exchange');

  // TODO: pass array of productIds... refetch every 30s while "not_started"
  // TODO: get all crews of marketplaces so can append enforcement bonus
  //  partition state at higher level
  //  select marketplaces at higher level... keep in state
  const { data: orders } = useSellOrderList(asteroidId, productId);

  const resourceMarketplaces = useMemo(() => {
    const buckets = {};
    if (!exchangesLoading) {
      (orders || []).forEach((o) => {
        const loc = locationsArrToObj(o.locations || []);
        if (!buckets[loc.buildingId]) {
          const marketplace = exchanges.find((e) => e.id === loc.buildingId);
          if (marketplace) {
            buckets[loc.buildingId] = {
              lotId: loc.lotId,
              buildingId: loc.buildingId,
              marketplace,
              distance: Asteroid.getLotDistance(asteroidId, Lot.toIndex(lotId), loc.lotIndex),
              supply: 0,
              orders: [],
            };
          }
        }
        if (buckets[loc.buildingId]) {
          buckets[loc.buildingId].supply += o.amount;
          buckets[loc.buildingId].orders.push(o);   // TODO: pare this down?
        }
      });
    }
    return buckets;
  }, [exchangesLoading, orders]);

  const selection = useMemo(() => {
    let needed = targetAmount;
    let totalPrice = 0;
    let maxDistance = 0;
    const allFills = [];
    const selectedAmounts = {};
    selected
      .map((buildingId) => resourceMarketplaces[buildingId])
      .sort((a, b) => a.supply - b.supply)
      .forEach((row) => {
        selectedAmounts[row.buildingId] = 0;
        maxDistance = Math.max(maxDistance, row.distance);

        const fills = ordersToFills(
          'buy',
          row.orders,
          needed,
          row.marketplace?.Exchange?.takerFee || 0,
          crewBonuses?.feeReduction?.totalBonus || 1,
          1, // TODO: feeEnforcementBonus?.totalBonus || 1
        );

        fills.forEach((fill) => {
          selectedAmounts[row.buildingId] += fill.fillAmount;
          needed -= fill.fillAmount;
          totalPrice += fill.fillPaymentTotal;
        });

        allFills.push(...fills);
      });

    return {
      needed,
      maxDistance,
      totalPrice: totalPrice / TOKEN_SCALE[TOKEN.SWAY],
      totalFilled: targetAmount - needed,
      fills: allFills,
      amounts: selectedAmounts
    }
  }, [selected]);

  const handleSelection = useCallback((buildingId) => {
    setSelected((s) => {
      if (s.includes(buildingId)) {
        return s.filter((b) => b !== buildingId);

      // if already filled, clear all --> select this one
      } else if (selection.needed === 0) {
        return [buildingId];

      // else, add this one
      } else {
        return [...s, buildingId];
      }
    });
  }, [selected]);

  useEffect(() => {
    onSelectionChange(selection);
  }, [selection]);

  const getRowProps = useCallback((row) => ({
    onClick: () => {
      handleSelection(row.buildingId);
    },
    isSelected: selected.includes(row.buildingId),
    tableState: { resource: Product.TYPES[productId] }
  }), [handleSelection, productId, selected]);

  // TODO: empty message

  // NOTE: this augments resourceMarketplaces, but updates less often
  const dynamicMarketplaces = useMemo(() => {
    return Object.values(resourceMarketplaces).map((m) => {
      const row = { ...m };
      row._isLimited = row.supply < targetAmount;
      // TODO: if selected, use selection amount
      row._dynamicSupply = Math.min(
        row.supply,
        selection.amounts[m.buildingId] || selection.needed || targetAmount
      );

      let marketFills = ordersToFills(
        'buy',
        row.orders,
        row._dynamicSupply,
        row.marketplace?.Exchange?.takerFee || 0,
        crewBonuses?.feeReduction?.totalBonus || 1,
        1, // TODO: feeEnforcementBonus?.totalBonus || 1
      );

      let total = marketFills.reduce((acc, cur) => acc + cur.fillPaymentTotal, 0) / TOKEN_SCALE[TOKEN.SWAY];
      row._dynamicTotalPrice = total;
      row._dynamicUnitPrice = total / row._dynamicSupply;
      row._fills = marketFills;
      return row;
    });
  }, [resourceMarketplaces, selection, targetAmount]);

  const handleSort = useCallback((field) => () => {
    if (!field) return;

    let updatedSortField = sortField;
    let updatedSortDirection = sortDirection;
    if (field === sortField) {
      updatedSortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      updatedSortField = field;
      updatedSortDirection = 'desc';
    }

    setSort([
      updatedSortField,
      updatedSortDirection
    ]);
  }, [sortDirection, sortField]);

  const sortedMarketplaces = useMemo(() => {
    return (dynamicMarketplaces || [])
      .sort((a, b) => (sortDirection === 'asc' ? 1 : -1) * (a[sortField] < b[sortField] ? 1 : -1));
  }, [dynamicMarketplaces, sortField, sortDirection]);

  return (
    <DataTableWrapper>
      <DataTableComponent
        columns={columns}
        data={sortedMarketplaces || []}
        getRowProps={getRowProps}
        keyField="lotId"
        onClickColumn={handleSort}
        sortDirection={sortDirection}
        sortField={sortField}
      />
    </DataTableWrapper>
  );
};


// TODO: ...
// destination may be input or selected
// if input, is locked

// if destination is site, recipe is hidden; else, can select recipe and multiple

const ShoppingList = ({ asteroid, lot, actionManager, stage, ...props }) => {
  const { } = actionManager;
  const { crew } = useCrewContext();

  // TODO: these are only relevant for site
  const { currentDeliveryActions } = useDeliveryManager({ destination: lot?.building });
  const buildingRequirements = useMemo(
    () => getBuildingRequirements(lot?.building, currentDeliveryActions),
    [lot?.building, currentDeliveryActions]
  );

  const crewBonuses = useMemo(() => {
    if (!crew) return [];

    const abilities = getCrewAbilityBonuses([
      Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME,
      Crewmate.ABILITY_IDS.FREE_TRANSPORT_DISTANCE,
      Crewmate.ABILITY_IDS.MARKETPLACE_FEE_REDUCTION,
    ], crew);
    return {
      hopperTransport: abilities[Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME],
      freeTransport: abilities[Crewmate.ABILITY_IDS.FREE_TRANSPORT_DISTANCE],
      feeReduction: abilities[Crewmate.ABILITY_IDS.MARKETPLACE_FEE_REDUCTION],
    }
  }, [crew]);

  // TODO: add these up
  const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => ([0, 0]), []);

  const shoppingList = useMemo(() => {
    return buildingRequirements.map((req) => ({
      product: Product.TYPES[req.i],
      amount: req.inNeed
    }));
  }, [buildingRequirements]);

  const [selectedProductId, setSelectedProductId] = useState();
  useEffect(() => {
    if (!!shoppingList) {
      setSelectedProductId(shoppingList[0].product.i);
    }
  }, [!!shoppingList]);

  const [selection, setSelection] = useState({});
  const handleSelectionChange = useCallback((productId) => (update) => {
    setSelection((s) => ({
      ...s,
      [productId]: update
    }));
  });

  const stats = useMemo(() => ([]), []);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <MarketBuyIcon />,
          label: 'Shopping List',
          status: stage === actionStage.NOT_STARTED ? 'Source Remaining Materials' : undefined,
        }}
        actionCrew={crew}
        location={{ asteroid, lot }}
        crewAvailableTime={crewTimeRequirement}
        taskCompleteTime={taskTimeRequirement}
        onClose={props.onClose}
        stage={stage} />

      <ActionDialogBody>
        {lot?.building?.Building?.status !== Building.CONSTRUCTION_STATUSES.PLANNED && (
          <FlexSection>
            <BuildingInputBlock
              title="Destination"
              building={lot?.building}
            />

            <FlexSectionSpacer />

            <div>Todo: Select a recipe and a multiple</div>
          </FlexSection>
        )}

        <FlexSection>
          <ProductList>
          {shoppingList.map(({ product, amount }, i) => (
            <ProductItem
              onClick={() => setSelectedProductId(product.i)}
              selected={selectedProductId === product.i}>
              <ProductHeader>
                <ResourceThumbnail resource={product} size="48px" />
                <h4>{product.name}</h4>
                <div>{formatResourceAmount(selection[product.i]?.totalFilled || 0, product.i)} filled of {formatResourceAmount(amount, product.i)}</div>
                <div>@ <SwayIcon /> <span>{formatPrice(selection[product.i]?.totalPrice / selection[product.i]?.totalFilled)}</span></div>
              </ProductHeader>
              {/* TODO: show amount sourced when in selected row of total supply */}
              {selectedProductId === product.i && (
                <ProductMarketSummary
                  asteroidId={asteroid?.id}
                  crewBonuses={crewBonuses}
                  lotId={lot?.id}
                  productId={product.i}
                  onSelectionChange={handleSelectionChange(product.i)}
                  targetAmount={amount} />
              )}
            </ProductItem>
          ))}
          </ProductList>
          
        </FlexSection>

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

        {stats?.length > 0 ? null : <div style={{ height: 20 }} />}
      </ActionDialogBody>

      <ActionDialogFooter
        goLabel="Purchase"
        onGo={() => {}}
        stage={stage}
        waitForCrewReady
        {...props} />
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  const actionManager = { actionStage: actionStage.NOT_STARTED };

  // TODO: for now, disable if planned building
  useEffect(() => {
    if (!asteroid || !lot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  return (
    <ActionDialogInner
      actionImage="Marketplace"
      isLoading={reactBool(isLoading)}
      stage={actionManager.actionStage}>
      <ShoppingList
        asteroid={asteroid}
        lot={lot}
        actionManager={actionManager}
        stage={actionManager.actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
