import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import Ticker from 'react-ticker';
import { Product } from '@influenceth/sdk';

import ClipCorner from '~/components/ClipCorner';
import CrewIndicator from '~/components/CrewIndicator';
import Dropdown from '~/components/Dropdown';
import {
  ChevronDoubleDownIcon, ChevronDoubleUpIcon, ChevronRightIcon, GridIcon, MarketplaceBuildingIcon, MarketsIcon,
  SwayIcon
} from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import Switcher from '~/components/SwitcherButton';
import TextInput from '~/components/TextInput';
import Pagination from '~/components/Pagination';
import { AsteroidImage, formatResourceAmount } from '~/game/interface/hud/actionDialogs/components';
import { formatPrecision, formatPrice } from '~/lib/utils';
import theme, { hexToRGB } from '~/theme';
import formatters from '~/lib/formatters';

const Subheader = styled.div``;
const Header = styled.div`
  align-items: center;
  border-bottom: 1px solid #333;
  display: flex;
  flex-direction: row;
  height: ${p => p.marketplace ? '150px' : '200px'};
  margin-top: -25px;
  padding-bottom: 25px;
  padding-top: 25px;

  & > div:first-child {
    flex: 1;
    h1 {
      align-items: center;
      display: flex;
      ${p => p.marketplace ? '' : 'color: white;'}
      font-size: 50px;
      font-weight: normal;
      line-height: 1em;
      margin: 0;
      text-transform: uppercase;
      svg {
        color: ${p => p.marketplace ? p.theme.colors.main : '#CCC'};
        height: 1em;
        margin-right: 6px;
      }
    }
    ${Subheader} {
      color: #999;
      line-height: 1em;
      padding-left: ${p => p.marketplace ? '56px' : '0'};
      padding-top: 10px;
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

const BodyNav = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 64px;
  & > *:not(:last-child) {
    margin-right: 8px;
  }
`;

const IconPillow = styled.div`
  align-items: center;
  background: ${p => p.theme.colors.main};
  color: white;
  display: flex;
  font-size: 22px;
  height: 34px;
  justify-content: center;
  width: 34px;
`;

const ResultsTally = styled.div`
  align-items: center;
  color: ${p => p.theme.colors.main};
  display: flex;
  flex-direction: row;
  font-size: 90%;
  margin-left: 10px;
  & > span {
    margin-left: 4px;
  }
`;

const Body = styled.div`
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  margin: 0px 0px 10px;
`;

const Listings = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin: 10px -5px 0;
`;

const Listing = styled.div`
  background: black;
  border: 1px solid #333;
  cursor: ${p => p.theme.cursors.active};
  margin: 0 5px 10px;
  padding: 4px;
  position: relative;
  text-align: center;
  width: 178px;

  ${p => p.theme.clipCorner(10)};

  transition: background 100ms ease;
  &:hover {
    background: rgba(${p => hexToRGB(p.theme.colors.main)}, 0.2);
    border-color: ${theme.colors.main};
  }
  &:hover > svg {
    stroke: ${theme.colors.main};
  }
`;

const ListingTitle = styled.div`
  font-size: 110%;
  overflow: hidden;
  padding: 6px 4px 0;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ListingAmount = styled.div`
  font-weight: normal;
  color: ${p => p.theme.colors[p.color || 'secondaryText']};
  font-size: 80%;
  margin-top: 2px;
`;

const ListingPrice = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  padding: 10px 0 2px;
  width: 100%;
  & > svg:first-child {
    font-size: 30px;
  }
`;

const Price = styled.div`
  flex: 1 0 0;
  font-size: 24px;
  text-align: left;
  ${p => p.unit && `
    &:after {
      content: "/${p.unit}";
      font-size: 67%;
      opacity: 0.6;
    }
  `}
`;

const PriceArrow = styled.div`
  color: ${p => p.mode === 'buy' ? theme.colors.green : theme.colors.main};
  font-size: 25px;
  line-height: 0;
`;

const ChangeBubble = styled.div`
  align-items: ${p => p.isUp ? 'flex-start' : 'flex-end'};
  background: rgba(${p => hexToRGB(p.isUp ? p.theme.colors.green : p.theme.colors.red)}, 0.3);
  border-radius: 10px;
  color: ${p => p.isUp ? p.theme.colors.green : p.theme.colors.red};
  display: flex;
  font-size: 14px;
  padding: 2px 8px;
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 1;
  &:before {
    content: "▾";
    font-size: 14px;
    margin-bottom: 1px;
    margin-right: 3px;
    line-height: 14px;
    ${p => p.isUp && `
      margin-top: 1px;
      transform: rotate(180deg);
    `}
  }
`;

const ListingOffer = styled.div`
  align-items: center;
  background: rgba(${p => p.theme.colors.mainRGB}, 0.2);
  color: ${p => p.theme.colors.main};
  display: flex;
  flex-direction: row;
  height: 32px;
  margin-top: 10px;
  transition: background 100ms ease;
  & label {
    flex: 1 0 0;
    padding-left: 6px;
    text-align: left;
  }

  ${p => p.theme.clipCorner(8)};

  ${Listing}:hover & {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.4);
  }
`;

const TickerItems = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 50px;
`;

const TickerItem = styled.div`
  align-items: center;
  border-radius: 4px;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  font-size: 15px;
  font-weight: bold;
  padding: 5px 20px 5px 0;

  &:before {
    opacity: 0.6;
    padding-right: 20px;
    content: "|";
  }

  &:hover {
    background: #171717;
  }

  & > svg {
    font-size: 22px;
  }
  & > span {
    white-space: nowrap;
  }
  ${ChangeBubble} {
    margin-left: 4px;
    position: static;
  }
`;

const StyledPagination = styled(Pagination)`
  display: flex;
  justify-content: flex-end;
  bottom: 0px;
`;

const footerHeight = 70;
const Footer = styled.div`
  align-items: center;
  border-top: 1px solid #333;
  display: flex;
  flex-direction: row;
  height: ${footerHeight}px;
  justify-content: flex-end;
`;

const pageSize = 25;

const MarketplaceHome = ({ asteroid, listings, orderTally, onSelectListing, marketplace = null, marketplaceOwner = null, marketplaceTally }) => {
  const [mode, setMode] = useState('buy');
  const [nameFilter, setNameFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState('liquidity');

  const options = [
    { value: 'liquidity', label: 'Liquidity' },
    { value: 'alphabetical', label: 'Alphabetical'}
  ];

  const tickerEnabled = useMemo(() => {
    return !marketplace;
  }, [!!marketplace]);

  const tickerListings = useMemo(() => {
    if (!tickerEnabled) return [];

    return listings
      .filter((l) => {
        if (mode === 'buy') return l.forSale > 0;
        return l.forBuy > 0;
      })
      .sort((a, b) => {
        return a.forBuy + a.forSale < b.forBuy + b.forSale ? 1 : -1;
      })
      .slice(0, 10);
  }, [tickerEnabled, listings, mode]);

  const [ filteredCount, filteredListings ] = useMemo(() => {
    const filtered = listings
      .filter(({ product }) => {
        return nameFilter.length === 0 ||
          Product.TYPES[product].name.toLowerCase().includes((nameFilter || '').toLowerCase());
      })
      .sort((a, b) => {
        if (sort === 'liquidity') return a.forBuy + a.forSale < b.forBuy + b.forSale ? 1 : -1;
        if (sort === 'alphabetical') return Product.TYPES[a.product].name > Product.TYPES[b.product].name ? 1 : -1;
      });

    return [filtered.length, filtered.slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize)];
  }, [listings, nameFilter, currentPage, sort]);

  // unclear why this is required, but if no timeout, then ticker just renders a "0"
  const [tickerReady, setTickerReady] = useState(false);
  useEffect(() => {
    if (!!tickerListings?.length) {
      setTimeout(() => {
        setTickerReady(true);
      }, 500)
    }
  }, [!!tickerListings?.length]);

  // TODO: loading might be better
  if (!asteroid) return null;
  return (
    <>
      <Header marketplace={!!marketplace}>
        {marketplace
          ? (
            <>
              <div>
                <h1><MarketplaceBuildingIcon /> {formatters.buildingName(marketplace)}</h1>
                <Subheader>
                  <span>Marketplace</span>
                  <span><b>{listings.length || 0}</b> Listed Product{listings.length === 1 ? '' : 's'}</span>
                  <span><b>{orderTally}</b> Active Order{orderTally === 1 ? '' : 's'}</span>
                </Subheader>
              </div>
              {marketplaceOwner && <CrewIndicator crew={marketplaceOwner} flip label="Managed by" />}
            </>
          )
          : (
            <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row' }}>
              <AsteroidImage asteroid={asteroid} size="125px" />
              <div style={{ flex: 1, paddingLeft: 25 }}>
                <h1><MarketsIcon /> {formatters.asteroidName(asteroid)} Markets</h1>
                <Subheader>
                  <span><b>{marketplaceTally}</b> Marketplace{marketplaceTally === 1 ? '' : 's'}</span>
                  <span><b>{listings.length || 0}</b> Product{listings.length === 1 ? '' : 's'} Listed</span>
                  <span><b>{orderTally}</b> Active Order{orderTally === 1 ? '' : 's'}</span>
                </Subheader>
              </div>
            </div>
          )
        }
      </Header>

      {tickerEnabled && !tickerReady && (
        <TickerItems>
          <TickerItem>
          </TickerItem>
        </TickerItems>
      )}

      {tickerEnabled && tickerReady && (
        <Ticker>
          {() => (
            <TickerItems>
              {tickerListings.map((listing) => {
                const resource = Product.TYPES[listing.product];
                const price = mode === 'buy' ? listing.salePrice : listing.buyPrice;
                const change = mode === 'buy' ? listing.saleChange : listing.buyChange; // TODO: ...
                return (
                  <TickerItem key={listing.product} onClick={() => onSelectListing(listing)}>
                    <span>{resource.name}</span>
                    <SwayIcon />
                    <span>{formatPrice(price)}</span>
                    {change && <ChangeBubble isUp={change > 0}>{change > 0 ? '+' : ''}{formatPrecision(100 * change, 3)}%</ChangeBubble>}
                  </TickerItem>
                );
              })}
            </TickerItems>
          )}
        </Ticker>
      )}

      <BodyNav style={tickerListings?.length > 0 ? { borderTop: '1px solid #333' } : {}}>
        <TextInput
          initialValue={nameFilter}
          onChange={setNameFilter}
          placeholder="Search by Name"
          style={{ borderWidth: '1px', height: '34px', width: '240px' }} />
        <Dropdown
          initialSelection={sort}
          options={options}
          onChange={(sort) => setSort(sort.value)}
          size="small"
          style={{ textTransform: 'none', width: '240px' }} />
        <ResultsTally>
          <GridIcon /> <span>{filteredCount} Result{filteredListings.length === 1 ? '' : 's'} ({listings.length} Total)</span>
        </ResultsTally>

        <div style={{ flex: 1 }} />

        <Switcher
          buttons={[
            {
              icon: <ChevronDoubleDownIcon />,
              label: 'Buy',
              value: 'buy'
            },
            {
              icon: <ChevronDoubleUpIcon />,
              label: 'Sell',
              value: 'sell'
            }
          ]}
          onChange={setMode}
          size="small"
          value={mode} />

      </BodyNav>

      <Body>
        <Listings>
          {filteredListings
            .map((listing) => {
              let thumbBG = 'rgba(80, 80, 80, 0.1)';
              if (!!marketplace) {
                if (mode === 'buy' && listing.forSale > 0) {
                  thumbBG = `rgba(${hexToRGB(theme.colors.buy)}, 0.1);`;//`#002511`;
                } else if (mode === 'sell' && listing.forBuy > 0) {
                  thumbBG = `rgba(${hexToRGB(theme.colors.sell)}, 0.1);`//`#0d2a33`;
                };
              }
              const resource = Product.TYPES[listing.product];
              const amount = mode === 'buy' ? listing.forSale : listing.forBuy;
              const price = mode === 'buy' ? listing.salePrice : listing.buyPrice;
              const change = mode === 'buy' ? listing.saleChange : listing.buyChange; // TODO: ...
              return (
                <Listing key={listing.product} onClick={() => onSelectListing(listing)}>
                  {!!marketplace && change && <ChangeBubble isUp={change > 0}>{change > 0 ? '+' : ''}{formatPrecision(100 * change, 3)}%</ChangeBubble>}
                  <ResourceThumbnail
                    backgroundColor={thumbBG}
                    outlineColor="transparent"
                    resource={resource}
                    size="170px"
                    style={amount === 0 ? { opacity: 0.5 } : {}}
                    tooltipContainer={null} />
                  <ListingTitle>{resource.name}</ListingTitle>
                  <ListingAmount color={amount > 0 ? mode : null}>
                    {amount > 0 ? formatResourceAmount(amount, listing.product) : 'None'} {mode === 'buy' ? 'Available' : 'Sellable'}
                  </ListingAmount>
                  {amount > 0
                    ? (
                      <ListingPrice>
                        <SwayIcon />
                        <Price unit={resource.isAtomic ? 'unit' : 'kg'}>{formatPrice(price)}</Price>
                        <PriceArrow mode={mode}><ChevronRightIcon /></PriceArrow>
                      </ListingPrice>
                    )
                    : (
                      <ListingOffer>
                        <label>Make Offer</label>
                        <PriceArrow><ChevronRightIcon /></PriceArrow>
                      </ListingOffer>
                    )}
                  <ClipCorner dimension={10} color="#333" />
                </Listing>
              );
            })}
        </Listings>
      </Body>
        <Footer>
          <StyledPagination
            currentPage={currentPage}
            rowsPerPage={pageSize}
            rowCount={filteredCount}
            onChangePage={(page) => setCurrentPage(page)} />
        </Footer>
    </>
  );
};

export default MarketplaceHome;
