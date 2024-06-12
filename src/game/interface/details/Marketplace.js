import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { Entity, Lot, Product } from '@influenceth/sdk';

import OnClickLink from '~/components/OnClickLink';
import Pagination from '~/components/Pagination';
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
  justify-content: center;
`;
const FooterLeft = styled.div`
  flex: 1;
  display: flex;
  justify-content: flex-start;
  & > button {
    margin-right: 10px;
  }
`;
const FooterRight = styled.div`
  flex: 1;
  display: flex;
  justify-content: flex-end;
`;
const OrderTally = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  & > span {
    margin-left: 6px;
  }
`;

const OpenOrdersButton = styled(OnClickLink)`
  color: ${p => p.theme.colors.main};
  display: flex;
  align-items:center;
  & > svg {
    font-size: 175%;
    margin-right: 4px;
  }
`;

const pageSize = 25;

const Marketplace = () => {
  const history = useHistory();
  const { asteroidId, lotIndex, discriminator } = useParams();
  const product = discriminator === 'orders' ? null : discriminator;
  const lotId = useMemo(() => Lot.toId(Number(asteroidId), lotIndex === 'all' ? null : Number(lotIndex)), [asteroidId, lotIndex]);

  const [mode, setMode] = useState('buy');
  const [nameFilter, setNameFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState('liquidity');

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
    const allProducts = new Set([...products, ...Object.keys(orderSummary || {}).map(Number)]);
    const productListings = ([...allProducts]).map((i) => {
      const summary = orderSummary?.[i] || {};
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

  const goToListings = useCallback(() => {
    history.push(`/marketplace/${asteroidId}/${lotIndex}`);
  }, []);

  const goToMyOrders = useCallback(() => {
    history.push(`/marketplace/${asteroidId}/${lotIndex}/orders`);
  }, []);

  const onSelectListing = useCallback((listing) => {
    history.push(`/marketplace/${asteroidId}/${lotIndex}/${listing?.product || ''}`);
  }, []);

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
      contentProps={{ style: { marginBottom: 0, overflow: 'hidden' } }}
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
              mode={mode}
              resource={Product.TYPES[product]} />
          )}
          {!discriminator && (
            <MarketplaceHome
              asteroid={asteroid}
              listings={listings}
              marketplace={marketplace}
              marketplaceOwner={marketplaceOwner}
              marketplaceTally={marketplaceTally}
              mode={mode}
              setMode={setMode}
              orderTally={orderTally}
              onSelectListing={onSelectListing} />
          )}
        </Wrapper>
          <Footer>
              <FooterLeft>
                {discriminator && <Button flip onClick={goBack}>Back</Button>}
              </FooterLeft>
              <OrderTally>
              {myLocalOrders.length > 0 && (
                <>
                <OpenOrdersButton onClick={goToMyOrders} ><OrderIcon />My Open Limit Orders</OpenOrdersButton>
                <span>{myLocalOrders.length} {marketplace ? 'at this Marketplace' : 'on this Asteroid'}</span>
                </>
              )}
              </OrderTally>
              <FooterRight>
              </FooterRight>
          </Footer>
      </Wrapper>
    </Details>
  );
};

export default Marketplace;
