import { useState } from 'react';
import styled from 'styled-components';

import { ChevronDoubleDownIcon, ChevronDoubleUpIcon, ChevronRightIcon, CompositionIcon, GridIcon, SwayIcon } from '~/components/Icons';
import CrewIndicator from '~/components/CrewIndicator';
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

const Switcher = styled.div`
  display: flex;
  flex-direction: row;
`;
const SwitcherButton = styled(Button)`
  width: 150px;
`;
const SwitcherButtonInner = styled.div`
  align-items: center;
  display: flex;
  & > svg {
    font-size: 85%;
    margin-right: 12px;
  }
`;

const Body = styled.div`
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
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
  width: 180px;

  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 10px),
    calc(100% - 10px) 100%,
    0 100%
  );

  transition: background 250ms ease;
  &:hover {
    background: #111;
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
  color: #565656;
  ${p => p.color && `
    color: ${p.color === 'buy' ? theme.colors.green : theme.colors.main};
  `}
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

const ListingOffer = styled.div`
  align-items: center;
  background: rgba(${p => p.theme.colors.mainRGB}, 0.2);
  color: ${p => p.theme.colors.main};
  display: flex;
  flex-direction: row;
  height: 32px;
  margin-top: 10px;
  transition: background 250ms ease;
  & label {
    flex: 1 0 0;
    padding-left: 6px;
    text-align: left;
    text-transform: uppercase;
  }

  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 8px),
    calc(100% - 8px) 100%,
    0 100%
  );

  ${Listing}:hover & {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.4);
  }
`;

const greenRGB = hexToRGB(theme.colors.green);

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

const MarketplaceHome = ({ lot, marketplace, onSelectListing }) => {
  const resources = useResourceAssets();

  const { data: owner } = useCrew(lot?.occupier);

  const [mode, setMode] = useState('buy');
  const [nameFilter, setNameFilter] = useState('');

  const options = [
    { key: 'recentlyTraded', label: 'Recently Traded' }
  ];

  // TODO: loading might be better than null
  if (!owner) return null;
  return (
    <>
      <Header>
        <div>
          {/* TODO: marketplace icon */}
          <h1><CompositionIcon /> {marketplace?.name}</h1>
          <Subheader>
            <span>Marketplace</span>
            <span><b>{marketplace.listings.length || 0}</b> Listed Product{marketplace.listings.length === 1 ? '' : 's'}</span>
            <span><b>{marketplace.orders.length || 0}</b> Active Order{marketplace.orders.length === 1 ? '' : 's'}</span>
          </Subheader>
        </div>
        <CrewIndicator crew={owner} flip label="Managed by" />
      </Header>
      <BodyNav>
        <IconPillow><GridIcon /></IconPillow>
        <TextInput
          initialValue={nameFilter}
          onChange={setNameFilter}
          placeholder="Search by Name"
          style={{ borderWidth: '1px', height: '34px', width: '240px' }} />
        <Dropdown
          options={options}
          size="small"
          style={{ textTransform: 'none', width: '240px' }} />
        <ResultsTally>
          <GridIcon /> <span>10 Results</span>
        </ResultsTally>
        
        <div style={{ flex: 1 }} />

        <Switcher>
          <SwitcherButton
            background={mode === 'buy' ? theme.colors.main : '#444'}
            flip
            onClick={() => setMode('buy')}
            size="small"
            style={{ borderRight: 0, color: mode === 'buy' ? undefined : '#999' }}>
            <SwitcherButtonInner>
              <ChevronDoubleDownIcon />
              Buy
            </SwitcherButtonInner>
          </SwitcherButton>
          <SwitcherButton
            background={mode === 'sell' ? theme.colors.main : '#444'}
            onClick={() => setMode('sell')}
            size="small"
            style={{ borderLeft: 0, color: mode === 'sell' ? undefined : '#999' }}>
            <SwitcherButtonInner>
              <ChevronDoubleUpIcon />
              Sell
            </SwitcherButtonInner>
          </SwitcherButton>
        </Switcher>
        {/* TODO: switcher */}

      </BodyNav>

      <Body>
        <Listings>
          {marketplace.listings
            // .filter(({ resourceId }) => nameFilter.length === 0 || resources[resourceId].name.toLowerCase().includes(nameFilter))
            // .sort() // TODO: according to dropdown
            .map((listing) => {
              let thumbBG = 'rgba(170, 170, 170, 0.2)';
              if (mode === 'buy' && listing.forSale > 0) {
                thumbBG = `rgba(${greenRGB}, 0.2);`;//`#002511`;
              } else if (mode === 'sell' && listing.forBuy > 0) {
                thumbBG = `rgba(${theme.colors.mainRGB}, 0.2);`//`#0d2a33`;
              };
              const resource = resources[listing.resourceId];
              const amount = mode === 'buy' ? listing.forSale : listing.forBuy;
              const price = (mode === 'buy' ? listing.buyPrice : listing.salePrice);
              return (
                <Listing key={listing.resourceId} onClick={() => onSelectListing(listing)}>
                  <ResourceThumbnail
                    backgroundColor={thumbBG}
                    outlineColor="transparent"
                    resource={resource}
                    size="170px"
                    style={amount === 0 ? { opacity: 0.5 } : {}}
                    tooltipContainer={null} />
                  <ListingTitle>{resource.name}</ListingTitle>
                  <ListingAmount color={amount > 0 && mode}>{amount > 0 ? formatResourceAmount(amount, listing.resourceId) : 'None'} {mode === 'buy' ? 'Available' : 'Sellable'}</ListingAmount>
                  {amount > 0
                    ? (
                      <ListingPrice>
                        <SwayIcon />
                        <Price unit={resource.massPerUnit === 0.001 ? 'kg' : 'unit'}>{formatPrice(price)}</Price>
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
    </>
  );
};

export default MarketplaceHome;
