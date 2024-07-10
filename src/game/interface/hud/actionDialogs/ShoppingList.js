import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Asteroid, Building, Crew, Crewmate, Entity, Inventory, Lot, Permission, Product, Time } from '@influenceth/sdk';

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

  FlexSection,
  ActionDialogBody,
  BuildingInputBlock,
  FlexSectionSpacer,
  getBuildingRequirements,
  formatResourceAmount
} from './components';
import actionStage from '~/lib/actionStages';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import formatters from '~/lib/formatters';
import DataTableComponent from '~/components/DataTable';
import useShoppingListOrders from '~/hooks/useShoppingListOrders';
import useAsteroidBuildings from '~/hooks/useAsteroidBuildings';
import { TOKEN, TOKEN_SCALE } from '~/lib/priceUtils';
import api from '~/lib/api';
import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useLot from '~/hooks/useLot';

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

const Monospace = styled.div`
  font-family: 'Jetbrains Mono', sans-serif;
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
    selector: row => <Monospace>{formatFixed(row.distance, 1, 1)} km</Monospace>,
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

const ProductMarketSummary = ({
  crewBonuses,
  productId,
  resourceMarketplaces = [],
  selected = [],
  selectionSummary,
  onSelected,
  targetAmount
}) => {
  const [sort, setSort] = useState(['_dynamicUnitPrice', 'desc']);
  const [sortField, sortDirection] = sort;

  const getRowProps = useCallback((row) => ({
    onClick: () => {
      onSelected(row.buildingId);
    },
    isSelected: selected.includes(row.buildingId),
    tableState: { resource: Product.TYPES[productId] }
  }), [onSelected, productId, selected]);

  // TODO: empty message

  // NOTE: this augments resourceMarketplaces, but updates less often
  const dynamicMarketplaces = useMemo(() => {
    return Object.values(resourceMarketplaces).map((m) => {
      const row = { ...m };
      row._isLimited = row.supply < targetAmount;
      row._dynamicSupply = Math.min(
        row.supply,
        selectionSummary.amounts[m.buildingId] || selectionSummary.needed || targetAmount
      );

      let marketFills = ordersToFills(
        'buy',
        row.orders,
        row._dynamicSupply,
        row.marketplace?.Exchange?.takerFee || 0,
        crewBonuses?.feeReduction?.totalBonus || 1,
        row.enforcementFee || 1,
      );

      let total = marketFills.reduce((acc, cur) => acc + cur.fillPaymentTotal, 0) / TOKEN_SCALE[TOKEN.SWAY];
      row._dynamicTotalPrice = total;
      row._dynamicUnitPrice = total / row._dynamicSupply;
      row._fills = marketFills;
      return row;
    });
  }, [resourceMarketplaces, selectionSummary, targetAmount]);

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

const useShoppingListData = (asteroidId, lotId, productIds) => {
  const { data: exchanges, dataUpdatedAt: exchangesUpdatedAt } = useAsteroidBuildings(asteroidId, 'Exchange', Permission.IDS.BUY);

  // TODO: how much effort would it be to include enforcementFee in elasticsearch on exchanges
  const [enforcementFees, setEnforcementFees] = useState();
  const [feesLoading, setFeesLoading] = useState(true);
  useEffect(() => {
    const ids = (exchanges || []).map((e) => e.Control?.controller?.id);
    if (ids?.length > 0) {
      setFeesLoading(true);
      api.getCrewmatesOfCrews(ids).then((crewmates) => {
        const crews = crewmates.reduce((acc, c) => {
          const crewId = c.Control?.controller?.id;
          if (crewId) {
            if (!acc[crewId]) acc[crewId] = [];
            acc[crewId].push(c);
          }
          return acc;
        }, {});

        const fees = {};
        Object.keys(crews).forEach((crewId) => {
          
          // NOTE: this only works because we know MARKETPLACE_FEE_ENFORCEMENT is `notFurtherModified`
          // (if that changes, would need to pull more data from Crew as well)
          const crewEnforcementFee = Crew.getAbilityBonus(Crewmate.ABILITY_IDS.MARKETPLACE_FEE_ENFORCEMENT, crews[crewId]);
          exchanges.filter((e) => e.Control?.controller?.id === Number(crewId)).forEach((e) => {
            fees[e.id] = crewEnforcementFee.totalBonus;
          });
        });
        setEnforcementFees(fees);
      })
      .finally(() => {
        setFeesLoading(false);
      });
    }
  }, [exchangesUpdatedAt]);
  
  // TODO: refetch every 30s while "not_started"
  const { data: orders, refetch } = useShoppingListOrders(asteroidId, productIds);

  return useMemo(() => {
    if (!enforcementFees || !exchanges || !orders) return {};

    const final = {};
    Object.keys(orders).forEach((productId) => {
      final[productId] = [];
      Object.keys(orders[productId]).forEach((buildingId) => {
        const o = orders[productId][buildingId];
        const marketplace = exchanges.find((e) => e.id === Number(buildingId));
        
        if (marketplace) {
          o.marketplace = marketplace;
          o.distance = Asteroid.getLotDistance(asteroidId, Lot.toIndex(o.lotId), Lot.toIndex(lotId));
          o.enforcementFee = enforcementFees[buildingId] || 1;
          final[productId].push(o);
        }
      });
    });
    
    return {
      data: final,
      isLoading: false,
      lastUpdatedAt: Date.now(),
      refetch: () => {}
    };
  }, [asteroidId, enforcementFees, exchangesUpdatedAt, lotId, orders]);
};

const ShoppingList = ({ asteroid, destination, destinationSlot, stage, ...props }) => {
  const { execute } = useContext(ChainTransactionContext);
  const { crew, pendingTransactions } = useCrewContext();

  const [openProductId, setOpenProductId] = useState();
  const [selected, setSelected] = useState({});

  const { data: exchanges, dataUpdatedAt: exchangesUpdatedAt } = useAsteroidBuildings(asteroid?.id, 'Exchange', Permission.IDS.BUY);
  const { data: destinationLot } = useLot(locationsArrToObj(destination?.Location?.locations || []).lotId);

  // TODO: these are only relevant for site
  const { currentDeliveryActions } = useDeliveryManager({ destination });
  const buildingRequirements = useMemo(
    () => getBuildingRequirements(destination, currentDeliveryActions),
    [destination, currentDeliveryActions]
  );

  // derive shopping list from selected site
  const [shoppingList, productIds] = useMemo(() => {
    const list = buildingRequirements
      .filter((req) => req.inNeed > 0)
      .map((req) => ({
        product: Product.TYPES[req.i],
        amount: req.inNeed
      }));
    return [list, list.map((p) => p.product.i)];
  }, [buildingRequirements]);

  const {
    data: resourceMarketplaces
  } = useShoppingListData(asteroid?.id, destinationLot?.id, productIds);

  // crew bonuses related to market buys and transport
  const crewBonuses = useMemo(() => {
    if (!crew) return {};

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

  // product focus toggling
  useEffect(() => {
    if (!!shoppingList) {
      setOpenProductId(shoppingList[0]?.product?.i);
    }
  }, [!!shoppingList]);

  const selectionSummary = useMemo(() => {
    return productIds.reduce((acc, productId) => {
      const targetAmount = shoppingList.find((l) => l.product.i === productId)?.amount || 0;

      let needed = targetAmount;
      let totalPrice = 0;
      let maxTravelTime = 0;
      const allFills = [];
      const selectedAmounts = {};
      (selected[productId] || [])
        // TODO: should we index resourceMarketplaces by buildingId to simplify this?
        .map((buildingId) => resourceMarketplaces[productId].find((m) => m.buildingId === buildingId))
        .sort((a, b) => a.supply - b.supply)
        .forEach((row) => {
          selectedAmounts[row.buildingId] = 0;
          maxTravelTime = Math.max(
            maxTravelTime,
            Time.toRealDuration(
              Asteroid.getLotTravelTime(
                asteroid?.id, Lot.toIndex(row.lotId), Lot.toIndex(destinationLot?.id), crewBonuses?.hopperTransport.totalBonus, crewBonuses?.freeTransport.totalBonus
              ),
              crew?._timeAcceleration
            )
          );
  
          const fills = ordersToFills(
            'buy',
            row.orders,
            needed,
            row.marketplace?.Exchange?.takerFee || 0,
            crewBonuses?.feeReduction?.totalBonus || 1,
            row.enforcementFee || 1,
          );
  
          fills.forEach((fill) => {
            selectedAmounts[row.buildingId] += fill.fillAmount;
            needed -= fill.fillAmount;
            totalPrice += fill.fillPaymentTotal;
          });
  
          allFills.push(...fills);
        });

      acc[productId] = {
        needed,
        maxTravelTime,
        totalPrice: totalPrice / TOKEN_SCALE[TOKEN.SWAY],
        totalFilled: targetAmount - needed,
        fills: allFills,
        amounts: selectedAmounts
      };
      return acc;
    }, {});
  }, [asteroid?.id, crew?._timeAcceleration, crewBonuses, destinationLot?.id, selected, shoppingList]);

  const { taskTimeRequirement, totalPrice, allFills } = useMemo(() => {
    return Object.values(selectionSummary).reduce((acc, s) => ({
      taskTimeRequirement: Math.max(acc.taskTimeRequirement, s.maxTravelTime),
      totalPrice: acc.totalPrice + (s.totalPrice || 0),
      allFills: [...acc.allFills, ...s.fills]
    }), {
      taskTimeRequirement: 0,
      totalPrice: 0,
      allFills: []
    });
  }, [selectionSummary]);

  const handleSelected = useCallback((productId) => (buildingId) => {
    setSelected((old) => {
      const s = { ...old };
      if (!s[productId]) s[productId] = [];

      if (s[productId].includes(buildingId)) {
        s[productId] = s[productId].filter((b) => b !== buildingId);

      // if already filled, clear all --> select this one
      } else if (selectionSummary[productId].needed === 0) {
        s[productId] = [buildingId];

      // else, add this one
      } else {
        s[productId] = [...s[productId], buildingId];
      }

      return s;
    });
  }, [selectionSummary]);

  const [purchasing, setPurchasing] = useState();
  const handlePurchase = useCallback(async () => {
    setPurchasing(true);
    try {
    
      // load all sellerCrews and exchangeControllerCrews
      // TODO: technically, can skip loading exchangeControllerCrews if fees 0?
      const allCrewIds = allFills.reduce((acc, fill) => {
        if (fill.crew?.id) acc.add(fill.crew?.id);

        const exchangeControllerId = exchanges?.find((e) => e.id === fill.entity.id)?.Control?.controller?.id;
        if (exchangeControllerId) acc.add(exchangeControllerId);
        return acc;
      }, new Set());

      const crews = await api.getEntities({ ids: Array.from(allCrewIds), label: Entity.IDS.CREW, component: 'Crew' });

      // TODO: could move this all into useMarketplaceManager but would have to rework it the manager some
      await execute(
        'BulkFillSellOrder',
        allFills.map((fill) => { 
          const exchangeControllerId = exchanges?.find((e) => e.id === fill.entity.id)?.Control?.controller?.id;
          return {
            seller_account: crews.find((c) => c.id === fill.crew?.id)?.Crew?.delegatedTo,
            exchange_owner_account: crews.find((c) => c.id === exchangeControllerId)?.Crew?.delegatedTo,
            takerFee: fill.takerFee,
            payments: fill.paymentsUnscaled,

            seller_crew: { id: fill.crew?.id, label: fill.crew?.label },
            amount: fill.fillAmount,
            price: fill.price * TOKEN_SCALE[TOKEN.SWAY],
            storage: { id: fill.storage?.id, label: fill.storage?.label },
            storage_slot: fill.storageSlot,

            product: fill.product,
            destination: { id: destination?.id, label: destination?.label },
            destination_slot: destinationSlot,

            exchange: { id: fill.entity.id, label: fill.entity.label },
            caller_crew: { id: crew?.id, label: crew?.label }
          };
        }),
        {
          destinationLotId: destinationLot?.id,
        },
      );

    } catch (e) {
      console.error(e);
      
    } finally {
      setTimeout(() => {
        setPurchasing(false);
      }, 1000);
    }

  }, [allFills, crew?.id, destination, destinationLot?.id, destinationSlot, exchangesUpdatedAt, execute]);

  const shoppingListPurchaseTally = useMemo(() => {
    return (pendingTransactions || []).filter((tx) => tx.key === 'BulkFillSellOrder' && tx.meta?.destinationLotId === destinationLot?.id);
  }, [destinationLot?.id, pendingTransactions])

  // if shoppingListPurchaseTally on this lot changes while in `purchasing` mode, close dialog
  useEffect(() => {
    if (purchasing && props.onClose) {
      props.onClose();
    }
  }, [shoppingListPurchaseTally]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <MarketBuyIcon />,
          label: 'Shopping List',
          status: stage === actionStage.NOT_STARTED ? 'Source Remaining Materials' : undefined,
        }}
        actionCrew={crew}
        location={{ asteroid, lot: destinationLot }}
        crewAvailableTime={0}
        taskCompleteTime={taskTimeRequirement}
        onClose={props.onClose}
        stage={stage} />

      <ActionDialogBody>
        {destination?.Building?.status !== Building.CONSTRUCTION_STATUSES.PLANNED && (
          <FlexSection>
            <BuildingInputBlock
              title="Destination"
              building={destination}
            />

            <FlexSectionSpacer />

            <div>Todo: Select a recipe and a multiple</div>
          </FlexSection>
        )}

        <FlexSection>
          <ProductList>
          {shoppingList.map(({ product, amount }, i) => (
            <ProductItem
              onClick={() => setOpenProductId(product.i)}
              selected={openProductId === product.i}>
              <ProductHeader>
                <ResourceThumbnail resource={product} size="48px" />
                <h4>{product.name}</h4>
                <div>{formatResourceAmount(selectionSummary[product.i]?.totalFilled || 0, product.i)} filled of {formatResourceAmount(amount, product.i)}</div>
                <div>@ <SwayIcon /> <span>{formatPrice(selectionSummary[product.i]?.totalPrice / selectionSummary[product.i]?.totalFilled)}</span></div>
              </ProductHeader>
              {/* TODO: show amount sourced when in selected row of total supply */}
              {openProductId === product.i && (
                <ProductMarketSummary
                  asteroidId={asteroid?.id}
                  crewBonuses={crewBonuses}
                  lotId={destinationLot?.id}
                  productId={product.i}
                  selected={selected[product.i]}
                  selectionSummary={selectionSummary[product.i]}
                  onSelected={handleSelected(product.i)}
                  resourceMarketplaces={resourceMarketplaces?.[product.i]}
                  targetAmount={amount} />
              )}
            </ProductItem>
          ))}
          </ProductList>
          
        </FlexSection>
      </ActionDialogBody>

      <ActionDialogFooter
        disabled={!(allFills?.length > 0)}
        goLabel="Purchase"
        onGo={handlePurchase}
        stage={stage}
        waitForCrewReady
        {...props} />
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  const actionManager = { actionStage: actionStage.NOT_STARTED };

  const [destination, destinationSlot] = useMemo(() => {
    return [
      lot?.building,
      lot?.building?.Inventories.find((i) => i.status === Inventory.STATUSES.AVAILABLE)?.slot
    ];
  }, [lot?.building]);

  useEffect(() => {
    if (!asteroid || !lot || !destination || !destinationSlot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
    if (destination && destination?.Building?.status !== Building.CONSTRUCTION_STATUSES.PLANNED) {
      if (props.onClose) props.onClose();
    }
  }, [asteroid, lot, destination, destinationSlot, isLoading]);

  return (
    <ActionDialogInner
      actionImage="Marketplace"
      isLoading={reactBool(isLoading)}
      stage={actionManager.actionStage}>
      <ShoppingList
        asteroid={asteroid}
        destination={destination}
        destinationSlot={destinationSlot}
        actionManager={actionManager}
        stage={actionManager.actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
