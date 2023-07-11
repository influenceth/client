import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CoreSample, Asteroid, Extraction, Inventory } from '@influenceth/sdk';
import styled from 'styled-components';

import travelBackground from '~/assets/images/modal_headers/Travel.png';
import { BackIcon, CaretIcon, CloseIcon, CoreSampleIcon, ExtractionIcon, ForwardIcon, RefineIcon, InventoryIcon, LaunchShipIcon, LocationIcon, ProcessIcon, ResourceIcon, RouteIcon, SetCourseIcon, ShipIcon, WarningOutlineIcon, OrderIcon, SwayIcon } from '~/components/Icons';
import { useBuildingAssets, useResourceAssets, useShipAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useExtractionManager from '~/hooks/useExtractionManager';
import { formatFixed, formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import {
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogTabs,
  ActionDialogBody,
  FlexSection,
  FlexSectionInputBlock,
  FlexSectionSpacer,
  BuildingImage,
  ProgressBarSection,
  AsteroidImage,
  ProgressBarNote,
  PropellantSection,
  ShipTab,
  PropulsionTypeSection,
  FlexSectionBlock,
  FlexSectionInputBody,
  sectionBodyCornerSize,
  RecipeSlider,
  ProcessInputOutputSection,
  TransferDistanceDetails,
  ProcessSelectionDialog,
  formatResourceMass,
  formatResourceVolume,
  EmptyBuildingImage,
  DestinationSelectionDialog
} from './components';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { ActionDialogInner, theming, useAsteroidAndLot } from '../ActionDialog';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import actionStages from '~/lib/actionStages';
import theme, { hexToRGB } from '~/theme';
import CrewCardFramed from '~/components/CrewCardFramed';
import ClipCorner from '~/components/ClipCorner';
import IconButton from '~/components/IconButton';
import UncontrolledTextInput, { TextInputWrapper } from '~/components/TextInputUncontrolled';
import Button from '~/components/ButtonAlt';

const greenRGB = hexToRGB(theme.colors.green);

const FormSection = styled.div`
  margin-top: 12px;
  &:first-child {
    margin-top: 0px;
  }
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

const OrderAlert = styled.div`
  ${p => {
    if (p.mode === 'buy') {
      return `
        background: rgba(${greenRGB}, 0.2);
        & > div {
          background: rgba(${greenRGB}, 0.2);
          b { color: ${p.theme.colors.green}; }
        }
      `;
    } else {
      return `
        background: rgba(${p.theme.colors.mainRGB}, 0.2);
        & > div {
          background: rgba(${p.theme.colors.mainRGB}, 0.2);
          b { color: ${p.theme.colors.main}; }
        }
      `;
    }
  }};

  color: white;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 15px),
    calc(100% - 15px) 100%,
    0 100%
  );
  height: 75px;
  padding: 5px;
  width: 100%;
  
  & > div {
    align-items: center;
    clip-path: polygon(
      0 0,
      100% 0,
      100% calc(100% - 12px),
      calc(100% - 12px) 100%,
      0 100%
    );
    display: flex;
    flex-direction: row;
    height: 100%;
    padding: 0 8px;
    width: 100%;
    
    & > div {
      padding: 0 6px;
    }

    b {
      text-transform: uppercase;
    }
  }
`;

const MarketplaceOrder = ({ asteroid, lot, manager, stage, ...props }) => {
  const { mode, type, resourceId, preselect } = props;

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const buildings = useBuildingAssets();
  const resources = useResourceAssets();
  const resource = resources[resourceId] || {};
  const resourceByMass = resource?.massPerUnit === 0.001;
  
  const { currentLaunch, launchStatus, startLaunch } = manager;

  const { crew, crewMemberMap } = useCrewContext();
  const { data: currentDestinationLot } = useLot(asteroid.i, currentLaunch?.destinationLotId);

  const [destinationLot, setDestinationLot] = useState();
  const [destinationSelectorOpen, setDestinationSelectorOpen] = useState(false);
  const [limitPrice, setLimitPrice] = useState(preselect?.limitPrice);
  const [quantity, setQuantity] = useState(preselect?.quantity);

  const crewMembers = currentLaunch?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
  const launchBonus = 0;

  const [buyOrders, setBuyOrders] = useState([]);
  const [sellOrders, setSellOrders] = useState([]);
  
  const marketplaceFee = 0.05;  // TODO: ...
  
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

  useEffect(() => {
    if (currentDestinationLot) {
      setDestinationLot(currentDestinationLot);
    }
  }, [currentDestinationLot]);

  const totalForBuy = useMemo(() => {
    return (buyOrders || []).reduce((acc, cur) => acc + cur.amount, 0);
  }, [buyOrders]);

  const totalForSale = useMemo(() => {
    return (sellOrders || []).reduce((acc, cur) => acc + cur.amount, 0);
  }, [sellOrders]);

  const onSubmitOrder = useCallback(() => {
    startLaunch();
  }, []);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (['READY', 'READY_TO_FINISH', 'FINISHING'].includes(lastStatus.current)) {
      if (launchStatus !== lastStatus.current) {
        console.log('on Close');
        props.onClose();
      }
    }
    lastStatus.current = launchStatus;
  }, [launchStatus]);

  const handleChangeQuantity = useCallback((e) => {
    let input = parseInt(e.currentTarget.value) || 0;
    if (input && type === 'market') {
      if (mode === 'buy') input = Math.max(0, Math.min(input, totalForSale));
      if (mode === 'sell') input = Math.max(0, Math.min(input, totalForBuy));
    }
    // TODO: set limits for limit orders
    setQuantity(input);
  }, [mode, totalForSale, totalForBuy, type]);

  const handleChangeLimitPrice = useCallback((e) => {
    setLimitPrice(e.currentTarget.value);
  }, []);

  const matchBestLimitOrder = useCallback((e) => {
    if (mode === 'buy') {
      setLimitPrice(buyOrders[0].price);
    } else {
      setLimitPrice(sellOrders[sellOrders.length - 1].price);
    }
  }, [mode, buyOrders, sellOrders]);

  const [totalMarketPrice, avgMarketPrice, averagedOrderTally] = useMemo(() => {
    let total = 0;
    let totalOrders = 0;
    let needed = quantity;
    const orders = []
      .concat(mode === 'buy' ? sellOrders : buyOrders)
      .sort((a, b) => (mode === 'buy' ? 1 : -1) * (a.price - b.price));
    orders.every(({ price, amount }) => {
      const levelAmount = Math.min(needed, amount);
      total += levelAmount * price;
      needed -= levelAmount;
      if (levelAmount > 0) {
        totalOrders++;
        return true;
      }
      return false;
    });
    return [total, total / quantity, totalOrders];
  }, [buyOrders, mode, quantity, sellOrders]);

  const totalLimitPrice = useMemo(() => {
    return (limitPrice || 0) * quantity;
  }, [limitPrice, quantity]);

  const noCompetingOrders = useMemo(() => {
    return !((mode === 'buy' && buyOrders.length > 0) || (mode === 'sell' && sellOrders.length > 0));
  }, [mode, buyOrders, sellOrders]);

  const fee = useMemo(() => {
    return (type === 'market' ? totalMarketPrice : totalLimitPrice)
      * marketplaceFee;
  }, [marketplaceFee, totalMarketPrice, totalLimitPrice, type]);

  const total = useMemo(() => {
    let sum = type === 'limit' ? totalLimitPrice : totalMarketPrice;
    return sum + (mode === 'buy' ? fee : -fee);
  }, [fee, mode, totalLimitPrice, totalMarketPrice, type]);

  const stats = useMemo(() => ([
    {
      label: 'Crew Travel Time',
      value: formatTimer(0),
      direction: 0,
      isTimeStat: true,
    },
    {
      label: 'Marketplace Fee',
      value: (fee || 0).toLocaleString(),
      direction: 0
    },
    {
      label: 'Order Mass',
      value: formatResourceMass(quantity, resourceId),
      direction: 0,
    },
    {
      label: 'Order Volume',
      value: formatResourceVolume(quantity, resourceId),
      direction: 0,
    },
  ]), [fee, quantity, resourceId]);

  const dialogAction = useMemo(() => {
    return {
      icon: <OrderIcon />,
      label: `${type === 'market' ? 'Market' : 'Limit'} ${mode === 'buy' ? 'Buy' : 'Sell'}`
    };
  }, [mode, type]);

  return (
    <>
      <ActionDialogHeader
        action={dialogAction}
        captain={captain}
        location={{ asteroid, lot }}
        crewAvailableTime={0}
        taskCompleteTime={0}
        onClose={props.onClose}
        stage={stage}
        wide />

      <ActionDialogBody>
        <FlexSection>
          <FlexSectionInputBlock
            title="Marketplace"
            image={<BuildingImage building={buildings[lot?.building?.capableType || 0]} />}
            label={`${lot?.building?.name || buildings[lot?.building?.capableType || 0].name}`}
            disabled
            sublabel={`Lot #${lot?.i}`}
          />

          <FlexSectionSpacer />

          <FlexSectionInputBlock
            title="Order Details"
            image={<ResourceThumbnail resource={resource} tooltipContainer="none" />}
            label={resource?.name}
            disabled
            sublabel="Finished Good"
            bodyStyle={{ background: 'transparent' }}
          />
        </FlexSection>

        <FlexSection>
          <FlexSectionInputBlock
            title={`Delivery ${mode === 'buy' ? 'To' : 'From'}`}
            image={
              destinationLot
                ? (
                  <BuildingImage
                    building={buildings[destinationLot.building?.capableType || 0]}
                    inventories={destinationLot?.building?.inventories}
                    showInventoryStatusForType={1} />
                )
                : <EmptyBuildingImage iconOverride={<InventoryIcon />} />
            }
            isSelected={stage === actionStages.NOT_STARTED}
            label={destinationLot ? (destinationLot.building?.name || buildings[destinationLot.building?.capableType || 0]?.name) : 'Select'}
            onClick={() => setDestinationSelectorOpen(true)}
            disabled={stage !== actionStages.NOT_STARTED}
            sublabel={destinationLot ? <><LocationIcon /> Lot {destinationLot.i.toLocaleString()}</> : 'Inventory'}
          />

          <FlexSectionSpacer />

          <FlexSectionBlock style={{ alignSelf: 'flex-start', marginTop: -10 }} bodyStyle={{ padding: '0 0 0 8px' }}>
            <FormSection>
              <InputLabel>
                <label>{type === 'market' ? '' : 'Max'} Quantity</label>
                {type === 'market' && (
                  <span>Max <b>{((mode === 'buy' ? totalForSale : totalForBuy) || 0).toLocaleString()}{resourceByMass ? ' kg' : ''}</b></span>
                )}
              </InputLabel>
              <TextInputWrapper rightLabel={resourceByMass ? ' kg' : ''}>
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

            <FormSection>
              <InputLabel>
                <label>At {type === 'market' ? 'Market' : 'Limit'} Price</label>
              </InputLabel>
              <TextInputWrapper rightLabel={`SWAY / ${resourceByMass ? 'kg' : 'unit'}`}>
                <UncontrolledTextInput
                  disabled={type === 'market' || stage !== actionStages.NOT_STARTED}
                  style={type === 'market' ? { backgroundColor: '#09191f' } : {}}
                  min={0}
                  onChange={handleChangeLimitPrice}
                  type="number"
                  value={type === 'market' ? avgMarketPrice.toLocaleString() : limitPrice} />
              </TextInputWrapper>
            </FormSection>

            <FormSection style={{ marginTop: 10 }}>
              {type === 'market' && (
                <InputLabel>
                  <span style={{ flex: 1 }}>
                    Average Price from: <b>{' '}{(averagedOrderTally || 0).toLocaleString()} {mode === 'buy' ? 'Seller' : 'Buyer'}{averagedOrderTally === 1 ? '' : 's'}</b>
                  </span>
                  <Button onClick={() => {/* TODO: ... */}} size="small" subtle>Refresh</Button>
                </InputLabel>
              )}
              {type === 'limit' && (
                <InputLabel>
                  {/* TODO: no other bids */}
                  <span style={{ flex: 1, color: noCompetingOrders ? '#777' : theme.colors.main, fontSize: '16px' }}>
                    {noCompetingOrders ? 'No Competing Orders' : `Current ${mode === 'buy' ? 'Highest' : 'Lowest'}`}
                  </span>
                  <Button
                    disabled={noCompetingOrders}
                    onClick={matchBestLimitOrder}
                    size="small"
                    subtle>Match</Button>
                </InputLabel>
              )}
            </FormSection>
          </FlexSectionBlock>

        </FlexSection>

        <FlexSection>

          <FlexSectionBlock
            title="Order"
            bodyStyle={{ height: 'auto', padding: 0 }}
            style={{ width: '100%' }}>
            <OrderAlert mode={mode}>
              <div>
                {type === 'limit' && (
                  <div style={{ fontSize: '35px', lineHeight: '30px' }}>
                    <b><WarningOutlineIcon /></b>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div><b>{type} {mode}</b></div>
                  <div><b>{type === 'limit' ? 'Up to' : ''}</b> {resourceByMass ? formatResourceMass(quantity || 0, resourceId) : quantity.toLocaleString()} {resource.name}</div>
                </div>
                <div style={{ alignItems: 'flex-end', display: 'flex' }}>
                  <b>{type === 'limit' ? 'Spend Up to' : 'Total'}</b>
                  <span style={{ display: 'inline-flex', fontSize: '35px', lineHeight: '30px' }}>
                    <SwayIcon /> {formatFixed(total || 0)}
                  </span>
                </div>
              </div>
            </OrderAlert>
          </FlexSectionBlock>

        </FlexSection>

        {stage !== actionStages.NOT_STARTED && null /* TODO: (
          <ProgressBarSection
            completionTime={lot?.building?.construction?.completionTime}
            startTime={lot?.building?.construction?.startTime}
            stage={stage}
            title="Progress"
            totalTime={crewTravelTime + constructionTime}
          />
        )*/}

        <ActionDialogStats
          stage={stage}
          stats={stats}
          wide
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={false/* TODO: no destination selected, amount invalid, price too much, etc */}
        goLabel="Submit Order"
        onGo={onSubmitOrder}
        stage={stage}
        wide
        {...props} />

      {stage === actionStages.NOT_STARTED && (
        <DestinationSelectionDialog
          asteroid={asteroid}
          originLotId={lot?.i}
          initialSelection={undefined/* TODO: if only one warehouse, use it... */}
          onClose={() => setDestinationSelectorOpen(false)}
          onSelected={setDestinationLot}
          open={destinationSelectorOpen}
        />
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  // TODO: ...
  // const extractionManager = useExtractionManager(asteroid?.i, lot?.i);
  // const { actionStage } = extractionManager;
  const manager = {};
  const actionStage = actionStages.NOT_STARTED;

  useEffect(() => {
    if (!asteroid || !lot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  // TODO: actionImage
  return (
    <ActionDialogInner
      actionImage={travelBackground}
      isLoading={isLoading}
      stage={actionStage}>
      <MarketplaceOrder
        asteroid={asteroid}
        lot={lot}
        manager={manager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
