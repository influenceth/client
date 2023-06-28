import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

import { ChevronDoubleDownIcon, ChevronDoubleUpIcon, ChevronRightIcon, CompositionIcon, GridIcon, SwayIcon } from '~/components/Icons';
import CrewIndicator from '~/components/CrewIndicator';
import useCrew from '~/hooks/useCrew';
import { useResourceAssets } from '~/hooks/useAssets';
import useScreenSize from '~/hooks/useScreenSize';
import TextInput from '~/components/TextInput';
import Dropdown from '~/components/DropdownV2';
import Button from '~/components/ButtonAlt';
import theme, { hexToRGB } from '~/theme';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import { formatResourceAmount } from '~/game/interface/hud/actionDialogs/components';
import ClipCorner from '~/components/ClipCorner';
import { formatFixed } from '~/lib/utils';

const greenRGB = hexToRGB(theme.colors.green);

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
`;
const Main = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  width: 100%;
`;
const ActionTray = styled.div`
  background: #222;
  margin-left: 20px;
  width: 320px;
`;

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
  position: relative;

  & > div:first-child {
    flex: 1;
    h1 {
      font-size: 50px;
      font-weight: normal;
      line-height: 1em;
      margin: 0 0 32px;
      text-transform: uppercase;
      svg {
        color: ${p => p.theme.colors.main};
        height: 35px;
        width: 35px;
      }
    }
    ${Subheader} {
      position: absolute;
      bottom: 12px;
      left: 0;

      span:first-child {
        font-size: 28px;
        text-transform: uppercase;
      }
      span:not(:first-child) {
        border-left: 1px solid #777;
        font-size: 110%;
        margin-left: 10px;
        padding-left: 10px;
      }
    }
  }
`;

const Body = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 25px 0;
`;

const ChartArea = styled.div`
  border: 1px solid #333;
  height: 100%;
  flex: 1;
  position: relative;
  & > svg {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
  }
  
  &:before {
    color: #777;
    content: "${p => p.spread > 0 ? 'Spread' : ''}";
    border-bottom: 2px solid #333;
    padding: 0 0 4px 8px;
    position: absolute;
    bottom: calc(50% - 1px);
    left: 0;
    right: 0;
  }
  &:after {
    content: "${p => p.spread > 0 ? `${formatPrice(p.spread)} SWAY` : ''}";
    padding: 0 0 4px 8px;
    position: absolute;
    top: calc(50% + 3px);
  }
`;
const ResourceThumbWrapper = styled.div`
  padding: 6px;
`;

const TableArea = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding-left: 15px;
  width: 300px;
`;

const VolumeBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: ${p => 100 * p.volume}%;
  z-index: -1;
`;

const centerPriceHeight = 36;
const centerPriceMargin = 8;
const SellTable = styled.div`
  height: calc(50% - ${(centerPriceHeight + 2 * centerPriceMargin) / 2}px);
  overflow: auto;
  table {
    border-collapse: collapse;
    width: 100%;

    tr > * {
      border-bottom: 1px solid #222;
      font-size: 95%;
      padding: 1px 4px;
      text-align: right;
      &:first-child {
        text-align: left;
      }
    }
    th {
      background: black;
      color: #777;
      font-size: 90%;
      font-weight: normal;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    td:first-child {
      color: ${p => p.theme.colors.main};
      position: relative;
    }
  }
  ${VolumeBar} {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.25);
  }
`;
const BuyTable = styled(SellTable)`
  table tr td:first-child {
    color: ${p => p.theme.colors.green};
  }
  ${VolumeBar} {
    background: rgba(${greenRGB}, 0.2);
  }
`;
const CenterPrice = styled.div`
  align-items: center;
  background: #222;
  display: flex;
  flex-direction: row;
  height: ${centerPriceHeight}px;
  margin: ${centerPriceMargin}px 0;
  &:after {
    color: #777;
    content: "Center Price";
    font-size: 90%;
    margin-right: 10px;
  }

  & > svg {
    font-size: 24px;
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

    
const STROKE_WIDTH = 2;

const MarketplaceOrderBook = ({ lot, marketplace, resource }) => {
  const { width, height } = useScreenSize();

  const { data: owner } = useCrew(lot?.occupier);

  const [buyOrders, setBuyOrders] = useState([]);
  const [sellOrders, setSellOrders] = useState([]);
  const [mode, setMode] = useState('buy');
  const chartWrapperRef = useRef();

  // TODO: presumably these will come from useQuery and don't
  //  need to be in local state like this
  useEffect(() => {
    setBuyOrders(
      [
        { price: 110, amount: 71 },
        { price: 140, amount: 71 },
        { price: 170, amount: 71 },
        { price: 180, amount: 71 },
        { price: 190, amount: 71 },
        { price: 200, amount: 71 },
        { price: 210, amount: 200 },
        { price: 240, amount: 140 },
        { price: 245, amount: 10 },
        { price: 259, amount: 350 },
        { price: 300, amount: 50 },
        { price: 305, amount: 90 },
      ].sort((a, b) => a.price > b.price ? -1 : 1)
    );
    setSellOrders(
      [
        { price: 370, amount: 369 },
        { price: 327, amount: 16 },
        { price: 317, amount: 80 },
      ].sort((a, b) => a.price - b.price ? -1 : 1)
    );
  }, []);

  const {
    xViewbox,
    yViewbox,
    buyPoints,
    buyLine,
    sellPoints,
    sellLine,
    spread,
    centerPrice,
    totalForBuy,
    totalForSale
  } = useMemo(() => {
    if (!chartWrapperRef.current) return {};
    if (!(buyOrders?.length > 0 || sellOrders?.length > 0)) return {};

    const xViewbox = chartWrapperRef.current.clientWidth;
    const yViewbox = chartWrapperRef.current.clientHeight;

    // calculate centerPrice and spread for the orders
    let centerPrice;
    let spread;
    if (buyOrders[0] && sellOrders[0]) {
      centerPrice = (buyOrders[0].price + sellOrders[0].price) / 2;
      spread = sellOrders[0].price - buyOrders[0].price;
    } else {
      centerPrice = buyOrders[0].price || sellOrders[0].price;
    }
    
    // set the size of the y-axis
    let yAxisHalf = 0.05 * centerPrice;
    if (buyOrders.length) {
      yAxisHalf = Math.max(yAxisHalf, centerPrice - buyOrders[buyOrders.length - 1].price);
    }
    if (sellOrders.length) {
      yAxisHalf = Math.max(yAxisHalf, sellOrders[sellOrders.length - 1].price - centerPrice);
    }
    yAxisHalf *= 1.05; // add enough buffer that can draw last step

    const yAxisLength = 2 * yAxisHalf;
    const yAxisMin = centerPrice - yAxisHalf;
    
    // set the size of the x-axis
    const buySum = buyOrders.reduce((acc, cur) => acc + cur.amount, 0);
    const sellSum = sellOrders.reduce((acc, cur) => acc + cur.amount, 0);
    const xAxisLength = 2 * Math.max(buySum, sellSum);
    
    // create helper functions
    const amountToX = (amount) => {
      return xViewbox * (1 - amount / xAxisLength);
    };
    const priceToY = (price) => {
      return yViewbox * (1 - (price - yAxisMin) / yAxisLength);
    };
    
    // calculate the "buy" polygon
    let totalForBuy = 0;
    const buyPoints = [];
    buyOrders.forEach(({ price, amount }) => {
      if (buyPoints.length === 0) {
        buyPoints.push(`${xViewbox + STROKE_WIDTH},${priceToY(price)}`);
      }
      buyPoints.push(`${amountToX(totalForBuy)},${priceToY(price)}`);
      totalForBuy += amount;
      buyPoints.push(`${amountToX(totalForBuy)},${priceToY(price)}`);
    });
    buyPoints.push(`${amountToX(totalForBuy)},${yViewbox + 2 * STROKE_WIDTH}`);
    buyPoints.push(`${xViewbox + STROKE_WIDTH},${yViewbox + 2 * STROKE_WIDTH}`);
    const buyLine = `M ${amountToX(totalForBuy)},${yViewbox / 2} v ${yViewbox / 2}`;
    
    // calculate the "sell" polygon
    let totalForSale = 0;
    const sellPoints = [];
    sellOrders.forEach(({ price, amount }) => {
      if (sellPoints.length === 0) {
        sellPoints.push(`${xViewbox + STROKE_WIDTH},${priceToY(price)}`);
      }
      sellPoints.push(`${amountToX(totalForSale)} ${priceToY(price)}`);
      totalForSale += amount;
      sellPoints.push(`${amountToX(totalForSale)} ${priceToY(price)}`);
    });
    sellPoints.push(`${amountToX(totalForSale)},${-2 * STROKE_WIDTH}`);
    sellPoints.push(`${xViewbox + STROKE_WIDTH},${-2 * STROKE_WIDTH}`);
    const sellLine = `M ${amountToX(totalForSale)},0 v ${yViewbox / 2}`;

    return {
      xViewbox,
      yViewbox,
      buyPoints: buyPoints.join(' '),
      buyLine,
      sellPoints: sellPoints.join(' '),
      sellLine,
      spread,
      centerPrice,
      totalForBuy,
      totalForSale
    };
  }, [buyOrders, sellOrders, height, width]);

  let rowBuyVolume = 0;
  let rowSaleVolume = totalForSale + 0;
  let volumeBenchmark = Math.max(totalForBuy, totalForSale);

  // TODO: loading might be better than null
  if (!owner) return null;
  return (
    <Wrapper>
      <Main>
        <Header>
          <div>
            {/* TODO: marketplace icon */}
            <h1><CompositionIcon /> {marketplace.name}</h1>
            <Subheader>
              <span>{resource.name}</span>
              <span style={{ color: theme.colors.green }}>240t Available</span>
              <span style={{ color: theme.colors.main }}>142t Sellable</span>
            </Subheader>
          </div>
          <CrewIndicator crew={owner} flip label="Managed by" />
        </Header>
        <Body>
          <ChartArea ref={chartWrapperRef} spread={spread}>
            <ResourceThumbWrapper>
              <ResourceThumbnail
                resource={resource}
                size="110px"
                tooltipContainer={null} />
            </ResourceThumbWrapper>
            <svg focusable="false" viewBox={`0 0 ${xViewbox} ${yViewbox}`}>
              <g>
                <polygon
                  points={sellPoints}
                  fill={`rgba(${theme.colors.mainRGB}, 0.4)`}
                  stroke={theme.colors.main}
                  strokeWidth={STROKE_WIDTH} />
                <path d={sellLine} stroke={`rgba(${theme.colors.mainRGB}, 0.35)`} strokeDasharray="3" />
              </g>
              <g>
                <polygon
                  points={buyPoints}
                  fill={`rgba(${greenRGB}, 0.4)`}
                  stroke={theme.colors.green}
                  strokeWidth={STROKE_WIDTH} />
                <path d={buyLine} stroke={`rgba(${greenRGB}, 0.25)`} strokeDasharray="3" />
              </g>
            </svg>
          </ChartArea>
          <TableArea>
            <SellTable>
              <table>
                <thead>
                  <tr>
                    <th>Selling Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sellOrders.map(({ price, amount }, i) => {
                    const rowVolume = rowSaleVolume;
                    rowSaleVolume -= amount;
                    return (
                      <tr key={i}>
                        <td><VolumeBar volume={volumeBenchmark > 0 ? rowVolume / volumeBenchmark : 0} />{price.toLocaleString()}</td>
                        <td>{amount.toLocaleString()}</td>
                        <td>{formatPrice(price * amount)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </SellTable>

            <CenterPrice>
              <SwayIcon />
              <Price unit={resource.massPerUnit === 0.001 ? 'kg' : 'unit'}>{formatPrice(centerPrice)}</Price>
            </CenterPrice>

            <BuyTable>
              <table>
                <thead>
                  <tr>
                    <th>Buying Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {buyOrders.map(({ price, amount }, i) => {
                    rowBuyVolume += amount;
                    return (
                      <tr key={i}>
                        <td><VolumeBar volume={volumeBenchmark > 0 ? rowBuyVolume / volumeBenchmark : 0} />{price.toLocaleString()}</td>
                        <td>{amount.toLocaleString()}</td>
                        <td>{formatPrice(price * amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </BuyTable>
          </TableArea>
        </Body>
      </Main>
      <ActionTray>

      </ActionTray>
    </Wrapper>
  );
};

export default MarketplaceOrderBook;
