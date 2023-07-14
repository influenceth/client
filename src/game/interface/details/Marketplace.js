import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { Inventory } from '@influenceth/sdk';

import Details from '~/components/DetailsModal';
import { OrderIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import useLot from '~/hooks/useLot';
import { useBuildingAssets, useResourceAssets } from '~/hooks/useAssets';
import Button from '~/components/ButtonAlt';
import theme, { hexToRGB } from '~/theme';
import { formatFixed } from '~/lib/utils';
import MarketplaceHome from './marketplace/Home';
import MarketplaceDepthChart from './marketplace/DepthChart';
import MarketplaceOpenOrders from './marketplace/OpenOrders';
import useCrewContext from '~/hooks/useCrewContext';
import useCrew from '~/hooks/useCrew';
import AsteroidResourcePrices from './marketplace/AsteroidResourcePrices';


const ActionImage = styled.div`
  background: black url("${p => p.src}") center center no-repeat;
  background-position-y: -120px;
  background-size: cover;
  mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 100%);
  opacity: 0.5;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 350px;
`;
const ResourceActionImage = styled(ActionImage)`
  background-position-x: -225px;
  background-position-y: -250px;
  opacity: 0.3;
  right: auto;
  width: 1000px;
  height: 500px;
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
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
const OrderTally = styled.div`
  align-items: center;
  color: ${p => p.theme.colors.main};
  display: flex;
  font-size: 95%;
  margin-right: 20px;
  & > svg {
    font-size: 24px;
    margin-right: 4px;
  }
`;

const myOpenOrders = [
  { i: 1, asteroidId: 1000, lotId: 2350, marketplaceName: `Joe's Spacing Emporium`, type: 'LimitBuy', resourceId: 8, createdAt: 1688798552, amount: 12346, price: 1234, deliveryTo: 123 },
  { i: 2, asteroidId: 1000, lotId: 2350, marketplaceName: `Joe's Spacing Emporium`, type: 'LimitBuy', resourceId: 8, createdAt: 1688598552, amount: 12346, price: 1234, deliveryTo: 123 },
  { i: 3, asteroidId: 1000, lotId: 2350, marketplaceName: `Joe's Spacing Emporium`, type: 'LimitSell', resourceId: 9, createdAt: 1688998552, amount: 1246, price: 1234, deliveryTo: 100 },
  { i: 4, asteroidId: 1000, lotId: 1572, marketplaceName: `The Fanciest of Stuffs`, type: 'LimitBuy', resourceId: 8, createdAt: 1688298552, amount: 12346, price: 1234, deliveryTo: 123 },
  { i: 5, asteroidId:    1, lotId: 2350, marketplaceName: `Emma's Space Resources`, type: 'LimitSell', resourceId: 101, createdAt: 1688198552, amount: 22346, price: 1234, deliveryTo: 250 },
];

const asteroidListings = [];
for (let resourceId = 1; resourceId <= 245; resourceId++) {
  if (!Inventory.RESOURCES[resourceId]) continue;
  if (resourceId % 3 === 0) {
    asteroidListings.push({
      resourceId,
      lotId: 2350,
      forBuy: resourceId % 6 === 0 ? 0 : resourceId * 197,
      buyPrice: resourceId * 1112,
      buyChange: Math.random() - 0.5,
      forSale: resourceId % 5 === 0 ? 0 : resourceId * 123,
      salePrice: resourceId * 1357,
      saleChange: Math.random() - 0.5,
    });
  }
  if (resourceId % 4 === 0) {
    asteroidListings.push({
      resourceId,
      lotId: 1572,
      forBuy: resourceId % 5 === 0 ? 0 : resourceId * 1027,
      buyPrice: resourceId * 1132,
      buyChange: Math.random() - 0.5,
      forSale: resourceId % 6 === 0 ? 0 : resourceId * 1123,
      salePrice: resourceId * 1337,
      saleChange: Math.random() - 0.5,
    });
  }
}

const Marketplace = (props) => {
  const buildings = useBuildingAssets();
  const resources = useResourceAssets();

  const history = useHistory();
  const { asteroidId, lotId, discriminator } = useParams();
  const { search } = useLocation();

  const backOverride = useMemo(() => {
    const q = new URLSearchParams(search);
    return q.get('back');
  }, [search]);

  const { crew } = useCrewContext();
  const { data: asteroid } = useAsteroid(Number(asteroidId));
  const { data: lot } = useLot(Number(asteroidId), lotId === 'all' ? null : Number(lotId));
  const { data: marketplaceOwner } = useCrew(lot?.occupier);

  const resourceId = discriminator === 'orders' ? null : discriminator;
  const resource = resources[resourceId];

  // TODO: if lot is loaded and this is not a marketplace, go back

  const localOrders = useMemo(() => (myOpenOrders || []).filter((o) => {
    return o.asteroidId === Number(asteroidId) && (lotId === 'all' || Number(lotId) === o.lotId);
  }), [asteroidId, lotId, myOpenOrders]);

  const marketplace = lotId === 'all' ? null : {
    name: `Joe's Spacing Emporium`,
    listings: asteroidListings.filter((l) => l.lotId === lotId),
    orders: []
  };

  const rolledUpListings = useMemo(() => {
    const rollup = asteroidListings.reduce((acc, cur) => {
      if (!acc[cur.resourceId]) {
        acc[cur.resourceId] = {
          resourceId: cur.resourceId,
          forBuy: 0,
          buyPrice: -1,
          buyChange: -1,
          forSale: 0,
          salePrice: Infinity,
          saleChange: Infinity,
        };
      }
      acc[cur.resourceId].forBuy += cur.forBuy;
      acc[cur.resourceId].buyPrice = Math.max(acc[cur.resourceId].buyPrice, cur.buyPrice);
      acc[cur.resourceId].buyChange = Math.max(acc[cur.resourceId].buyChange, cur.buyChange);
      acc[cur.resourceId].forSale += cur.forSale;
      acc[cur.resourceId].salePrice = Math.min(acc[cur.resourceId].salePrice, cur.salePrice);
      acc[cur.resourceId].saleChange = Math.min(acc[cur.resourceId].saleChange, cur.saleChange);
      return acc;
    }, {});
    return Object.values(rollup);
  }, [asteroidListings]);

  const goBack = useCallback(() => {
    if (backOverride === 'all') {
      history.push(`/marketplace/${asteroidId}/all/${resourceId || ''}`);
    } else {
      history.push(`/marketplace/${asteroidId}/${lotId}`);
    }
  }, [backOverride, resourceId]);

  const goToMyOrders = useCallback(() => {
    history.push(`/marketplace/${asteroidId}/${lotId}/orders`);
  }, []);

  const onSelectListing = useCallback((listing) => {
    history.push(`/marketplace/${asteroidId}/${lotId}/${listing?.resourceId || ''}`);
  }, []);

  const showFooter = discriminator || localOrders.length > 0;

  // TODO: loading might be better than null
  if (!asteroid || (lotId !== 'all' && (!lot || !marketplace))) return null;
  return (
    <Details
      outerNode={resource
        ? <ResourceActionImage src={resource.iconUrls.w400} />
        : <ActionImage src={buildings[8].iconUrls.w1000} />
      }
      title={`${asteroid.customName || asteroid.baseName || '...'} > ${lotId === 'all' ? 'Markets' : (marketplace.name || 'Marketplace')}`}
      underlineHeader
      contentProps={showFooter ? { style: { marginBottom: 0 } } : {}}
      maxWidth="1600px"
      width="max">
      <Wrapper>
        <Wrapper style={{ height: `calc(100% - ${footerHeight}px)` }}>
          {discriminator === 'orders' && (
            <MarketplaceOpenOrders
              asteroid={asteroid}
              marketplace={marketplace}
              marketplaceOwner={marketplaceOwner}
              orders={localOrders} />
          )}
          {discriminator && discriminator !== 'orders' && marketplace && (
            <MarketplaceDepthChart
              lot={lot}
              marketplace={marketplace}
              marketplaceOwner={marketplaceOwner}
              resource={resource} />
          )}
          {discriminator && discriminator !== 'orders' && !marketplace && (
            <AsteroidResourcePrices
              asteroid={asteroid}
              resource={resource} />
          )}
          {!discriminator && (
            <MarketplaceHome
              asteroid={asteroid}
              listings={marketplace ? marketplace.listings : rolledUpListings}
              marketplace={marketplace}
              marketplaceOwner={marketplaceOwner}
              orders={marketplace?.orders || []}
              onSelectListing={onSelectListing} />
          )}
        </Wrapper>
        {showFooter && (
          <Footer>
            {discriminator && <Button flip subtle onClick={goBack}>Back</Button>}
            <div style={{ flex: 1 }} />
            {crew?.i && (!discriminator || (discriminator !== 'orders' && marketplace)) && (
              <>
                <OrderTally><OrderIcon /> {localOrders.length} Order{localOrders.length === 1 ? '' : 's'} {marketplace ? 'at this Marketplace' : 'on this Asteroid'}</OrderTally>
                <Button subtle onClick={goToMyOrders}>My Open Orders</Button>
              </>
            )}
          </Footer>
        )}
      </Wrapper>
    </Details>
  );
};

export default Marketplace;
