import { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { Asteroid, Lot } from '@influenceth/sdk';

import Button from '~/components/ButtonAlt';
import ClipCorner from '~/components/ClipCorner';
import CrewIndicator from '~/components/CrewIndicator';
import DataTable from '~/components/DataTable';
import { OrderIcon, SwayIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import { formatResourceAmount } from '~/game/interface/hud/actionDialogs/components';
import useCrew from '~/hooks/useCrew';
import useLot from '~/hooks/useLot';
import { formatFixed, formatPrice, nativeBool } from '~/lib/utils';
import theme from '~/theme';
import { IconLink, LocationLink } from '../listViews/components';
import { getBuildingIcon } from '~/lib/assetUtils';
import formatters from '~/lib/formatters';
import useOrderSummaryByExchange from '~/hooks/useOrderSummaryByMarket';
import useCrewContext from '~/hooks/useCrewContext';


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
  tbody td {
    background: transparent;
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

const AsteroidResourcePrices = ({ asteroid, resource }) => {
  const history = useHistory();

  const { crew } = useCrewContext();
  const [selected, setSelected] = useState();
  const [sort, setSort] = useState(['centerPrice', 'asc']);
  const [sortField, sortDirection] = sort;

  const { data: selectedLot } = useLot(selected);
  const { data: marketplaceOwner } = useCrew(selectedLot?.building?.Control?.controller?.id);

  const { data: orderSummary } = useOrderSummaryByExchange(asteroid.id, resource.i);
  const resourceMarketplaces = useMemo(() => {
    if (!orderSummary) return [];
    return orderSummary.map((o) => ({
      marketplaceName: formatters.buildingName(o.marketplace),
      lotId: o.marketplace?.Location?.location?.id,
      supply: o.sell.amount,
      demand: o.buy.amount,
      distance: crew?._location?.asteroidId === asteroid.id ? Asteroid.getLotDistance(asteroid.id, crew?._location?.lotIndex, Lot.toIndex(o.marketplace?.Location?.location?.id)) : 0,
      centerPrice: (o.sell.price && o.buy.price) ? (o.sell.price + o.buy.price) / 2 : (o.sell.price || o.buy.price || 0),
      makerFee: o.marketplace?.Exchange?.makerFee,
      takerFee: o.marketplace?.Exchange?.takerFee,
    }))
  }, [asteroid.id, crew, orderSummary]);

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
      .sort((a, b) => (sortDirection === 'asc' ? 1 : -1) * (a[sortField] < b[sortField] ? 1 : -1));
  }, [resourceMarketplaces, sortField, sortDirection]);

  const columns = useMemo(() => {
    const c = [
      // (this feels redundant)
      // {
      //   key: 'resourceName',
      //   label: 'Product',
      //   sortField: 'resourceName',
      //   selector: row => (
      //     <>
      //       <IconWrapper><ProductIcon /></IconWrapper>
      //       {resource.name}
      //     </>
      //   ),
      // },
      {
        key: 'marketplaceName',
        label: 'Marketplace Name',
        sortField: 'marketplaceName',
        selector: row => (
          <>
            <IconLink
              onClick={() => history.push(`/marketplace/${asteroid.id}/${Lot.toIndex(row.lotId)}/${resource.i}?back=all`)}
              tooltip="View Marketplace Orderbook"
              data-for="details">
              <OrderIcon />
            </IconLink>
            <span>{row.marketplaceName}</span>
          </>
        ),
      },
      {
        key: 'lotId',
        label: 'Lot ID',
        sortField: 'lotId',
        selector: row => (
          <>
            <LocationLink
              asteroidId={asteroid.id}
              lotId={row.lotId}
              zoomToLot
              data-for="details" />
            <span>{formatters.lotName(row.lotId)}</span>
          </>
        )
      },
      {
        key: 'supply',
        label: 'Listed Supply',
        sortField: 'supply',
        selector: row => formatResourceAmount(row.supply, resource.i),
      },
      {
        key: 'demand',
        label: 'Listed Demand',
        sortField: 'demand',
        selector: row => formatResourceAmount(row.demand, resource.i),
      },
      {
        key: 'centerPrice',
        label: 'Center Price',
        sortField: 'centerPrice',
        selector: row => (
          <>
            <IconWrapper><SwayIcon /></IconWrapper>
            {formatPrice(row.centerPrice)}
          </>
        )
      },
      // TODO: add distanceAway, calculate from crew's current position (if logged in and on asteroid surface)
      // TODO: maker fee / taker fee? which one is relevant here?
      {
        key: 'makerFee',
        label: 'Maker Fee',
        sortField: 'makerFee',
        selector: row => `${(row.makerFee / 100).toFixed(2)}%`,
      },
      {
        key: 'takerFee',
        label: 'Taker Fee',
        sortField: 'takerFee',
        selector: row => `${(row.takerFee / 100).toFixed(2)}%`,
      },
    ];
    if (crew?._location?.asteroidId === asteroid.id) {
      c.splice(3, 0, ({
        key: 'distance',
        label: 'Distance',
        sortField: 'distance',
        selector: row => `${formatFixed(row.distance, 1)} km`,
      }))
    }
    return c;
  }, [asteroid, crew, resource]);

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

      resourceMarketplaces.sort((a, b) => a.centerPrice < b.centerPrice ? -1 : 1);
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
              <label>Median Price:</label> <SwayIcon />{formatPrice(medianPrice)}<label>/{resource.isAtomic ? 'unit' : 'kg'}</label>
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
            keyField="i"
            onClickColumn={handleSort}
            sortDirection={sortDirection}
            sortField={sortField}
          />
        </TableContainer>
      </Body>

      <PseudoFooterButton disabled={nativeBool(!selected)} onClick={onViewMarketplace}>
        View Marketplace
      </PseudoFooterButton>
    </>
  );
};

export default AsteroidResourcePrices;
