import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import styled from 'styled-components';
import { Crewmate } from '@influenceth/sdk';

import AsteroidsHeroImage from '~/assets/images/sales/asteroids_hero.png';
import CrewmatesHeroImage from '~/assets/images/sales/crewmates_hero.png';
import SwayImage from '~/assets/images/sales/sway.png';
import SwayHeroImage from '~/assets/images/sales/sway_hero.jpg';
import StarterPackHeroImage from '~/assets/images/sales/starter_packs_hero.jpg';
import AdalianFlourish from '~/components/AdalianFlourish';
import HeroLayout from '~/components/HeroLayout';
import UncontrolledTextInput from '~/components/TextInputUncontrolled';
import { CheckIcon, EthIcon, PlusIcon, PurchaseAsteroidIcon, SwayIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import useAsteroidSale from '~/hooks/useAsteroidSale';
import useBlockTime from '~/hooks/useBlockTime';
import useFaucetInfo from '~/hooks/useFaucetInfo';
import { cleanseTxHash, formatTimer, nativeBool, reactBool, roundToPlaces } from '~/lib/utils';
import NavIcon from '~/components/NavIcon';
import theme from '~/theme';
import Button from '~/components/ButtonAlt';
import useWalletBalances, { GAS_BUFFER_VALUE_USDC } from '~/hooks/useWalletBalances';
import useCrewManager from '~/hooks/actionManagers/useCrewManager';
import usePriceConstants from '~/hooks/usePriceConstants';
import { TOKEN, TOKEN_FORMAT, TOKEN_SCALE } from '~/lib/priceUtils';
import usePriceHelper from '~/hooks/usePriceHelper';
import UserPrice from '~/components/UserPrice';
import { advPackPriceUSD, basicPackPriceUSD } from '../Store';
import FundingFlow from './FundingFlow';
import api from '~/lib/api';
import useSession from '~/hooks/useSession';
import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useSwapHelper from '~/hooks/useSwapHelper';
import { useEthBalance } from '~/hooks/useWalletTokenBalance';
import useCrewContext from '~/hooks/useCrewContext';

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
const purchaseFormMargin = 15;
const purchaseFormWidth = 290;
const PurchaseForm = styled.div`
  background: linear-gradient(
    to bottom,
    ${p => p.isOrange
        ? 'rgba(127, 98, 54, 0.7)'
        : (p.isPurple ? 'rgba(70, 68, 134, 0.7)' : 'rgba(48, 88, 114, 0.7)')
    },
    transparent
  );

  flex: 0 0 ${purchaseFormWidth}px;
  align-self: stretch;
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

const PackWrapper = styled.div`
  padding: 10px 8px;
`;

const PackContents = styled.div`
  &:before {
    content: "Contains:";
    color: ${p => p.theme.colors.main};
    display: block;
    font-size: 15px;
    font-weight: bold;
    margin-bottom: 15px;
  }

  & > div {
    align-items: center;
    display: flex;
    margin-bottom: 10px;

    & > label {
      flex: 1;
      font-size: 18px;
      font-weight: bold;
      white-space: nowrap;
    }
    & > span {
      opacity: 0.6;
      white-space: nowrap;

      &:first-child {
        font-size: 12px;
        margin-right: 6px;
        opacity: 1;
      }
    }
  }

  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 5px;
`;
const PackChecks = styled.div`
  padding-top: 15px;
  & > div {
    display: flex;
    flex-direction: row;
    margin-bottom: 8px;
    & > span {
      color: ${p => p.theme.colors.main};
      flex: 0 0 32px;
      font-size: 12px;
      padding-top: 3px;
    }
    & > label {
      color: ${p => p.theme.colors.main};
      font-size: 13px;
      line-height: 18px;
      & > b {
        color: white;
        font-weight: normal;
      }
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

  const [remaining, remainingTime, trendingToSellOut] = useMemo(() => {
    if (!asteroidSale) return [0, 0, false];

    const asteroidSaleEnd = ((asteroidSale.period || 0) + 1) * 1e6;
    const remaining = asteroidSale ? (Number(asteroidSale.limit) - Number(asteroidSale.volume)) : 0;
    const remainingTime = asteroidSaleEnd - blockTime;
    return [
      remainingTime > 0 ? remaining : 0,
      remainingTime,
      (remaining / remainingTime) <= (asteroidSale.limit / 1e6)
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
      <PurchaseForm isOrange={remaining === 0 || remainingTime <= 0}>
        <h3>
          <span>
            {remainingTime > 0 && remaining > 0 && `Sale Active`}
            {remainingTime > 0 && remaining === 0 && `Next Sale`}
            {remainingTime <= 0 && `Sale Inactive`}
          </span>
          <span>
            {remainingTime > 0 && (trendingToSellOut || remaining <= 0)
              ? (
                <>
                  {remaining > 0 ? 'Ends in' : 'Starts in'}
                  <b>{formatTimer(remainingTime, 2)}</b>
                </>
              )
              : null
            }
          </span>
        </h3>
        <div>
          <AsteroidBanner inactive={remaining === 0 || remainingTime <= 0}>
            <div>
              <PurchaseAsteroidIcon />
            </div>
            {(remaining > 0 && remainingTime > 0)
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

const CrewmateSKU = ({ onUpdatePurchase, onPurchasing }) => {
  const { purchaseCredits, getPendingCreditPurchase } = useCrewManager();
  const { data: priceConstants } = usePriceConstants();
  const priceHelper = usePriceHelper();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    onPurchasing(getPendingCreditPurchase())
  }, [getPendingCreditPurchase, onPurchasing]);

  useEffect(() => {
    const totalPrice = priceHelper.from(
      BigInt(quantity) * priceConstants?.ADALIAN_PURCHASE_PRICE,
      priceConstants?.ADALIAN_PURCHASE_TOKEN
    );
    onUpdatePurchase({
      totalPrice,
      onPurchase: () => purchaseCredits(quantity)
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
                max={99}
                min={1}
                onChange={(e) => setQuantity(e.currentTarget.value)}
                step={1}
                style={{ height: 28 }}
                type="number"
                value={quantity || ''}
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
  const { data: priceConstants } = usePriceConstants();
  const priceHelper = usePriceHelper();

  const adalianPrice = useMemo(() => {
    if (!priceConstants) return priceHelper.from(0);
    return priceHelper.from(priceConstants?.ADALIAN_PURCHASE_PRICE, priceConstants?.ADALIAN_PURCHASE_TOKEN);
  }, [priceConstants]);

  const packs = useMemo(() => {
    const basicPrice = priceHelper.from(basicPackPriceUSD * TOKEN_SCALE[TOKEN.USDC], TOKEN.USDC);
    const basicCrewmates = 1;
    const basicCrewmatesValue = priceHelper.from(basicCrewmates * adalianPrice.usdcValue, TOKEN.USDC);
    const basicEthValue = priceHelper.from(GAS_BUFFER_VALUE_USDC, TOKEN.USDC);
    const basicSwayValue = priceHelper.from(basicPrice.usdcValue - basicCrewmatesValue.usdcValue - basicEthValue.usdcValue, TOKEN.USDC);

    const advPrice = priceHelper.from(advPackPriceUSD * TOKEN_SCALE[TOKEN.USDC], TOKEN.USDC);
    const advCrewmates = 5;
    const advCrewmatesValue = priceHelper.from(advCrewmates * adalianPrice.usdcValue, TOKEN.USDC);
    const advEthValue = basicEthValue;
    const advSwayValue = priceHelper.from(advPrice.usdcValue - advCrewmatesValue.usdcValue - advEthValue.usdcValue, TOKEN.USDC);

    return {
      basic: {
        price: basicPrice,
        crewmates: basicCrewmates,
        crewmatesValue: basicCrewmatesValue,
        ethFormatted: basicEthValue.to(TOKEN.ETH, TOKEN_FORMAT.VERBOSE),
        ethValue: basicEthValue,
        swayFormatted: basicSwayValue.to(TOKEN.SWAY, TOKEN_FORMAT.VERBOSE),
        swayValue: basicSwayValue
      },
      adv: {
        price: basicPrice,
        crewmates: advCrewmates,
        crewmatesValue: advCrewmatesValue,
        ethFormatted: advEthValue.to(TOKEN.ETH, TOKEN_FORMAT.VERBOSE),
        ethValue: advEthValue,
        swayFormatted: advSwayValue.to(TOKEN.SWAY, TOKEN_FORMAT.VERBOSE),
        swayValue: advSwayValue
      }
    }
  }, [adalianPrice, priceHelper]);

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

      <div style={{ display: 'flex', flex: `0 0 ${2 * purchaseFormWidth + purchaseFormMargin}px`, height: 352, marginTop: -160 }}>
        <PurchaseForm style={{ marginRight: purchaseFormMargin, height: '100%' }}>
          <h3>Basic Starter Pack</h3>
          <PackWrapper>
            <PackContents>
              <div>
                <span><NavIcon color={theme.colors.main} /></span>
                <label>{packs.basic.crewmates} Crewmate{packs.basic.crewmates === 1 ? '' : 's'}</label>
                <span>
                  <UserPrice
                    price={packs.basic.crewmatesValue.usdcValue}
                    priceToken={TOKEN.USDC}
                    format={TOKEN_FORMAT.SHORT} />
                  {' '}Value
                </span>
              </div>
              <div>
                <span><NavIcon color={theme.colors.main} /></span>
                <label>{packs.basic.swayFormatted}</label>
                <span>
                  <UserPrice
                    price={packs.basic.swayValue.usdcValue}
                    priceToken={TOKEN.USDC}
                    format={TOKEN_FORMAT.SHORT} />
                  {' '}Value
                </span>
              </div>
              <div>
                <span><NavIcon color={theme.colors.main} /></span>
                <label>{packs.basic.ethFormatted}</label>
                <span>
                  <UserPrice
                    price={packs.basic.ethValue.usdcValue}
                    priceToken={TOKEN.USDC}
                    format={TOKEN_FORMAT.SHORT} />
                  {' '}Value
                </span>
              </div>
            </PackContents>
            <PackChecks>
              <div>
                <span><CheckIcon /></span>
                <label>Basic Extraction starter kit</label>
              </div>
              <div>
                <span><CheckIcon /></span>
                <label>{packs.basic.crewmates}x Crewmate{packs.basic.crewmates === 1 ? '' : 's'} to perform game tasks (Recommended <b>Miner</b> class)</label>
              </div>
              <div>
                <span><CheckIcon /></span>
                <label>SWAY to construct <b>1x Warehouse</b> and <b>1x Extractor</b> buildings</label>
              </div>
            </PackChecks>
          </PackWrapper>
        </PurchaseForm>

        <PurchaseForm isPurple>
          <h3>Advanced Starter Pack</h3>
          <PackWrapper>
            <PackContents>
              <div>
                <span><NavIcon color={theme.colors.main} /></span>
                <label>{packs.adv.crewmates} Crewmate{packs.adv.crewmates === 1 ? '' : 's'}</label>
                <span>
                  <UserPrice
                    price={packs.adv.crewmatesValue.usdcValue}
                    priceToken={TOKEN.USDC}
                    format={TOKEN_FORMAT.SHORT} />
                  {' '}Value
                </span>
              </div>
              <div>
                <span><NavIcon color={theme.colors.main} /></span>
                <label>{packs.adv.swayFormatted}</label>
                <span>
                  <UserPrice
                    price={packs.adv.swayValue.usdcValue}
                    priceToken={TOKEN.USDC}
                    format={TOKEN_FORMAT.SHORT} />
                  {' '}Value
                </span>
              </div>
              <div>
                <span><NavIcon color={theme.colors.main} /></span>
                <label>{packs.adv.ethFormatted}</label>
                <span>
                  <UserPrice
                    price={packs.adv.ethValue.usdcValue}
                    priceToken={TOKEN.USDC}
                    format={TOKEN_FORMAT.SHORT} />
                  {' '}Value
                </span>
              </div>
            </PackContents>
            <PackChecks>
              <div>
                <span><CheckIcon /></span>
                <label>Advanced starter kit for extraction, refining, and production processes</label>
              </div>
              <div>
                <span><CheckIcon /></span>
                <label>{packs.adv.crewmates}x Crewmate{packs.adv.crewmates === 1 ? '' : 's'} to form a full crew and perform game tasks efficiently</label>
              </div>
              <div>
                <span><CheckIcon /></span>
                <label>SWAY to construct <b>1x Warehouse</b> and <b>1x Extractor</b> and <b>1x Refinery</b> buildings</label>
              </div>
            </PackChecks>
          </PackWrapper>
        </PurchaseForm>
      </div>
    </Wrapper>
  );
};

// TODO: wrap in launch feature flag
const SwaySKU = ({ onUpdatePurchase, onPurchasing }) => {
  const { executeCalls } = useContext(ChainTransactionContext);
  const priceHelper = usePriceHelper();
  const { buildMultiswapFromSellAmount } = useSwapHelper();
  const queryClient = useQueryClient();
  const { accountAddress, starknet } = useSession();
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
        const multiswapCalls = await buildMultiswapFromSellAmount(wallet, unscaledUSDC, TOKEN.SWAY);
        if (!multiswapCalls) {
          createAlert({
            type: 'GenericAlert',
            data: { content: 'Insufficient swap liquidity! Try again later.' },
            level: 'warning',
            duration: 5000
          });

        // else, run the transactions(s)
        } else {
          try {
            const tx = await executeCalls(multiswapCalls);
            setIsProcessing(true);

            await starknet.account.waitForTransaction(cleanseTxHash(tx.transaction_hash), { retryInterval: 5e3 });

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
  }, [accountAddress, executeCalls, onUpdatePurchase, preferredUiCurrency, priceHelper, queryClient, starknet?.account, usdc, wallet]);

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
  const { starknet } = useSession();

  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [requestingSway, setRequestingSway] = useState();

  const swayEnabled = useMemo(() => {
    if (!faucetInfo) return false;
    const lastClaimed = faucetInfo.SWAY.lastClaimed || 0;
    return Date.now() > (Date.parse(lastClaimed) + 23.5 * 3600e3);
  }, [faucetInfo]);

  const requestSway = useCallback(async () => {
    setRequestingSway(true);

    try {
      const txHash = await api.requestTokens('SWAY');
      await starknet.account.waitForTransaction(txHash);

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
  }, []);

  return (
    <PurchaseButton
      color={theme.colors.success}
      contrastColor={theme.colors.disabledBackground}
      background={`rgba(${theme.colors.successRGB}, 0.1)`}
      onClick={requestSway}
      disabled={nativeBool(!swayEnabled || requestingSway || faucetInfoLoading)}
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
  const { execute } = useContext(ChainTransactionContext);
  const { pendingTransactions } = useCrewContext();
  const { data: ethBalance } = useEthBalance();
  const { data: priceConstants } = usePriceConstants();
  const priceHelper = usePriceHelper();
  const { buildMultiswapFromSellAmount } = useSwapHelper();
  const { data: wallet } = useWalletBalances();

  const preferredUiCurrency = useStore(s => s.getPreferredUiCurrency());
  const filters = useStore(s => s.assetSearch['asteroidsMapped'].filters);
  const updateFilters = useStore(s => s.dispatchFiltersUpdated('asteroidsMapped'));
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const createAlert = useStore(s => s.dispatchAlertLogged);
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
    const purch = (overridePurchase || purchase);
    const totalPriceUSD = purch?.totalPrice?.to(TOKEN.USDC);
    const totalWalletUSD = wallet.combinedBalance?.to(TOKEN.USDC);
    if (totalWalletUSD > totalPriceUSD) {
      purch.onPurchase();
    } else {
      setFundingPurchase(purch);
    }
  }, [purchase, wallet]);

  const onPurchaseStarterPack = useCallback((which) => {
    const totalPrice = priceHelper.from((which === 'basic' ? basicPackPriceUSD : advPackPriceUSD) * TOKEN_SCALE[TOKEN.USDC], TOKEN.USDC);
    const crewmateTally = which === 'basic' ? 1 : 5;
    const crewmate_usd = priceConstants ? priceHelper.from(BigInt(crewmateTally) * priceConstants?.ADALIAN_PURCHASE_PRICE, priceConstants?.ADALIAN_PURCHASE_TOKEN).to(TOKEN.USDC) : 0;
    const purchaseEth_usd = GAS_BUFFER_VALUE_USDC;
    const purchaseSway_usd = totalPrice?.usdcValue - crewmate_usd - purchaseEth_usd;
    const packPurchase = {
      totalPrice,
      onPurchase: async () => {
        setIsPurchasing(true);

        let ethSwapCalls = await buildMultiswapFromSellAmount(purchaseEth_usd, TOKEN.ETH);
        // this means has no usdc (likely) OR illiquid swap (unlikely)... we'll assume the former.
        // can still allow the transaction to go through as long as has enough ETH to cover the
        // cost (and subsequent swaps will not leave without any gas buffer)
        if (ethSwapCalls === false) {
          if (priceHelper.from(ethBalance, TOKEN.ETH).to(TOKEN.USDC) >= totalPrice.usdcValue) {
            ethSwapCalls = [];
          } else {
            createAlert({
              type: 'GenericAlert',
              data: { content: 'Insufficient ETH or USDC/ETH swap liquidity!' },
              level: 'warning',
              duration: 5000
            });
            setIsPurchasing(false);
            return;
          }
        }
        const swaySwapCalls = await buildMultiswapFromSellAmount(purchaseSway_usd, TOKEN.SWAY);
        if (swaySwapCalls === false) {
          createAlert({
            type: 'GenericAlert',
            data: { content: 'Insufficient SWAY swap liquidity!' },
            level: 'warning',
            duration: 5000
          });
          setIsPurchasing(false);
          return;
        }

        await execute('PurchaseStarterPack', {
          collection: Crewmate.COLLECTION_IDS.ADALIAN,
          crewmateTally,
          swapCalls: [ ...ethSwapCalls, ...swaySwapCalls ]
        });

        setIsPurchasing(false);
      }
    };
    setPurchase(packPurchase);
    handlePurchase(packPurchase);
  }, [advPackPriceUSD, basicPackPriceUSD, buildMultiswapFromSellAmount, handlePurchase, priceConstants, priceHelper]);

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
          aboveFold: { height: 160, marginTop: -160 },
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
                <UserPrice
                  price={advPackPriceUSD * TOKEN_SCALE[TOKEN.USDC]}
                  priceToken={TOKEN.USDC}
                  format={TOKEN_FORMAT.SHORT}
                />
              </span>
            </PurchaseButtonInner>
          ),
          props: {
            loading: isPurchasingStarterPack,
            disabled: isPurchasingStarterPack,
            isTransaction: true,
            onClick: () => onPurchaseStarterPack('advanced'),
            style: { margin: `0 ${purchasePacksPadding}px` },
            width: purchaseFormWidth - 2 * purchasePacksPadding
          },
          preLabel: (
            <Button
              disabled={nativeBool(isPurchasingStarterPack)}
              loading={reactBool(isPurchasingStarterPack)}
              isTransaction
              onClick={() => onPurchaseStarterPack('basic')}
              style={{ marginRight: purchaseFormMargin + purchasePacksPadding }}
              width={purchaseFormWidth - 2 * purchasePacksPadding}>
              <PurchaseButtonInner>
                <label>Purchase Pack</label>
                <span>
                  <UserPrice
                    price={basicPackPriceUSD * TOKEN_SCALE[TOKEN.USDC]}
                    priceToken={TOKEN.USDC}
                    format={TOKEN_FORMAT.SHORT}
                  />
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
    // conditionally include faucet
    if (process.env.NODE_ENV !== '0x534e5f4d41494e') {
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
          onClick: handlePurchase,
          isTransaction: true,
          disabled: isPurchasing,
          loading: isPurchasing,
        },
        preLabel: <SwayFaucetButton />
      };
    }
    return params;
  }, [asset, filterUnownedAsteroidsAndClose, isPurchasing]);

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
          onClick: handlePurchase,
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