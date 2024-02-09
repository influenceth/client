import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { Entity, Lot, Product } from '@influenceth/sdk';

import Details from '~/components/DetailsModal';
import { OrderIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import useLot from '~/hooks/useLot';
import Button from '~/components/ButtonAlt';
import MarketplaceHome from './marketplace/Home';
import MarketplaceDepthChart from './marketplace/DepthChart';
import MarketplaceOpenOrders from './marketplace/OpenOrders';
import useCrewContext from '~/hooks/useCrewContext';
import useCrew from '~/hooks/useCrew';
import AsteroidResourcePrices from './marketplace/AsteroidResourcePrices';
import marketplaceHeader from '~/assets/images/modal_headers/Marketplace.png';
import { getBuildingIcon, getProductIcon } from '~/lib/assetUtils';
import formatters from '~/lib/formatters';
import useCrewOrders from '~/hooks/useCrewOrders';
import useOrderSummaryByProduct from '~/hooks/useOrderSummaryByProduct';
import api from '~/lib/api';

const ActionImage = styled.div`
  background: black url("${p => p.src}") center center no-repeat;
  background-size: cover;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 350px;
  ${p => !p.isPreMasked && `
    background-position-y: -120px;
    mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 100%);
    opacity: 0.5;
  `};
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

const Marketplace = () => {
  const history = useHistory();
  const { asteroidId, lotIndex, discriminator } = useParams();
  const product = discriminator === 'orders' ? null : discriminator;
  const lotId = useMemo(() => Lot.toId(Number(asteroidId), lotIndex === 'all' ? null : Number(lotIndex)), [asteroidId, lotIndex]);

  const { search } = useLocation();
  const backOverride = useMemo(() => {
    const q = new URLSearchParams(search);
    return q.get('back');
  }, [search]);

  const { crew } = useCrewContext();
  const { data: asteroid } = useAsteroid(Number(asteroidId));
  const { data: lot } = useLot(lotId);
  const { data: marketplaceOwner } = useCrew(lot?.building?.Control?.controller?.id);

  const { data: myOpenOrders } = useCrewOrders(crew?.id);
  const { data: orderSummary } = useOrderSummaryByProduct(lotIndex === 'all' ? { label: Entity.IDS.ASTEROID, id: asteroidId } : { label: Entity.IDS.LOT, id: lotId });

  const [marketplaceTally, setMarketplaceTally] = useState(0);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!asteroidId) return;
    if (lotIndex === 'all') {
      // TODO: getAsteroidMarketplaceAggs
      //  - include marketplace tally and products tally
      api.getAsteroidMarketplaceAggs(asteroidId).then((data) => {
        console.log(data);
        setMarketplaceTally(data.marketplaceTally);
        setProducts(Object.keys(data.products));
      });
    } else if (lot?.building?.Exchange) {
      setProducts(lot?.building?.Exchange?.allowedProducts || []);
    }
  }, [asteroidId, lot?.building, lotIndex]);

  const [listings, orderTally] = useMemo(() => {
    let buyOrderTally = 0;
    let sellOrderTally = 0;
    const productListings = products.map((i) => {
      const summary = orderSummary?.[i] || {}; // TODO: combine
      buyOrderTally += summary.buy?.orders || 0;
      sellOrderTally += summary.sell?.orders || 0;
      return {
        product: i,
        buyOrders: summary.buy?.orders || 0,
        forBuy: summary.buy?.amount || 0,
        buyPrice: summary.buy?.price,
        // buyChange: 0,
        sellOrders: summary.sell?.orders || 0,
        forSale: summary.sell?.amount || 0,
        salePrice: summary.sell?.price,
        // saleChange: 0
      };
    });
    return [productListings, buyOrderTally + sellOrderTally];
  }, [orderSummary, products]);

  const marketplace = useMemo(() => {
    if (lot?.building?.Exchange) return lot.building;
    return null;
  }, [lot]);

  // TODO: if lot is loaded and this is not a marketplace, go back?

  const myLocalOrders = useMemo(() => (myOpenOrders || []).filter((o) => {
    const orderAsteroidId = o.locations.find((l) => l.label === Entity.IDS.ASTEROID)?.id;
    const orderLotId = o.locations.find((l) => l.label === Entity.IDS.LOT)?.id;
    return orderAsteroidId === Number(asteroidId) && (lotIndex === 'all' || Number(lot?.id) === orderLotId);
  }), [asteroidId, lot?.id, lotIndex, myOpenOrders]);

  const goBack = useCallback(() => {
    if (backOverride === 'all') {
      history.push(`/marketplace/${asteroidId}/all/${product || ''}`);
    } else {
      history.push(`/marketplace/${asteroidId}/${lotIndex}`);
    }
  }, [backOverride, product]);

  const goToMyOrders = useCallback(() => {
    history.push(`/marketplace/${asteroidId}/${lotIndex}/orders`);
  }, []);

  const onSelectListing = useCallback((listing) => {
    history.push(`/marketplace/${asteroidId}/${lotIndex}/${listing?.product || ''}`);
  }, []);

  const showFooter = discriminator || myLocalOrders.length > 0;

  // TODO: loading might be better than null
  if (!asteroid || (lotIndex !== 'all' && (!lot || !marketplace))) return null;
  return (
    <Details
      outerNode={product
        ? <ResourceActionImage src={getProductIcon(product, 'w400')} />
        : <ActionImage
            isPreMasked={!marketplace}
            src={marketplace ? getBuildingIcon(8, 'w1000') : marketplaceHeader} />
      }
      title={`${formatters.asteroidName(asteroid, '...')} > ${lotIndex === 'all' ? 'Markets' : formatters.buildingName(marketplace)}`}
      headerProps={{ underlineHeader: 'true' }}
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
              orders={myLocalOrders} />
          )}
          {discriminator && discriminator !== 'orders' && marketplace && (
            <MarketplaceDepthChart
              lot={lot}
              marketplace={marketplace}
              marketplaceOwner={marketplaceOwner}
              resource={Product.TYPES[product]} />
          )}
          {discriminator && discriminator !== 'orders' && !marketplace && (
            <AsteroidResourcePrices
              asteroid={asteroid}
              resource={Product.TYPES[product]} />
          )}
          {!discriminator && (
            <MarketplaceHome
              asteroid={asteroid}
              listings={listings}
              marketplace={marketplace}
              marketplaceOwner={marketplaceOwner}
              marketplaceTally={marketplaceTally}
              orderTally={orderTally}
              onSelectListing={onSelectListing} />
          )}
        </Wrapper>
        {showFooter && (
          <Footer>
            {discriminator && <Button flip subtle onClick={goBack}>Back</Button>}
            <div style={{ flex: 1 }} />
            {crew?.id && (!discriminator || (discriminator !== 'orders' && marketplace)) && (
              <>
                <OrderTally><OrderIcon /> {myLocalOrders.length} Order{myLocalOrders.length === 1 ? '' : 's'} {marketplace ? 'at this Marketplace' : 'on this Asteroid'}</OrderTally>
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
