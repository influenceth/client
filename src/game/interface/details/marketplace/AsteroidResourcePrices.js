import { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { Asteroid, Entity, Lot, Permission } from '@influenceth/sdk';

import Button from '~/components/ButtonAlt';
import ClipCorner from '~/components/ClipCorner';
import CrewIndicator from '~/components/CrewIndicator';
import DataTable from '~/components/DataTable';
import { MarketplaceBuildingIcon, SwayIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import { formatResourceAmount } from '~/game/interface/hud/actionDialogs/components';
import useCrew from '~/hooks/useCrew';
import useCrewContext from '~/hooks/useCrewContext';
import useOrderSummaryByExchange from '~/hooks/useOrderSummaryByMarket';
import useEntities from '~/hooks/useEntities';
import useLot from '~/hooks/useLot';
import { formatFixed, formatPrice, nativeBool } from '~/lib/utils';
import { getBuildingIcon } from '~/lib/assetUtils';
import formatters from '~/lib/formatters';
import theme from '~/theme';
import useCoachmarkRefSetter from '~/hooks/useCoachmarkRefSetter';
import useStore from '~/hooks/useStore';
import { COACHMARK_IDS } from '~/contexts/CoachmarkContext';
import useSimulationEnabled from '~/hooks/useSimulationEnabled';
import { IconLink, LocationLink, MarketplacePermissionsIcon } from '../listViews/components';
import SIMULATION_CONFIG from '~/simulation/simulationConfig';


const Header = styled.div`
  align-items: center;
  border-bottom: 1px solid #333;
  color: #999;
  display: flex;
  flex-direction: row;
  height: 291px;
  margin-top: -25px;
  padding-bottom: 25px;
  padding-top: 25px;

  & > div:first-child {
    flex: 1;
    h1 {
      color: white;
      font-size: ${p => {
        if (p.resourceName.length >= 30) return `30px`;
        if (p.resourceName.length >= 24) return `40px`;
        return '50px';
      }};
      font-weight: normal;
      line-height: 1em;
      margin: 0;
      text-transform: uppercase;
    }
  }
`;
const Subheader = styled.div`
  line-height: 1em;
  padding-top: 5px;
  span:not(:first-child) {
    border-left: 1px solid #777;
    margin-left: 10px;
    padding-left: 10px;
  }
`;

const MarketSummary = styled.div`
  border: solid #333;
  border-width: 1px 0;
  display: inline-block;
  line-height: 1.4em;
  margin: 20px 0 12px;
  padding: 10px 40px 10px 0;
  b {
    color: white;
    font-weight: normal;
  }
`;
const MarketPrice = styled.div`
  color: white;
  font-size: 25px;
  label {
    color: #999;
    font-size: 18px;
  }
`;

const Body = styled.div`
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: 15px;
  padding-top: 15px;
`;

const TableContainer = styled.div`
  flex: 1;
  height: 100%;
  overflow-y: auto;
  thead th {
    background: rgba(0, 0, 0, 0.75);
  }
`;

const IconWrapper = styled.div`
  color: white;
  font-size: 22px;
  margin-right: 4px;
`;

const SelectedMarketplace = styled.div`
  & > div:first-child {
    align-items: center;
    display: flex;
    margin-bottom: 12px;
  }
  & > div:last-child {
    text-align: right;
    & label {
      color: white;
      display: block;
      font-size: 20px;
      margin-bottom: 4px;
    }
    & span {
      color: ${p => p.theme.colors.green};
      font-size: 18px;
    }
  }
`;
const MarketplaceImage = styled.div`
  border: 1px solid #333;
  ${p => p.theme.clipCorner(10)};
  margin-left: 15px;
  padding: 6px;
  position: relative;
  & img {
    ${p => p.theme.clipCorner(6)};
    width: 232px;
  }
`;

const PseudoFooterButton = styled(Button)`
  position: absolute;
  bottom: 15px;
  right: 0px;
`;

const Empty = styled.span`
  opacity: 0.5;
`;

const MarketplaceName = styled.span`
  color: ${p => {
    if (p.acesss === 'full') return p.theme.colors.white;
    if (p.access === 'limited') return p.theme.colors.yellow;
    if (p.access === 'none') return p.theme.colors.red;
  }};
`;

const AsteroidResourcePrices = ({ asteroid, mode, resource }) => {
  const history = useHistory();

  const { crew, crewCan } = useCrewContext();
  const [selected, setSelected] = useState();
  const [sort, setSort] = useState([
    `${mode === 'sell' ? 'buy' : 'sell'}Price`,
    mode === 'sell' ? 'asc' : 'desc'
  ]);
  const [sortField, sortDirection] = sort;

  const setCoachmarkRef = useCoachmarkRefSetter();
  const coachmarkHelperProduct = useStore(s => s.coachmarks?.[COACHMARK_IDS.asteroidMarketsHelper]);
  const simulationEnabled = useSimulationEnabled();
  const simulationActions = useStore((s) => s.simulationActions);

  const { data: selectedLot } = useLot(selected);
  const { data: marketplaceOwner } = useCrew(selectedLot?.building?.Control?.controller?.id);

  const { data: orderSummary } = useOrderSummaryByExchange(asteroid.id, resource.i);

  const marketPlaceIds = useMemo(() => Array.from(new Set((orderSummary || []).map((o) => o.marketplace.id))), [orderSummary]);
  const { data: resourceMarketplaceEntities, isLoading: marketplacesLoading } = useEntities({ ids: marketPlaceIds, label: Entity.IDS.BUILDING });

  const isPermitted = useCallback(({ exchange, mode, type, isCancellation }) => {
    if (isCancellation) return true;

    let perm = 0;
    if (type === 'limit' && mode === 'buy') perm = Permission.IDS.LIMIT_BUY;
    if (type === 'limit' && mode === 'sell') perm = Permission.IDS.LIMIT_SELL;
    if (type === 'market' && mode === 'buy') perm = Permission.IDS.BUY;
    if (type === 'market' && mode === 'sell') perm = Permission.IDS.SELL;
    return crewCan(perm, exchange);
  }, [crewCan]);

  const resourceMarketplaces = useMemo(() => {
    if (!orderSummary) return [];
    const transformedOrders = orderSummary.map((o) => {
      const exchange = resourceMarketplaceEntities?.find((mp) => mp.id === o.marketplace.id);
      const permissions = {
        'Limit Buy': (exchange) ? isPermitted({ exchange, type: 'limit', mode: 'buy' }) : null,
        'Limit Sell': (exchange) ? isPermitted({ exchange, type: 'limit', mode: 'sell' }) : null,
        'Market Buy': (exchange) ? isPermitted({ exchange, type: 'market', mode: 'buy' }) : null,
        'Marknet Sell': (exchange) ? isPermitted({ exchange, type: 'market', mode: 'sell' }) : null,
        map(fn) {
          return Object.keys(this).map((k) => {
            if (typeof this[k] !== 'function') return fn(k, this[k]);
          });
        },
        values() {
          return Object.keys(this).reduce((acc, k) => {
            if (typeof this[k] !== 'function') acc.push(this[k]);
            return acc;
          }, []);
        },
        accessLevel() {
          if (this.values().every((v) => v === true)) return 'full';
          if (this.values().some((v) => v === true))  return 'limited';
          return 'none';
        }
      };

      return {
        permissions,
        marketplaceName: formatters.buildingName(o.marketplace),
        lotId: o.marketplace?.Location?.location?.id,
        supply: o.sell.amount,
        demand: o.buy.amount,
        distance: crew?._location?.asteroidId === asteroid.id ? Asteroid.getLotDistance(asteroid.id, crew?._location?.lotIndex, Lot.toIndex(o.marketplace?.Location?.location?.id)) : 0,
        buyPrice: o.buy.price,
        sellPrice: o.sell.price,
        centerPrice: (o.sell.price && o.buy.price) ? (o.sell.price + o.buy.price) / 2 : (o.sell.price || o.buy.price || 0),
        makerFee: o.marketplace?.Exchange?.makerFee,
        takerFee: o.marketplace?.Exchange?.takerFee,
      };
    });

    if (simulationEnabled && resource.i === coachmarkHelperProduct) {
      if (simulationActions.includes('MarketBuy') && !simulationActions.includes('LimitSell')) {
        return transformedOrders.filter((o) => o.supply > parseInt(SIMULATION_CONFIG.marketplaceAmounts[coachmarkHelperProduct]) || 0);
      } else if (simulationActions.includes('MarketSell') && !simulationActions.includes('LimitBuy')) {
        return transformedOrders.filter((o) => o.demand > parseInt(SIMULATION_CONFIG.marketplaceAmounts[coachmarkHelperProduct]) || 0);
      }
    }
    return transformedOrders;
  }, [asteroid.id, coachmarkHelperProduct, crew, orderSummary, simulationEnabled, simulationActions, resourceMarketplaceEntities]);

  const selectedSupply = useMemo(() => {
    return resourceMarketplaces.find((m) => m.lotId === selected)?.supply || 0;
  }, [selected]);

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
    return (resourceMarketplaces || [])
      //.sort((a, b) => (sortDirection === 'asc' ? 1 : -1) * (a[sortField] < b[sortField] ? 1 : -1));
      .sort(function(a,b) {
        var sortToBottom = [ 0 ], indexA, indexB;
        indexA = sortToBottom.indexOf(a[sortField]);
        indexB = sortToBottom.indexOf(b[sortField]);
        if (indexA === -1 && indexB === -1) {
          return (sortDirection === 'asc' ? 1 : -1) * (a[sortField] > b[sortField] ? -1 : 1); // normal sorting
        }
        return indexA - indexB; // sort to the bottom
      });
  }, [resourceMarketplaces, sortField, sortDirection]);

  const columns = useMemo(() => {
    const c = [
      {
        key: 'marketplaceName',
        label: 'Marketplace',
        sortField: 'marketplaceName',
        selector: row => (
          <>
            <LocationLink
              style={{ marginRight: 6 }}
              asteroidId={asteroid.id}
              lotId={row.lotId}
              data-tooltip-id="detailsTooltip" />
            <MarketplaceName access={marketplacesLoading ? 'full' : row.permissions.accessLevel()}>{row.marketplaceName}
            {!marketplacesLoading && row.permissions.accessLevel() === 'full' || (
              <MarketplacePermissionsIcon
                style={{ marginLeft: 6, fontSize:'140%'}}
                permissions={row.permissions}
                data-tooltip-id={"detailsTooltip"}
              />
            )}</MarketplaceName>
          </>
        ),
      },
      {
        key: 'supply',
        label: 'Supply',
        sortField: 'supply',
        selector: row => (
          <>
            {row.supply === 0 ||
            <IconLink
              style={{ marginRight: 6 }}
              onClick={() => history.push(`/marketplace/${asteroid.id}/${Lot.toIndex(row.lotId)}/${resource.i}?back=all&mode=buy`)}
              tooltip="View Orderbook"
              data-tooltip-id="detailsTooltip">
              <MarketplaceBuildingIcon />
            </IconLink>
            }
            {row.supply === 0
              ? <Empty>None</Empty>
              : formatResourceAmount(row.supply, resource.i)
            }
          </>
        )
      },
      {
        key: 'sellPrice',
        label: 'Selling Price',
        sortField: 'sellPrice',
        selector: row => (
          <>
            {row.sellPrice === 0
              ? <Empty>—</Empty>
              : (<><IconWrapper><SwayIcon /></IconWrapper> {formatPrice(row.sellPrice, { fixedPrecision: 4 })}</>)
            }
          </>
        )
      },
      {
        key: 'demand',
        label: 'Demand',
        sortField: 'demand',
        selector: row => (
          <>
            {row.demand === 0 ||
            <IconLink
              style={{ marginRight: 6 }}
              onClick={() => history.push(`/marketplace/${asteroid.id}/${Lot.toIndex(row.lotId)}/${resource.i}?back=all&mode=sell`)}
              tooltip="View Orderbook"
              data-tooltip-id="detailsTooltip">
              <MarketplaceBuildingIcon />
            </IconLink>
            }
            {row.demand === 0
              ? <Empty>None</Empty>
              : formatResourceAmount(row.demand, resource.i)
            }
          </>
        )
      },
      {
        key: 'buyPrice',
        label: 'Buying Price',
        sortField: 'buyPrice',
        selector: row => (
          <>
          {row.buyPrice === 0
            ? <Empty>—</Empty>
            : <><IconWrapper><SwayIcon /></IconWrapper> {formatPrice(row.buyPrice, { fixedPrecision: 4 })}</>
          }
          </>
        )
      },
      // TODO: add distanceAway, calculate from crew's current position (if logged in and on asteroid surface)
      // TODO: maker fee / taker fee? which one is relevant here?
      {
        key: 'makerFee',
        label: 'Maker Fee',
        sortField: 'makerFee',
        selector: row => (
          <>
            {row.makerFee === 0
              ? <Empty>None</Empty>
              : `${(row.makerFee / 100).toFixed(2)}%`
            }
          </>
        )
      },
      {
        key: 'takerFee',
        label: 'Taker Fee',
        sortField: 'takerFee',
        selector: row => (
          <>
            {row.takerFee === 0
              ? <Empty>None</Empty>
              : `${(row.takerFee / 100).toFixed(2)}%`
            }
          </>
        )
      },
      // {
      //   key: 'lotId',
      //   label: 'Lot ID',
      //   sortField: 'lotId',
      //   selector: row => (
      //     <>
      //       <LocationLink
      //         asteroidId={asteroid.id}
      //         lotId={row.lotId}
      //         zoomToLot
      //         data-tooltip-id="detailsTooltip" />
      //       <span>{formatters.lotName(row.lotId)}</span>
      //     </>
      //   )
      // },
      // {
      //   key: 'centerPrice',
      //   label: 'Center Price',
      //   sortField: 'centerPrice',
      //   selector: row => (
      //     <>
      //       <IconWrapper><SwayIcon /></IconWrapper>
      //       {formatPrice(row.centerPrice, { fixedPrecision: 4 })}
      //     </>
      //   )
      // },
      {
        key: 'permissions',
        label: 'permissions',
        skip: true
      },
    ];
    if (crew?._location?.asteroidId === asteroid.id) {
      c.splice(1, 0, ({
        key: 'distance',
        label: 'Distance to Crew',
        sortField: 'distance',
        selector: row => `${formatFixed(row.distance, 1)} km`,
      }))
    }
    return c;
  }, [asteroid, crew, marketplacesLoading, resource]);

  const getRowProps = useCallback((row) => {
    return {
      onClick: () => {
        setSelected(row.lotId);
      },
      isSelected: (selected === row.lotId)
    }
  }, [selected]);

  const onViewMarketplace = useCallback(() => {
    history.push(`/marketplace/${asteroid.id}/${Lot.toIndex(selected)}/${resource.i}?back=all`);
  }, [asteroid, resource, selected]);

  const [ totalSupply, totalDemand, medianPrice ] = useMemo(() => {
    let s = 0, d = 0, m = 0;
    if (resourceMarketplaces.length > 0) {
      resourceMarketplaces.forEach((m) => {
        s += m.supply;
        d += m.demand;
      });

      if (resourceMarketplaces.length % 2 === 1) {
        m = resourceMarketplaces[(resourceMarketplaces.length / 2) - 0.5].centerPrice;
      } else {
        m = (
          resourceMarketplaces[(resourceMarketplaces.length / 2) - 1].centerPrice
          + resourceMarketplaces[(resourceMarketplaces.length / 2)].centerPrice
        ) / 2;
      }
    }
    return [s, d, m];
  }, [resourceMarketplaces]);

  return (
    <>
      <Header resourceName={resource.name}>
        <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row' }}>
          <ResourceThumbnail resource={resource} size="240px" tooltipContainer={null} />
          <div style={{ flex: 1, paddingLeft: 25 }}>
            <h1>{resource.name}</h1>
            <Subheader>
              <span>{resource.classification}</span>
              <span>{resource.category}</span>
            </Subheader>
            <MarketSummary>
              <div>
                Listed at <b>{resourceMarketplaces.length} Marketplace{resourceMarketplaces.length === 1 ? '' : 's'}</b> on <b>{formatters.asteroidName(asteroid)}</b>
              </div>
              <div>
                Total Supply: <span style={{ color: theme.colors.green }}>{formatResourceAmount(totalSupply, resource.i)}</span>
              </div>
              <div>
                Total Demand: <span style={{ color: theme.colors.main }}>{formatResourceAmount(totalDemand, resource.i)}</span>
              </div>
            </MarketSummary>
            <MarketPrice>
              <label>Median Price:</label> <SwayIcon />{formatPrice(medianPrice, { fixedPrecision: 4 })}<label>/{resource.isAtomic ? 'unit' : 'kg'}</label>
            </MarketPrice>
          </div>
        </div>

        {selectedLot && (
          <SelectedMarketplace>
            <div>
              {marketplaceOwner && <CrewIndicator crew={marketplaceOwner} flip label="Managed by" />}
              <MarketplaceImage>
                <img src={getBuildingIcon(8, 'w400')} />
                <ClipCorner dimension={10} color="#333" />
              </MarketplaceImage>
            </div>
            <div>
              <label>{formatters.buildingName(selectedLot.building)}</label>
              <span>{formatResourceAmount(selectedSupply, resource.i)} available</span>
            </div>
          </SelectedMarketplace>
        )}
      </Header>

      <Body>
        <TableContainer>
          <DataTable
            columns={columns}
            data={sortedMarketplaces || []}
            getRowProps={getRowProps}
            keyField="lotId"
            onClickColumn={handleSort}
            sortDirection={sortDirection}
            sortField={sortField}
          />
        </TableContainer>
      </Body>

      <PseudoFooterButton
        setRef={selected && coachmarkHelperProduct === resource?.i ? setCoachmarkRef(COACHMARK_IDS.asteroidMarketsHelper) : undefined}
        disabled={nativeBool(!selected)}
        onClick={onViewMarketplace}>
        Transact
      </PseudoFooterButton>
    </>
  );
};

export default AsteroidResourcePrices;
