import { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';

import Button from '~/components/ButtonAlt';
import ClipCorner from '~/components/ClipCorner';
import CrewIndicator from '~/components/CrewIndicator';
import DataTable from '~/components/DataTable';
import { ProductIcon, SwayIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import { formatResourceAmount } from '~/game/interface/hud/actionDialogs/components';
import useCrew from '~/hooks/useCrew';
import useLot from '~/hooks/useLot';
import { formatPrice } from '~/lib/utils';
import theme from '~/theme';
import { LocationLink } from '../listViews/components';
import { getBuildingIcon } from '~/lib/assetUtils';
import formatters from '~/lib/formatters';


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
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 10px),
    calc(100% - 10px) 100%,
    0 100%
  );
  margin-left: 15px;
  padding: 6px;
  position: relative;
  & img {
    clip-path: polygon(
      0 0,
      100% 0,
      100% calc(100% - 6px),
      calc(100% - 6px) 100%,
      0 100%
    );
    width: 232px;
  }
`;

const PseudoFooterButton = styled(Button)`
  position: absolute;
  bottom: 15px;
  right: 0px;
`;

const resourceMarketplaces = [
  { marketplaceName: `Joe's Spacing Emporium`, lotId: 2350, supply: 1234, demand: 0, centerPrice: 1244, fee: 0.05 },
  { marketplaceName: `The Fanciest of Stuffs`, lotId: 1572, supply: 8129, demand: 43666, centerPrice: 2044, fee: 0.075 },
  { marketplaceName: `Mom and Pop's`,          lotId: 9, supply: 12332555, demand: 34344, centerPrice: 1249, fee: 0.025 },
  // { marketplaceName: `Joe's Spacing Emporium`, lotId: 2351, supply: 1234, demand: 0, centerPrice: 1244, fee: 0.05 },
  // { marketplaceName: `The Fanciest of Stuffs`, lotId: 1571, supply: 8129, demand: 43666, centerPrice: 2044, fee: 0.075 },
  // { marketplaceName: `Mom and Pop's`,          lotId: 1, supply: 12332555, demand: 34344, centerPrice: 1249, fee: 0.025 },
  // { marketplaceName: `Joe's Spacing Emporium`, lotId: 2353, supply: 1234, demand: 0, centerPrice: 1244, fee: 0.05 },
  // { marketplaceName: `The Fanciest of Stuffs`, lotId: 1573, supply: 8129, demand: 43666, centerPrice: 2044, fee: 0.075 },
  // { marketplaceName: `Mom and Pop's`,          lotId: 3, supply: 12332555, demand: 34344, centerPrice: 1249, fee: 0.025 },
  // { marketplaceName: `Joe's Spacing Emporium`, lotId: 2354, supply: 1234, demand: 0, centerPrice: 1244, fee: 0.05 },
  // { marketplaceName: `The Fanciest of Stuffs`, lotId: 1574, supply: 8129, demand: 43666, centerPrice: 2044, fee: 0.075 },
  // { marketplaceName: `Mom and Pop's`,          lotId: 4, supply: 12332555, demand: 34344, centerPrice: 1249, fee: 0.025 },
];

const AsteroidResourcePrices = ({ asteroid, resource }) => {
  const history = useHistory();

  const [selected, setSelected] = useState();
  const [sort, setSort] = useState(['centerPrice', 'asc']);
  const [sortField, sortDirection] = sort;

  const { data: selectedLot } = useLot(asteroid.i, selected);
  const { data: marketplaceOwner } = useCrew(selectedLot?.occupier);
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
      {
        key: 'resourceName',
        label: 'Product',
        sortField: 'resourceName',
        selector: row => (
          <>
            <IconWrapper><ProductIcon /></IconWrapper>
            {resource.name}
          </>
        ),
      },
      {
        key: 'marketplaceName',
        label: 'Marketplace Name',
        sortField: 'marketplaceName',
        selector: row => (
          <>
            <LocationLink asteroidId={asteroid.i} lotId={row.lotId} zoomToLot />
            <span>{row.marketplaceName || `Marketplace at Lot #${row.lotId}`}</span>
          </>
        ),
      },
      {
        key: 'lotId',
        label: 'Lot ID',
        sortField: 'lotId',
        selector: row => row.lotId.toLocaleString(),
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
      {
        key: 'fee',
        label: 'Marketplace Fee',
        sortField: 'fee',
        selector: row => `${(100 * row.fee).toFixed(1)}%`,
      },
    ];
    return c;
  }, [asteroid, resource]);

  const getRowProps = useCallback((row) => {
    return {
      onClick: () => {
        setSelected(row.lotId);
      },
      isSelected: (selected === row.lotId)
    }
  }, [selected]);

  const onViewMarketplace = useCallback(() => {
    history.push(`/marketplace/${asteroid.i}/${selected}/${resource.i}?back=all`);
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
              {/* TODO: resource categories */}
              <span>Raw Material</span>
              <span>Volatile</span>
            </Subheader>
            <MarketSummary>
              <div>
                Listed at <b>{resourceMarketplaces.length} Marketplaces</b> on <b>{formatters.asteroidName(asteroid)}</b>
              </div>
              <div>
                Total Supply: <span style={{ color: theme.colors.green }}>{formatResourceAmount(totalSupply, resource.i)}</span>
              </div>
              <div>
                Total Demand: <span style={{ color: theme.colors.main }}>{formatResourceAmount(totalDemand, resource.i)}</span>
              </div>
            </MarketSummary>
            <MarketPrice>
              <label>Median Price:</label> <SwayIcon />{formatPrice(medianPrice)}<label>/{resource.massPerUnit === 0.001 ? 'kg' : 'unit'}</label>
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
              <label>{selectedLot.building?.name || `Marketplace @ ${selectedLot.i.toLocaleString()}`}</label>
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

      <PseudoFooterButton subtle disabled={!selected || undefined} onClick={onViewMarketplace}>
        View Marketplace
      </PseudoFooterButton>
    </>
  );
};

export default AsteroidResourcePrices;
