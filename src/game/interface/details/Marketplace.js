import { useCallback, useState } from 'react';
import styled from 'styled-components';
import { useHistory, useParams } from 'react-router-dom';

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

const Marketplace = (props) => {
  const buildings = useBuildingAssets();
  const resources = useResourceAssets();

  const history = useHistory();
  const { asteroidId, lotId, discriminator } = useParams();

  const { crew } = useCrewContext();
  const { data: asteroid } = useAsteroid(Number(asteroidId));
  const { data: lot } = useLot(Number(asteroidId), Number(lotId));

  const resourceId = discriminator === 'orders' ? null : discriminator;

  // TODO: if lot is loaded and this is not a marketplace, go back

  const myOpenOrders = 2;
  const marketplace = {
    name: `Joe's Spacing Emporium`,
    listings: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144].map((resourceId) => ({
      resourceId,
      forBuy: resourceId % 2 === 0 ? 0 : resourceId * 197,
      buyPrice: resourceId * 1112,
      forSale: resourceId % 2 === 0 ? resourceId * 123 : 0,
      salePrice: resourceId * 1357,
    })),
    orders: []
  };

  const goBack = useCallback(() => {
    history.push(`/marketplace/${asteroidId}/${lotId}`);
  }, []);

  const goToMyOrders = useCallback(() => {
    history.push(`/marketplace/${asteroidId}/${lotId}/orders`);
  }, []);

  const onSelectListing = useCallback((listing) => {
    history.push(`/marketplace/${asteroidId}/${lotId}/${listing?.resourceId || ''}`);
  }, []);

  // TODO: loading might be better than null
  if (!asteroid || !lot || !marketplace) return null;
  return (
    <Details
      outerNode={resourceId
        ? <ResourceActionImage src={resources[resourceId].iconUrls.w400} />
        : <ActionImage src={buildings[8].iconUrls.w1000} />
      }
      title={`${asteroid.customName || asteroid.baseName || '...'} > ${marketplace.name || 'Marketplace'}`}
      underlineHeader
      contentProps={myOpenOrders ? { style: { marginBottom: 0 } } : {}}
      maxWidth="1600px"
      width="max">
      <Wrapper>
        <Wrapper style={{ height: `calc(100% - ${footerHeight}px)` }}>
          {discriminator === 'orders' && (
            <MarketplaceOpenOrders lot={lot} marketplace={marketplace} />
          )}
          {discriminator && discriminator !== 'orders' && (
            <MarketplaceDepthChart lot={lot} marketplace={marketplace} resource={resources[resourceId]} />
          )}
          {!discriminator && (
            <MarketplaceHome lot={lot} marketplace={marketplace} onSelectListing={onSelectListing} />
          )}
        </Wrapper>
        {myOpenOrders && (
          <Footer>
            {discriminator && <Button flip subtle onClick={goBack}>Back</Button>}
            <div style={{ flex: 1 }} />
            {crew?.i && discriminator !== 'orders' && (
              <>
                <OrderTally><OrderIcon /> {myOpenOrders} Order{myOpenOrders === 1 ? '' : 's'} at this Marketplace</OrderTally>
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
