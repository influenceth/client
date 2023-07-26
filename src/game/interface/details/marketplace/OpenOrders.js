import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import moment from 'moment';
import { Product } from '@influenceth/sdk';

import CrewIndicator from '~/components/CrewIndicator';
import DataTable from '~/components/DataTable';
import { CompositionIcon, MarketplaceBuildingIcon, MarketsIcon, ProductIcon, SwayIcon } from '~/components/Icons';
import { formatPrice } from '~/lib/utils';
import theme from '~/theme';
import { LocationLink } from '../listViews/components';
import formatters from '~/lib/formatters';

const Subheader = styled.div``;
const Header = styled.div`
  align-items: center;
  border-bottom: 1px solid #333;
  display: flex;
  flex-direction: row;
  height: 150px;
  margin-top: -25px;
  padding-bottom: 25px;
  padding-top: 25px;

  & > div:first-child {
    flex: 1;
    h1 {
      align-items: center;
      display: flex;
      font-size: 50px;
      font-weight: normal;
      line-height: 1em;
      margin: 0;
      text-transform: uppercase;
      svg {
        color: ${p => p.theme.colors.main};
        height: 1em;
        margin-right: 6px;
      }
    }
    ${Subheader} {
      color: #999;
      line-height: 1em;
      padding-left: 56px;
      padding-top: 15px;
      span:not(:first-child) {
        border-left: 1px solid #777;
        margin-left: 10px;
        padding-left: 10px;
      }
      b {
        color: white;
        font-weight: normal;
      }
    }
  }
`;

const Body = styled.div`
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding-top: 25px;
`;

const TableContainer = styled.div`
  flex: 1;
  height: 100%;
  overflow-x: hidden;
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

const OrderType = styled.div`
  color: ${p => p.type === 'LimitBuy' ? theme.colors.green : theme.colors.main};
`;

const MarketplaceOpenOrders = ({ asteroid, orders, marketplace = null, marketplaceOwner = null }) => {
  const [sort, setSort] = useState(['createdAt', 'asc']);
  const [sortField, sortDirection] = sort;

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

  const sortedOrders = useMemo(() => {
    return (orders || [])
      .map((o) => ({
        ...o,
        resourceName: Product.TYPES[o.resourceId]?.name,
        total: o.price * o.amount,
        ago: (new moment(new Date(1000 * (o.createdAt || 0)))).fromNow()
      }))
      .sort((a, b) => (sortDirection === 'asc' ? 1 : -1) * (a[sortField] < b[sortField] ? 1 : -1));
  }, [orders, sortField, sortDirection]);


  const columns = useMemo(() => {
    const c = [
      {
        key: 'type',
        label: 'Order Type',
        sortField: 'type',
        selector: row => (
          <>
            {row.type === 'LimitBuy' && <OrderType type={row.type}>Limit Buy</OrderType>}
            {row.type === 'LimitSell' && <OrderType type={row.type}>Limit Sell</OrderType>}
          </>
        ),
      },
      {
        key: 'resourceName',
        label: 'Product',
        sortField: 'resourceName',
        selector: row => (
          <>
            <IconWrapper><ProductIcon /></IconWrapper>
            {row.resourceName}
          </>
        ),
      },
      {
        key: 'createdAt',
        label: 'Placed',
        sortField: 'createdAt',
        selector: row => row.ago,
      },
      {
        key: 'amount',
        label: 'Quantity',
        sortField: 'amount',
        selector: row => (row.amount || 0).toLocaleString()
      },
      {
        key: 'price',
        label: 'Price',
        sortField: 'price',
        selector: row => (
          <>
            <IconWrapper><SwayIcon /></IconWrapper>
            {formatPrice(row.price)}
          </>
        )
      },
      {
        key: 'total',
        label: 'Order Total',
        sortField: 'total',
        selector: row => (
          <>
            <IconWrapper><SwayIcon /></IconWrapper>
            {formatPrice(row.total)}
          </>
        )
      },
      {
        key: 'deliveryTo',
        label: 'Delivery',
        sortField: 'deliveryTo',
        selector: row => (
          <>
            <LocationLink asteroidId={row.asteroidId} lotId={row.deliveryTo} />
            <span>Lot {row.deliveryTo.toLocaleString()}</span>
          </>
        ),
      },
    ];
    if (!marketplace) {
      c.unshift({
        key: 'marketplaceName',
        label: 'Marketplace',
        sortField: 'marketplaceName',
        selector: row => (
          <>
            <LocationLink asteroidId={row.asteroidId} lotId={row.lotId} zoomToLot />
            <span>{row.marketplaceName || `Marketplace at Lot #${row.lotId}`}</span>
          </>
        ),
      });
    }
    return c;
  }, [marketplace]);

  return (
    <>
      <Header>
        <div>
          {/* TODO: marketplace icon */}
          {marketplace && <h1><MarketplaceBuildingIcon /> {marketplace?.name || 'Marketplace'}</h1>}
          {!marketplace && <h1><MarketsIcon /> {formatters.asteroidName(asteroid)}</h1>}
          <Subheader>
            <span><b>{orders.length || 0}</b> Open Order{orders.length === 1 ? '' : 's'} {marketplace ? 'at this Marketplace' : 'on this Asteroid'}</span>
          </Subheader>
        </div>
        {marketplace && marketplaceOwner && <CrewIndicator crew={marketplaceOwner} flip label="Managed by" />}
      </Header>

      <Body>
        <TableContainer>
          <DataTable
            columns={columns}
            data={sortedOrders || []}
            keyField="i"
            onClickColumn={handleSort}
            sortDirection={sortDirection}
            sortField={sortField}
          />
        </TableContainer>
      </Body>
    </>
  );
};

export default MarketplaceOpenOrders;
