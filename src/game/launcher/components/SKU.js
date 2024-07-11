import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import styled from 'styled-components';

import AsteroidsHeroImage from '~/assets/images/sales/asteroids_hero.png';
import CrewmatesHeroImage from '~/assets/images/sales/crewmates_hero.png';
import SwayImage from '~/assets/images/sales/sway.png';
import SwayHeroImage from '~/assets/images/sales/sway_hero.jpg';
import StarterPackHeroImage from '~/assets/images/sales/starter_packs_hero.jpg';
import AdalianFlourish from '~/components/AdalianFlourish';
import HeroLayout from '~/components/HeroLayout';
import UncontrolledTextInput from '~/components/TextInputUncontrolled';
import { EthIcon, PurchaseAsteroidIcon, SwayIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import useAsteroidSale from '~/hooks/useAsteroidSale';
import useBlockTime from '~/hooks/useBlockTime';
import useFaucetInfo from '~/hooks/useFaucetInfo';
import { cleanseTxHash, fireTrackingEvent, formatTimer, nativeBool, openAccessJSTime, reactBool, roundToPlaces } from '~/lib/utils';
import theme from '~/theme';
import Button from '~/components/ButtonAlt';
import useWalletBalances from '~/hooks/useWalletBalances';
import useCrewManager from '~/hooks/actionManagers/useCrewManager';
import usePriceConstants from '~/hooks/usePriceConstants';
import { TOKEN, TOKEN_FORMAT, TOKEN_SCALE } from '~/lib/priceUtils';
import usePriceHelper from '~/hooks/usePriceHelper';
import UserPrice from '~/components/UserPrice';
import api from '~/lib/api';
import useSession from '~/hooks/useSession';
import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useSwapHelper from '~/hooks/useSwapHelper';
import useCrewContext from '~/hooks/useCrewContext';
import FundingFlow from './FundingFlow';
import { AdvancedStarterPack, BasicStarterPack, useStarterPacks } from './StarterPack';

const Flourish = styled.div`
  background: url(${p => p.src});
  background-position: center center;
  background-repeat: no-repeat;
  background-size: contain;
  height: 100%;
  width: 100%;
`;

const Wrapper = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: row;
  width: 100%;
  & > * {
    margin-top: 10px;
  }
`;

const Description = styled.div`
  color: ${p => p.theme.colors.main};
  flex: 1;
  font-size: 16px;
  padding-right: 20px;
  & > p {
    margin: 0 0 1em;
  }
`;

const purchasePacksPadding = 15;
export const purchaseFormMargin = 15;
const purchaseFormWidth = 290;
export const PurchaseForm = styled.div`
  ${p => p.asButton && `
    outline: 1px solid #333;
    border-radius: 6px;
    cursor: ${p.theme.cursors.active};
    opacity: 1;
    transition: opacity 150ms ease, outline 150ms linear;
    &:hover {
      opacity: 1;
      outline-color: ${p.isOrange
      ? p.theme.colors.inFlight
      : (p.isPurple ? p.theme.colors.txButton : p.theme.colors.main)};;
      outline-width: 4px;
    }
  `}

  align-self: stretch;
  background: linear-gradient(
    to bottom,
    ${p => p.isOrange
        ? 'rgba(127, 98, 54, 0.7)'
        : (p.isPurple ? 'rgba(70, 68, 134, 0.7)' : 'rgba(48, 88, 114, 0.7)')
    },
    transparent
  );
  display: flex;
  flex-direction: column;
  flex: 0 0 ${purchaseFormWidth}px;
  padding: 5px;
  & > h3 {
    align-items: center;
    background: rgba(
      ${p => p.isOrange
      ? p.theme.hexToRGB(p.theme.colors.inFlight)
      : (p.isPurple ? p.theme.hexToRGB(p.theme.colors.txButton) : p.theme.colors.mainRGB)},
      0.5
    );
    display: flex;
    font-size: 16px;
    justify-content: space-between;
    margin: 0;
    padding: 10px 10px;
    text-transform: uppercase;
    & > span:last-child {
      color: rgba(255, 255, 255, 0.5);
      font-weight: normal;
      & > b {
        color: white;
        font-weight: normal;
        margin-left: 4px;
      }
    }
  }
  & > footer {
    color: #777;
    font-size: 14px;
    margin-top: 16px;
    text-align: center;
    & > b {
      color: white;
      font-weight: normal;
    }
  }
`;

const PurchaseFormRows = styled.div`
  & > div {
    align-items: center;
    color: white;
    display: flex;
    flex-direction: row;
    font-size: 14px;
    height: 28px;
    justify-content: space-between;
    padding: 0 8px;
    & > label {
      opacity: 0.7;
    }
    & > span {
      align-items: center;
      display: flex;
      & > input {
        width: 80px;
      }
    }
  }
`;
const SwayExchangeRows = styled(PurchaseFormRows)`
  & > div {
    & > span > input {
      width: 120px !important;
    }
    & > span:last-child {
      font-size: 18px;
    }
  }
`;
const AsteroidBanner = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  margin-top: 6px;
  padding: 0 10px;
  & > div:first-child {
    color: ${p => p.inactive ? p.theme.colors.inFlight : 'white'};
    font-size: 60px;
    line-height: 0;
  }
  & > div:last-child {
    label {
      font-size: 17px;
      font-weight: bold;
    }
    span {
      color: ${p => p.inactive ? p.theme.colors.inFlight : p.theme.colors.main};
      display: block;
      font-size: 85%;
    }
  }
`;

export const PurchaseButtonInner = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  & > span {
    color: white;
  }
`;

export const PurchaseButton = styled(Button)`
  ${p => p.disabled && `
    ${PurchaseButtonInner} > span {
      opacity: 0.5;
    }
  `}
`;

const AsteroidSKU = () => {
  const { data: asteroidSale } = useAsteroidSale();
  const blockTime = useBlockTime();

  const [remaining, remainingTime] = useMemo(() => {
    if (!asteroidSale) return [0, 0, false];

    const remaining = asteroidSale ? (Number(asteroidSale.limit) - Number(asteroidSale.volume)) : 0;
    const now = blockTime || Math.floor(Date.now() / 1e3);
    return [
      remaining,
      Math.ceil(now / 1e6) * 1e6 - now
    ];
  }, [asteroidSale, blockTime]);

  return (
    <Wrapper>
      <Description>
        <p>
          Asteroids are the core productive land in Influence. Asteroid owners
          hold the rights to mining and constructing on their asteroid, or may
          share or contract those rights to others. Every asteroid also comes
          with one free Adalian crewmate!
        </p>
        <p>
          Note: Each asteroid has unique celestrial attributes, orbital
          mechanics, and resource abundances that should be carefully
          considered before buying.
        </p>
      </Description>
      <PurchaseForm isOrange={remaining === 0}>
        <h3>
          <span>
            {remaining > 0 && `Sale Active`}
            {remaining <= 0 && `Next Sale`}
          </span>
          <span>
            {remaining <= 0
              ? <>Starts in <b>{formatTimer(remainingTime, 2)}</b></>
              : null
            }
          </span>
        </h3>
        <div>
          <AsteroidBanner inactive={remaining === 0}>
            <div>
              <PurchaseAsteroidIcon />
            </div>
            {remaining > 0
              ? (
                <div>
                  <label>{asteroidSale ? remaining.toLocaleString() : '...'} Asteroid{remaining === 1 ? '' : 's'}</label>
                  <span>Remaining in sale period</span>
                </div>
              )
              : (
                <div>
                  <span>All asteroids in this sale period have been purchased.</span>
                </div>
              )}
          </AsteroidBanner>
        </div>
        <footer style={{ fontSize: '85%', marginTop: 10, padding: '0 10px', textAlign: 'left' }}>
          Available asteroids can be purchased directly in the belt view
        </footer>
      </PurchaseForm>
    </Wrapper>
  );
};

const maxCrewmatesAtOnce = 25;
const cleanseCrewmates = (x) => {
  if (x === '') return '';
  return Math.abs(Math.min(parseInt(x) || 0, maxCrewmatesAtOnce));
};

const CrewmateSKU = ({ onUpdatePurchase, onPurchasing }) => {
  const { purchaseCredits, getPendingCreditPurchase } = useCrewManager();
  const { data: priceConstants } = usePriceConstants();
  const priceHelper = usePriceHelper();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    onPurchasing(getPendingCreditPurchase())
  }, [getPendingCreditPurchase, onPurchasing]);

  useEffect(() => {
    const cleanQuantity = cleanseCrewmates(quantity) || 1;
    const totalPrice = priceHelper.from(
      BigInt(cleanQuantity) * priceConstants?.ADALIAN_PURCHASE_PRICE,
      priceConstants?.ADALIAN_PURCHASE_TOKEN
    );
    onUpdatePurchase({
      totalPrice,
      onPurchase: () => purchaseCredits(cleanQuantity)
    })
  }, [onUpdatePurchase, priceHelper, quantity]);

  return (
    <Wrapper>
      <Description>
        <p>
          Crewmates are the literal heart and soul of Adalia. They perform all in-game
          tasks and form your crew. A crew is composed of up to 5 crewmates.
        </p>
        <p>
          Crewmate credits are turned into crewmates after completing their backstory
          and earning traits at any Habitat in the belt.
        </p>
      </Description>
      <PurchaseForm>
        <h3>Crewmate Credits</h3>
        <PurchaseFormRows>
          <div>
            <label>Collection</label>
            <span>Adalian</span>
          </div>
          <div>
            <label>Price</label>
            <span>
              <UserPrice
                price={priceConstants?.ADALIAN_PURCHASE_PRICE}
                priceToken={priceConstants?.ADALIAN_PURCHASE_TOKEN}
                format /> Each
            </span>
          </div>
          <div>
            <label>Quantity</label>
            <span>
              <UncontrolledTextInput
                max={maxCrewmatesAtOnce}
                min={0}
                onChange={(e) => setQuantity(cleanseCrewmates(e.currentTarget.value))}
                step={1}
                style={{ height: 28 }}
                type="number"
                value={quantity}
              />
            </span>
          </div>
        </PurchaseFormRows>
      </PurchaseForm>
    </Wrapper>
  );
};

// TODO: wrap in launch feature flag
const StarterPackSKU = () => {
  return (
    <Wrapper>
      <Description>
        <p>
          Starter Packs come with crewmates and SWAY.
        </p>
        <p>
          Note: Some components of a starter pack are purchased on a decentralized exchange, so their quantities may vary somewhat depending on the price of those assets.
        </p>
      </Description>

      <div style={{ display: 'flex', flex: `0 0 ${2 * purchaseFormWidth + purchaseFormMargin}px`, height: 352, marginTop: -175 }}>
        <BasicStarterPack noButton style={{ marginRight: purchaseFormMargin }} />
        <AdvancedStarterPack noButton />
      </div>
    </Wrapper>
  );
};

const SwaySKU = ({ onUpdatePurchase, onPurchasing }) => {
  const { executeCalls } = useContext(ChainTransactionContext);
  const priceHelper = usePriceHelper();
  const { buildMultiswapFromSellAmount } = useSwapHelper();
  const queryClient = useQueryClient();
  const { accountAddress, provider } = useSession();
  const { data: wallet } = useWalletBalances();

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const preferredUiCurrency = useStore(s => s.getPreferredUiCurrency());

  const [eth, setETH] = useState();
  const [sway, setSway] = useState();
  const [usdc, setUSDC] = useState();
  const [isProcessing, setIsProcessing] = useState();

  const handleEthChange = useCallback((newValue) => {
    setETH(newValue);

    const value = priceHelper.from(newValue * TOKEN_SCALE[TOKEN.ETH], TOKEN.ETH);
    setUSDC(roundToPlaces(value.to(TOKEN.USDC) / TOKEN_SCALE[TOKEN.USDC], 2));
    setSway(roundToPlaces(value.to(TOKEN.SWAY) / TOKEN_SCALE[TOKEN.SWAY], 0));
  }, [priceHelper]);

  const handleSwayChange = useCallback((newValue) => {
    setSway(newValue);

    const value = priceHelper.from(newValue * TOKEN_SCALE[TOKEN.SWAY], TOKEN.SWAY);
    setETH(roundToPlaces(value.to(TOKEN.ETH) / TOKEN_SCALE[TOKEN.ETH], 6));
    setUSDC(roundToPlaces(value.to(TOKEN.USDC) / TOKEN_SCALE[TOKEN.USDC], 2));
  }, [priceHelper]);

  const handleUsdcChange = useCallback((newValue) => {
    setUSDC(newValue);

    const value = priceHelper.from(newValue * TOKEN_SCALE[TOKEN.USDC], TOKEN.USDC);
    setETH(roundToPlaces(value.to(TOKEN.ETH) / TOKEN_SCALE[TOKEN.ETH], 6));
    setSway(roundToPlaces(value.to(TOKEN.SWAY) / TOKEN_SCALE[TOKEN.SWAY], 0));
  }, [priceHelper]);

  useEffect(() => {
    if (preferredUiCurrency === TOKEN.ETH) {
      handleEthChange(0.001);
    } else {
      handleUsdcChange(1);
    }
  }, []);

  useEffect(() => {
    const unscaledUSDC = (usdc || 0) * TOKEN_SCALE[TOKEN.USDC];
    onUpdatePurchase({
      totalPrice: priceHelper.from(unscaledUSDC, TOKEN.USDC),
      onPurchase: async () => {
        const multiswapCalls = await buildMultiswapFromSellAmount(unscaledUSDC, TOKEN.SWAY);
        if (!(multiswapCalls?.length > 0)) {
          createAlert({
            type: 'GenericAlert',
            data: { content: 'Insufficient swap liquidity! Try again later.' },
            level: 'warning',
            duration: 5000
          });

        // else, run the transactions(s)
        } else {
          try {
            fireTrackingEvent('purchase_sway', { category: 'purchase', amount: unscaledUSDC });
            const tx = await executeCalls(multiswapCalls);
            setIsProcessing(true);

            await provider.waitForTransaction(cleanseTxHash(tx.transaction_hash), { retryInterval: 5e3 });

            // refetch all wallet balances
            queryClient.invalidateQueries({ queryKey: ['walletBalance'], refetchType: 'active' });

            // alert user
            createAlert({
              type: 'WalletAlert',
              data: { content: 'Sway swapped successfully.' },
              duration: 5000
            });

          } catch (e) {
            console.error(e);
            createAlert({
              type: 'GenericAlert',
              data: { content: `SWAY swap failed: "${e?.message || e || 'Unknown error.'}"` },
              level: 'warning',
              duration: 5000
            });
          }
          setIsProcessing(false);
        }
      }
    })
  }, [
    accountAddress,
    executeCalls,
    onUpdatePurchase,
    preferredUiCurrency,
    priceHelper,
    queryClient,
    usdc,
    wallet
  ]);

  useEffect(() => {
    onPurchasing(isProcessing);
  }, [isProcessing, onPurchasing])

  return (
    <Wrapper>
      <Description>
        <p>
          SWAY is the single currency used for transacting in Adalia. It is purchased
          on a decentralized exchange from the pool of community sellers.
        </p>
      </Description>
      <PurchaseForm>
        <h3>Sway Exchange</h3>
        <SwayExchangeRows style={{ paddingTop: 6 }}>
          {preferredUiCurrency === TOKEN.USDC && (
            <div style={{ margin: '6px 0' }}>
              <span>
                <UncontrolledTextInput
                  min={0.01}
                  disabled={reactBool(isProcessing)}
                  onChange={(e) => handleUsdcChange(e.currentTarget.value)}
                  step={0.01}
                  style={{ height: 28 }}
                  type="number"
                  value={usdc || ''} />
              </span>
              <span>
                USD
              </span>
            </div>
          )}
          {preferredUiCurrency === TOKEN.ETH && (
            <div style={{ margin: '6px 0' }}>
              <span>
                <UncontrolledTextInput
                  min={0.00001}
                  disabled={reactBool(isProcessing)}
                  onChange={(e) => handleEthChange(e.currentTarget.value)}
                  step={0.00001}
                  style={{ height: 28 }}
                  type="number"
                  value={eth || ''} />
                  <span style={{ fontSize: '24px' }}><EthIcon /></span>
              </span>
              <span>
                ETH
              </span>
            </div>
          )}
          <div>
            <span>
              <UncontrolledTextInput
                min={1}
                disabled={reactBool(isProcessing)}
                onChange={(e) => handleSwayChange(e.currentTarget.value)}
                step={1}
                style={{ height: 28 }}
                type="number"
                value={sway || ''} />
              <span style={{ fontSize: '24px' }}><SwayIcon /></span>
            </span>
            <span>
              SWAY
            </span>
          </div>
        </SwayExchangeRows>
        <footer>Powered by <b>AVNU</b></footer>
      </PurchaseForm>
    </Wrapper>
  );
};

const defaultStyleOverrides = {
  belowFold: { padding: '10px 0 20px 0' },
  title: { textTransform: 'uppercase' }
};

const SwayFaucetButton = () => {
  const queryClient = useQueryClient();
  const { data: faucetInfo, isLoading: faucetInfoLoading } = useFaucetInfo();
  const { accountAddress, login, provider } = useSession();

  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [requestingSway, setRequestingSway] = useState();

  const swayEnabled = useMemo(() => {
    if (!faucetInfo) return false;
    const lastClaimed = faucetInfo.SWAY.lastClaimed || 0;
    return Date.now() > (Date.parse(lastClaimed) + 23.5 * 3600e3);
  }, [faucetInfo]);

  const requestSway = useCallback(async () => {
    if (!accountAddress) return login();

    setRequestingSway(true);

    try {
      const txHash = await api.requestTokens('SWAY');
      await provider.waitForTransaction(txHash);

      createAlert({
        type: 'WalletAlert',
        data: { content: 'Added 400,000 SWAY to your account.' },
        // duration: 5000
      });
    } catch (e) {
      console.error(e);
      createAlert({
        type: 'GenericAlert',
        data: { content: 'Faucet request failed, please try again later.' },
        level: 'warning',
        duration: 5000
      });
    } finally {
      setRequestingSway(false);
    }

    queryClient.invalidateQueries({ queryKey: 'faucetInfo', refetchType: 'none' });
    queryClient.refetchQueries({ queryKey: 'faucetInfo', type: 'active' });
    queryClient.invalidateQueries({ queryKey: ['walletBalance', 'sway'] });
  }, [accountAddress, login, provider]);

  return (
    <PurchaseButton
      color={theme.colors.success}
      contrastColor={theme.colors.disabledBackground}
      background={`rgba(${theme.colors.successRGB}, 0.1)`}
      onClick={requestSway}
      disabled={nativeBool((accountAddress && !swayEnabled) || requestingSway || faucetInfoLoading)}
      loading={reactBool(requestingSway || faucetInfoLoading)}
      style={{ marginRight: 10 }}>
      <PurchaseButtonInner>
        <label>SWAY Faucet (Daily)</label>
        <span style={{ marginLeft: 10 }}>
          +<SwayIcon />{Number(400000).toLocaleString()}
        </span>
      </PurchaseButtonInner>
    </PurchaseButton>
  );
}

const SKU = ({ asset, onBack }) => {
  const { accountAddress, login } = useSession();
  const { pendingTransactions, isLaunched } = useCrewContext();
  const priceHelper = usePriceHelper();
  const packs = useStarterPacks();
  const { data: wallet } = useWalletBalances();

  const preferredUiCurrency = useStore(s => s.getPreferredUiCurrency());
  const filters = useStore(s => s.assetSearch['asteroidsMapped'].filters);
  const updateFilters = useStore(s => s.dispatchFiltersUpdated('asteroidsMapped'));
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);

  const [purchase, setPurchase] = useState();
  const [fundingPurchase, setFundingPurchase] = useState();
  const [isPurchasing, setIsPurchasing] = useState();

  const isPurchasingStarterPack = useMemo(() => {
    return isPurchasing || (pendingTransactions || []).find(tx => tx.key === 'PurchaseStarterPack');
  }, [pendingTransactions]);

  const filterUnownedAsteroidsAndClose = useCallback(() => {
    updateFilters(Object.assign({}, filters, { ownedBy: 'unowned' }));
    dispatchZoomScene();
    let hudTimeout = 0;
    if (zoomStatus !== 'out') {
      updateZoomStatus('zooming-out');
      hudTimeout = 2100;
    }
    setTimeout(() => dispatchHudMenuOpened('BELT_MAP_SEARCH'), hudTimeout);
    dispatchLauncherPage();
  }, [filters, updateFilters, zoomStatus, dispatchHudMenuOpened, dispatchLauncherPage, dispatchZoomScene, updateZoomStatus]);

  const handlePurchase = useCallback((overridePurchase) => {
    if (!accountAddress) return login();

    const purch = (overridePurchase || purchase);
    const totalPriceUSD = purch?.totalPrice?.to(TOKEN.USDC);
    const totalWalletUSD = wallet.combinedBalance?.to(TOKEN.USDC);
    if (totalWalletUSD > totalPriceUSD) {
      purch.onPurchase();
    } else {
      setFundingPurchase(purch);
    }
  }, [accountAddress, login, purchase, wallet]);

  const onPurchaseStarterPack = useCallback((which) => {
    const pack = packs[which];
    const onIsPurchasing = (which) => setIsPurchasing(which);
    const packPurchase = {
      totalPrice: pack.price,
      onPurchase: () => pack.onPurchase(onIsPurchasing)
    };
    setPurchase(packPurchase);
    handlePurchase(packPurchase);
  }, [handlePurchase, packs]);

  const { content, ...props } = useMemo(() => {
    if (asset === 'asteroids') {
      return {
        coverImage: AsteroidsHeroImage,
        title: 'Buy Asteroids',
        styleOverrides: {
          ...defaultStyleOverrides,
          belowFold: { padding: '10px 0 20px 0' },
          body: { paddingLeft: '35px' }
        },
        content: <AsteroidSKU />,
        flourishWidth: 1,
        rightButton: {
          label: 'Browse Available Asteroids',
          onClick: filterUnownedAsteroidsAndClose,
        }
      };
    }
    if (asset === 'crewmates') {
      return {
        coverImage: CrewmatesHeroImage,
        title: 'Buy Crewmates',
        content: <CrewmateSKU onUpdatePurchase={setPurchase} onPurchasing={setIsPurchasing} />,
        flourish: <AdalianFlourish filter="saturate(125%)" style={{ marginLeft: 35 }} />,
        flourishWidth: 145,
        isPurchasing,
      };
    }
    if (asset === 'packs') {
      return {
        coverImage: StarterPackHeroImage,
        title: <>Buy Starter<br/>Packs</>,
        styleOverrides: {
          ...defaultStyleOverrides,
          aboveFold: { height: 160, marginTop: -175 },
          belowFold: { padding: '10px 0 20px 0' },
          body: { overflow: 'visible', paddingLeft: '35px' },
          rule: { width: 308 }
        },
        content: <StarterPackSKU />,
        flourishWidth: 1,
        rightButton: {
          label: (
            <PurchaseButtonInner>
              <label>Purchase Pack</label>
              <span>
                {packs.advanced.price.to(TOKEN.USDC, TOKEN_FORMAT.SHORT)}
              </span>
            </PurchaseButtonInner>
          ),
          props: {
            loading: isPurchasingStarterPack,
            disabled: isPurchasingStarterPack || !isLaunched,
            isTransaction: true,
            onClick: () => onPurchaseStarterPack('advanced'),
            style: { margin: `0 ${purchasePacksPadding}px` },
            width: purchaseFormWidth - 2 * purchasePacksPadding
          },
          preLabel: (
            <Button
              disabled={nativeBool(isPurchasingStarterPack || !isLaunched)}
              loading={reactBool(isPurchasingStarterPack)}
              isTransaction
              onClick={() => onPurchaseStarterPack('basic')}
              style={{ marginRight: purchaseFormMargin + purchasePacksPadding }}
              width={purchaseFormWidth - 2 * purchasePacksPadding}>
              <PurchaseButtonInner>
                <label>Purchase Pack</label>
                <span>
                  {packs.basic.price.to(TOKEN.USDC, TOKEN_FORMAT.SHORT)}
                </span>
              </PurchaseButtonInner>
            </Button>
          )
        }
      };
    }
    const params = {
      coverImage: SwayHeroImage,
      title: 'Buy Sway',
      content: <SwaySKU onUpdatePurchase={setPurchase} onPurchasing={setIsPurchasing} />,
      flourish: <Flourish src={SwayImage} />,
      flourishWidth: 145,
    };
    params.rightButton = {
      label: (
        <PurchaseButtonInner>
          <label>Purchase</label>
          <span>
            {purchase?.totalPrice.to(preferredUiCurrency, TOKEN_FORMAT.SHORT)}
          </span>
        </PurchaseButtonInner>
      ),
      props: {
        onClick: () => handlePurchase(),
        isTransaction: true,
        disabled: isPurchasing || !(purchase?.totalPrice?.usdcValue > 0) || !isLaunched,
        loading: isPurchasing,
      },
      // conditionally include faucet
      preLabel: process.env.REACT_APP_CHAIN_ID === '0x534e5f5345504f4c4941' && <SwayFaucetButton />
    };
    return params;
  }, [asset, isLaunched, filterUnownedAsteroidsAndClose, isPurchasing]);

  return (
    <>
      <HeroLayout
        autoHeight
        belowFoldMin={192}
        styleOverrides={defaultStyleOverrides}
        leftButton={{
          label: 'Back',
          onClick: onBack
        }}
        rightButton={{
          label: (
            <PurchaseButtonInner>
              <label>Purchase</label>
              <span>
                {(purchase?.totalPrice || priceHelper.from(0n)).to(preferredUiCurrency, true)}
              </span>
            </PurchaseButtonInner>
          ),
          onClick: () => handlePurchase(),
          props: {
            disabled: isPurchasing || !(purchase?.totalPrice?.usdcValue > 0),
            loading: isPurchasing,
            isTransaction: true
          }
        }}
        {...props}>
        {content}
      </HeroLayout>

      {fundingPurchase && (
        <FundingFlow
          totalPrice={fundingPurchase.totalPrice}
          onClose={() => setFundingPurchase()}
          onFunded={fundingPurchase.onPurchase} />
      )}
    </>
  );
};

export default SKU;