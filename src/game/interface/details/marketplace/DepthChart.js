import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

import { CompositionIcon, InfoIcon, OrderIcon, RadioCheckedIcon, RadioUncheckedIcon, SwayIcon } from '~/components/Icons';
import CrewIndicator from '~/components/CrewIndicator';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import Switcher from '~/components/SwitcherButton';
import UncontrolledTextInput, { TextInputWrapper } from '~/components/TextInputUncontrolled';
import useCrew from '~/hooks/useCrew';
import useScreenSize from '~/hooks/useScreenSize';
import theme, { hexToRGB } from '~/theme';
import { formatFixed } from '~/lib/utils';
import ActionButton from '~/game/interface/hud/actionButtons/ActionButton';

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

const ActionPanel = styled.div`
  margin-left: 20px;
  width: 320px;
  & > div {
    background: #171717;
    clip-path: polygon(
      0 0,
      100% 0,
      100% calc(100% - 15px),
      calc(100% - 15px) 100%,
      0 100%
    );
    height: calc(100% - 25px);
  }
`;


const PanelInner = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px 16px 0 12px;
`;

const trayHeight = 80;
const PanelTitle = styled.div`
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  flex-direction: row;
  font-size: 18px;
  font-weight: bold;
  padding-bottom: 8px;
  padding-top: 4px;
  text-transform: uppercase;
`;
const PanelContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 0;
  padding: 15px 0 0;
  & > div:first-child {
    height: calc(100% - ${trayHeight}px);
    overflow-x: hidden;
    overflow-y: auto;
    padding-right: 15px;
    margin-right: -12px;
  }
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
  width: 360px;
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

const FormSection = styled.div`
  margin-top: 15px;
  &:first-child {
    margin-top: 0;
  }
  input {
    width: 100%;
  }
`;

const RadioRow = styled.label`
  align-items: center;
  color: #888;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  height: 25px;
  width: 100%;
  ${p => p.selected
    ? `& > svg { color: white; }`
    : `&:hover > svg { color: white; }`
  }

  & > span {
    flex: 1;
    padding-left: 6px;
  }
`;
const InfoTooltip = styled.div`
  color: white;
`;

const InputLabel = styled.div`
  align-items: center;
  color: #888;
  display: flex;
  flex-direction: row;
  font-size: 14px;
  margin-bottom: 3px;
  & > label {
    flex: 1;
  }
  & > span {
    b {
      color: white;
      font-weight: normal;
    }
  }
`;

const Tray = styled.div`
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  flex-direction: row;
  height: ${trayHeight}px;
  justify-content: space-between;
  position: relative;
`;

const Summary = styled.div`
  & > div {
    align-items: center;
    display: flex;
    flex-direction: row;
    font-size: 28px;
    & > svg {
      font-size: 32px;
    }
  }
`;
const SummaryLabel = styled.label`
  display: block;
  font-size: 90%;
  margin-bottom: 3px;
  &:before {
    content: "${p => p.type === 'limit' ? 'Limit' : 'Market'} ${p => p.mode === 'buy' ? 'Buy' : 'Sell'} ";
    color: ${p => p.mode === 'buy' ? p.theme.colors.green : p.theme.colors.main};
  }
  &:after {
    content: "Preview";
    color: #888;
  }
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

const MarketplaceDepthChart = ({ lot, marketplace, resource }) => {
  const { width, height } = useScreenSize();

  const { data: owner } = useCrew(lot?.occupier);

  const [buyOrders, setBuyOrders] = useState([]);
  const [sellOrders, setSellOrders] = useState([]);
  const [mode, setMode] = useState('buy');
  const [type, setType] = useState('market');
  const chartWrapperRef = useRef();

  // TODO: if nothing available for market order, default to limit

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
      ].sort((a, b) => a.price > b.price ? -1 : 1)
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
    if (buyOrders[0] && sellOrders[sellOrders.length - 1]) {
      centerPrice = (buyOrders[0].price + sellOrders[sellOrders.length - 1].price) / 2;
      spread = sellOrders[sellOrders.length - 1].price - buyOrders[0].price;
    } else {
      centerPrice = buyOrders[0].price || sellOrders[sellOrders.length - 1].price;
    }
    
    // set the size of the y-axis
    let yAxisHalf = 0.05 * centerPrice;
    if (buyOrders.length) {
      yAxisHalf = Math.max(yAxisHalf, centerPrice - buyOrders[buyOrders.length - 1].price);
    }
    if (sellOrders.length) {
      yAxisHalf = Math.max(yAxisHalf, sellOrders[0].price - centerPrice);
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
    [...sellOrders].reverse().forEach(({ price, amount }) => {
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
  const marketplaceFee = 0.05;  // TODO: ...

  const [quantity, setQuantity] = useState();
  const [limitPrice, setLimitPrice] = useState();

  useEffect(() => {
    setQuantity(0);
    setLimitPrice(0);
  }, [mode, type]);

  const handleChangeQuantity = useCallback((e) => {
    let input = parseInt(e.currentTarget.value) || 0;
    if (input && type === 'market') {
      if (mode === 'buy') input = Math.max(0, Math.min(input, totalForSale));
      if (mode === 'sell') input = Math.max(0, Math.min(input, totalForBuy));
    }
    // TODO: set limits for limit orders
    setQuantity(input);
  }, [mode, type, totalForBuy, totalForSale]);

  const handleChangeLimitPrice = useCallback((e) => {
    setLimitPrice(e.currentTarget.value);
  }, []);

  // TODO: limit price 

  const [totalMarketPrice, avgMarketPrice] = useMemo(() => {
    let total = 0;
    let needed = quantity;
    const orders = []
      .concat(mode === 'buy' ? sellOrders : buyOrders)
      .sort((a, b) => (mode === 'buy' ? 1 : -1) * (a.price - b.price));
    orders.forEach(({ price, amount }) => {
      const levelAmount = Math.min(needed, amount);
      total += levelAmount * price;
      needed -= levelAmount;
    })
    return [total, total / quantity];
  }, [buyOrders, mode, quantity, sellOrders]);

  const totalLimitPrice = useMemo(() => {
    return (limitPrice || 0) * quantity;
  }, [limitPrice, quantity]);

  const fee = useMemo(() => {
    return (type === 'market' ? totalMarketPrice : totalLimitPrice)
      * marketplaceFee;
  }, [marketplaceFee, totalMarketPrice, totalLimitPrice, type]);

  const total = useMemo(() => {
    let sum = type === 'limit' ? totalLimitPrice : totalMarketPrice;
    return sum + (mode === 'buy' ? fee : -fee);
  }, [fee, mode, totalLimitPrice, totalMarketPrice, type]);

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
              {/* TODO: values */}
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
      <ActionPanel>
        <div>
          <PanelInner>
            <PanelTitle>
              Transact
            </PanelTitle>
            <PanelContent>
              <div>
                <FormSection>
                  <Switcher
                    buttons={[
                      { label: 'Buy', value: 'buy' },
                      { label: 'Sell', value: 'sell' }
                    ]}
                    buttonWidth="50%"
                    onChange={setMode}
                    value={mode}
                  />
                </FormSection>

                <FormSection>
                  <RadioRow onClick={() => setType('market')} selected={type === 'market' || undefined}>
                    {type === 'market' ? <RadioCheckedIcon /> : <RadioUncheckedIcon />}
                    <span>Market Order</span>
                    <InfoTooltip data-tip="help" data-for="details"><InfoIcon /></InfoTooltip>
                  </RadioRow>
                  <RadioRow onClick={() => setType('limit')} selected={type === 'limit' || undefined}>
                    {type === 'limit' ? <RadioCheckedIcon /> : <RadioUncheckedIcon />}
                    <span>Limit Order</span>
                    <InfoTooltip data-tip="help" data-for="details"><InfoIcon /></InfoTooltip>
                  </RadioRow>
                </FormSection>

                <FormSection>
                  <InputLabel>
                    <label>Quantity</label>
                    {type === 'market' && (
                      <span>Max <b>{((mode === 'buy' ? totalForSale : totalForBuy) || 0).toLocaleString()}{resource.massPerUnit === 0.001 ? ' kg' : ''}</b></span>
                    )}
                  </InputLabel>
                  <TextInputWrapper rightLabel={resource.massPerUnit === 0.001 ? ' kg' : ''}>
                    <UncontrolledTextInput
                      min={0}
                      max={type === 'market' ? (mode === 'buy' ? totalForSale : totalForBuy) : undefined}
                      onChange={handleChangeQuantity}
                      placeholder="Specify Quantity"
                      step={1}
                      type="number"
                      value={quantity || ''} />
                  </TextInputWrapper>
                </FormSection>

                {type === 'market' && (
                  <FormSection>
                    <InputLabel>
                      <label>Market Price</label>
                    </InputLabel>
                    <TextInputWrapper rightLabel="SWAY">
                      <UncontrolledTextInput
                        disabled
                        value={avgMarketPrice ? formatFixed(avgMarketPrice || 0, 2) : centerPrice + spread / 2} />
                    </TextInputWrapper>
                  </FormSection>
                )}
                {type === 'limit' && (
                  <FormSection>
                    <InputLabel>
                      <label>Price</label>
                    </InputLabel>
                    <TextInputWrapper rightLabel="SWAY">
                      <UncontrolledTextInput
                        onChange={handleChangeLimitPrice}
                        placeholder="Specify Price"
                        value={limitPrice || ''} />
                    </TextInputWrapper>
                  </FormSection>
                )}

                <FormSection>
                  <InputLabel>
                    <label>Subtotal</label>
                  </InputLabel>
                  <TextInputWrapper rightLabel="SWAY">
                    <UncontrolledTextInput
                      disabled
                      value={((type === 'market' ? totalMarketPrice : totalLimitPrice) || 0).toLocaleString()} />
                  </TextInputWrapper>
                </FormSection>


                <FormSection>
                  <InputLabel>
                    <label>Marketplace Fee</label>
                    <span style={{ color: theme.colors.main }}>{100 * marketplaceFee}%</span>
                  </InputLabel>
                  <TextInputWrapper rightLabel="SWAY">
                    <UncontrolledTextInput
                      disabled
                      value={formatFixed(fee || 0, 2)} />
                  </TextInputWrapper>
                </FormSection>

              </div>

              {total > 0 && (
                <Tray>
                  <Summary>
                    <SummaryLabel type={type} mode={mode} />
                    <div>
                      <SwayIcon /> {total.toLocaleString()}
                    </div>
                  </Summary>

                  {/* TODO: update icon */}
                  <ActionButton
                    label="Create Order"
                    icon={<OrderIcon />}
                    onClick={() => {/* TODO: */}} />
                </Tray>
              )}
            </PanelContent>
          </PanelInner>
        </div>
      </ActionPanel>
    </Wrapper>
  );
};

export default MarketplaceDepthChart;
