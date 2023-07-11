import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { ChevronDoubleDownIcon, ChevronDoubleUpIcon, ChevronRightIcon, CompositionIcon, GridIcon, ProductIcon, ResourceIcon, SwayIcon } from '~/components/Icons';
import CrewIndicator from '~/components/CrewIndicator';
import DataTable from '~/components/DataTable';
import useCrew from '~/hooks/useCrew';
import { useResourceAssets } from '~/hooks/useAssets';
import TextInput from '~/components/TextInput';
import Dropdown from '~/components/DropdownV2';
import Button from '~/components/ButtonAlt';
import theme, { hexToRGB } from '~/theme';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import { formatResourceAmount } from '~/game/interface/hud/actionDialogs/components';
import ClipCorner from '~/components/ClipCorner';
import { formatFixed } from '~/lib/utils';
import moment from 'moment';
import { LocationLink } from '../listViews/components';

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
      font-size: 50px;
      font-weight: normal;
      line-height: 1em;
      margin: 0;
      text-transform: uppercase;
      svg {
        color: ${p => p.theme.colors.main};
        height: 35px;
        width: 35px;
      }
    }
    ${Subheader} {
      color: #999;
      line-height: 1em;
      padding-left: 50px;
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
  thead, tbody {
    th, td {
      background: transparent;
    }
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

const formatPrice = (sway, { minPrecision = 3, fixedPrecision } = {}) => {
  let unitLabel;
  let scale;
  if (sway >= 1e6) {
    scale = 1e6;
    unitLabel = 'M';
  } else if (sway >= 1e3) {
    scale = 1e3;
    unitLabel = 'k';
  } else {
    scale = 1;
    unitLabel = '';
  }

  const workingUnits = (sway / scale);

  let fixedPlaces = fixedPrecision || 0;
  if (fixedPrecision === undefined) {
    while (workingUnits * 10 ** (fixedPlaces + 1) < 10 ** minPrecision) {
      fixedPlaces++;
    }
  }
  return `${formatFixed(workingUnits, fixedPlaces)}${unitLabel}`;
}

const myOpenOrders = [
  { i: 1, type: 'LimitBuy', resourceId: 8, createdAt: 1688798552, amount: 12346, price: 1234, deliveryTo: 123 },
  { i: 2, type: 'LimitBuy', resourceId: 8, createdAt: 1688598552, amount: 12346, price: 1234, deliveryTo: 123 },
  { i: 3, type: 'LimitSell', resourceId: 9, createdAt: 1688998552, amount: 1246, price: 1234, deliveryTo: 100 },
  { i: 4, type: 'LimitBuy', resourceId: 8, createdAt: 1688298552, amount: 12346, price: 1234, deliveryTo: 123 },
  { i: 5, type: 'LimitSell', resourceId: 101, createdAt: 1688198552, amount: 22346, price: 1234, deliveryTo: 250 },
];

const MarketplaceOpenOrders = ({ lot, marketplace }) => {
  const resources = useResourceAssets();

  const { data: owner } = useCrew(lot?.occupier);

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
    return (myOpenOrders || [])
      .map((o) => ({
        ...o,
        resourceName: resources[o.resourceId]?.name,
        total: o.price * o.amount,
        ago: (new moment(new Date(1000 * (o.createdAt || 0)))).fromNow()
      }))
      .sort((a, b) => (sortDirection === 'asc' ? 1 : -1) * (a[sortField] < b[sortField] ? 1 : -1));
  }, [myOpenOrders, sortField, sortDirection]);

  const columns = useMemo(() => ([
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
  ]), [resources]);

  // TODO: loading might be better than null
  if (!owner) return null;
  return (
    <>
      <Header>
        <div>
          {/* TODO: marketplace icon */}
          <h1><CompositionIcon /> {marketplace?.name}</h1>
          <Subheader>
            <span><b>{myOpenOrders.length || 0}</b> Open Orders at this Marketplace</span>
          </Subheader>
        </div>
        <CrewIndicator crew={owner} flip label="Managed by" />
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
