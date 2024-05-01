import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { formatEther, parseUnits } from 'ethers';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from 'react-query';

import Button from '~/components/ButtonAlt';
import ClipCorner from '~/components/ClipCorner';
import Ether from '~/components/Ether';
import UncontrolledTextInput, { safeValue } from '~/components/TextInputUncontrolled';

import useCrewManager from '~/hooks/actionManagers/useCrewManager';
import usePriceConstants from '~/hooks/usePriceConstants';
import useStore from '~/hooks/useStore';

import formatters from '~/lib/formatters';
import { nativeBool, reactBool } from '~/lib/utils';
import api from '~/lib/api';
import theme from '~/theme';

import AdaliansImages from '~/assets/images/sales/adalians.png';
import AsteroidsImage from '~/assets/images/sales/asteroids.png';
import { ChevronRightIcon, PlusIcon, SwayIcon, WarningOutlineIcon } from '~/components/Icons';
import Details from '~/components/DetailsV2';
import useSession from '~/hooks/useSession';
import useInterval from '~/hooks/useInterval';
import BrightButton from '~/components/BrightButton';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import useEthBalance from '~/hooks/useEthBalance';
import useFaucetInfo from '~/hooks/useFaucetInfo';

const borderColor = `rgba(${theme.colors.mainRGB}, 0.5)`;

const Wrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 570px;
  max-height: calc(100vh - 291px);
  justify-content: center;
  width: 100%;
`;

const Group = styled.div`
  flex: 0 1 360px;
  margin: 0 10px;
`;

const SKUWrapper = styled.div`
  background: black;
  padding: 20px 15px;
`;

const innerPadding = 10;

const SKUInner = styled.div`
  background: rgba(${p => p.theme.colors.mainRGB}, 0.2);
  border: 1px solid ${borderColor};
  display: flex;
  flex-direction: column;
  max-height: 530px;
  justify-content: space-between;
  padding: ${innerPadding}px;
  position: relative;
  width: 340px;
  ${p => p.theme.clipCorner(10)};
`;

const Title = styled.div`
  font-size: 28px;
  margin: 5px 0 15px;
  text-align: center;
  text-transform: uppercase;
`;

const Imagery = styled.div`
  display: flex;
  justify-content: center;
  padding: 10px 10px 20px;
  & > img,
  & > svg.icon {
    height: 200px;
    max-height: calc(100vh - 650px);
  }

  & > svg.icon {
    width: auto;
  }

  @media (max-height: 720px) {
    display: none;
  }
`;

const TypeLabel = styled.div`
  color: ${p => p.theme.colors.main};
  font-size: 15px;
`;

const Main = styled.div`
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  height: 50px;
  margin: 10px -${innerPadding}px;
  padding: ${innerPadding}px;

  & > input {
    font-size: 18px;
    height: 30px;
    margin: 0 10px;
    text-align: right;
    width: 75px;
  }

  & > label {
    font-size: 20px;
  }

  & > sub {
    align-items: flex-end;
    display: flex;
    height: 21px;
    margin-left: 4px;
    opacity: 0.5;
    vertical-align: bottom;
  }

  & > span {
    font-weight: bold;
    margin-right: 5px;
    font-size: 18px;
  }
`;

const Description = styled(TypeLabel)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 5px 15px 0;
  height: 67px;

  & a {
    color: ${p => p.theme.colors.brightMain};
    display: inline;
  }

  & a:hover {
    color: white;
    text-decoration: none;
`;

const Price = styled.div`
  color: white;
  font-size: 30px;
  margin-bottom: 15px;
  & span {
    margin: 0 5px;
  }
  & span:first-child {
    margin-left: 0;
  }
  & label {
    font-size: 60%;
    opacity: 0.5;
    text-transform: uppercase;
  }
`;

const FundingBody = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  width: 500px;
  h3 {
    align-items: center;
    color: ${p => p.theme.colors.warning};
    display: flex;
    font-size: 18px;
    font-weight: normal;
    & > svg {
      font-size: 35px;
      margin-right: 16px;
    }
  }
`;

const FundingButtons = styled.div`
  padding: 10px 10px 20px;
  width: 400px;
  & button {
    margin-bottom: 15px;
    padding: 15px 10px;
    text-transform: none;
    width: 100%;
    & > div {
      display: flex;
      & > span {
        flex: 1;
        text-align: left;
      }
    }
  }
`;

const FundingFooter = styled.div`
  border-top: 1px solid #222;
  display: flex;
  justify-content: flex-end;
  padding: 10px 0 15px;
`;

const Disclaimer = styled.div`
  color: ${p => p.theme.colors.main};
  font-size: 15.5px;
  padding: 10px 10px 20px;
  pointer-events: ${p => p.visible ? 'all' : 'none'};
  & a {
    color: white;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const ButtonExtra = styled.span`
  align-items: center;
  color: white;
  display: flex;
  flex-direction: row;
  flex: 1;
  font-size: 90%;
  justify-content: flex-end;
  margin-left: 15px;
  text-align: right;
`;

const ButtonWarning = styled(ButtonExtra)`
  color: orangered;
  font-size: 80%;
`;

const layerSwapChains = {
  '0x534e5f4d41494e': { ethereum: 'ETHEREUM_MAINNET', starknet: 'STARKNET_MAINNET' },
  'SN_MAIN': { ethereum: 'ETHEREUM_MAINNET', starknet: 'STARKNET_MAINNET' },
  '0x534e5f474f45524c49': { ethereum: 'ETHEREUM_GOERLI', starknet: 'STARKNET_GOERLI' },
  'SN_GOERLI': { ethereum: 'ETHEREUM_GOERLI', starknet: 'STARKNET_GOERLI' },
  '0x534e5f5345504f4c4941': { ethereum: 'ETHEREUM_SEPOLIA', starknet: 'STARKNET_SEPOLIA' },
  'SN_SEPOLIA': { ethereum: 'ETHEREUM_SEPOLIA', starknet: 'STARKNET_SEPOLIA' }
};

export const FundingDialog = ({ onClose, onSelect, targetAmount }) => {
  const { accountAddress, starknet } = useSession();
  const [hoveredRampButton, setHoveredRampButton] = useState(false);

  const to = useRef();
  const onRampHover = useCallback((which) => (e) => {
    if (to.current) clearTimeout(to.current);
    if (which) {
      setHoveredRampButton(e.target);
    } else {  // close on delay so have time to click the link
      to.current = setTimeout(() => {
        setHoveredRampButton();
      }, 1500);
    }
  }, []);

  const selectBridge = useCallback(() => {
    const fromChain = layerSwapChains[starknet?.chainId]?.ethereum;
    const toChain = layerSwapChains[starknet?.chainId]?.starknet;
    const url = `https://www.layerswap.io/app/?from=${fromChain}&to=${toChain}&asset=ETH&destAddress=${accountAddress}
      &lockAddress=true&amount=${targetAmount}&actionButtonText=Fund%20Account`;

    window.open(url, '_blank');
  }, [starknet?.chainId, accountAddress, targetAmount]);

  const selectStripe = useCallback(() => {
    const toChain = layerSwapChains[starknet?.chainId]?.starknet;
    const url = `https://www.layerswap.io/app/?from=STRIPE&to=${toChain}&asset=ETH&destAddress=${accountAddress}
      &lockAddress=true&amount=${targetAmount}&actionButtonText=Fund%20Account`;

    window.open(url, '_blank');
  }, [starknet?.chainId, accountAddress, targetAmount]);

  const selectRamp = useCallback(() => {
    const logoUrl = window.location.origin + '/maskable-logo-192x192.png';
    // TODO: url params are confusing/not working here `&swapAsset=ETH&swapAmount=${targetAmount}`
    const url = `https://app.${process.env.NODE_ENV === 'production' ? '' : 'demo.'}ramp.network
      ?hostApiKey=${process.env.REACT_APP_RAMP_API_KEY}&hostAppName=Influence&hostLogoUrl=${logoUrl}
      &userAddress=${accountAddress}&defaultAsset=STARKNET_ETH`;

    window.open(url, '_blank');
  }, [accountAddress]);

  const onClick = useCallback((which) => {
    switch (which) {
      case 'bridge':
        selectBridge();
        break;
      case 'stripe':
        selectStripe();
        break;
      case 'ramp':
        selectRamp();
        break;
      default:
        break;
    }

    onSelect();
  }, [onSelect, selectBridge, selectStripe, selectRamp]);

  return createPortal(
    (
      <Details title="Add Funds" onClose={onClose} modalMode style={{ zIndex: 9000 }}>
        <FundingBody>
          <h3>
            <WarningOutlineIcon /> <span>Your account does not have enough funds.</span>
          </h3>
          <FundingButtons>
            <BrightButton onClick={() => onClick('bridge')}>
              <span>Fund with ETH</span>
              <ChevronRightIcon />
            </BrightButton>

            <BrightButton onClick={() => onClick('stripe')}>
              <span>Buy with credit card (U.S. Only)</span>
              <ChevronRightIcon />
            </BrightButton>

            {process.env.REACT_APP_RAMP_API_KEY && (
              <div style={{ position: 'relative' }}>
                <BrightButton
                  onClick={() => onClick('ramp')}
                  onMouseEnter={onRampHover(true)}
                  onMouseLeave={onRampHover(false)}>
                  <span>Buy now with Ramp</span>
                  <ChevronRightIcon />
                </BrightButton>

                <MouseoverInfoPane
                  referenceEl={hoveredRampButton}
                  css={css`margin-top:10px;`}
                  placement="bottom"
                  visible={!!hoveredRampButton}
                  zIndex={9001}>
                  <Disclaimer visible={!!hoveredRampButton}>
                    RAMP DISCLAIMER: Don't invest unless you're prepared to lose all the money you
                    invest. This is a high-risk investment and you should not expect to be protected
                    if something goes wrong.{' '}
                    <a href="https://ramp.network/risk-warning" target="_blank" rel="noopener noreferrer">Take 2 minutes to learn more.</a>
                  </Disclaimer>
                </MouseoverInfoPane>
              </div>
            )}
          </FundingButtons>
        </FundingBody>
        <FundingFooter>
          <Button onClick={onClose}>Back</Button>
        </FundingFooter>
      </Details>
    ),
    document.body
  );
};

export const CrewmateSKU = () => {
  const { purchaseCredits, getPendingCreditPurchase } = useCrewManager();
  const { data: priceConstants } = usePriceConstants();
  const { data: ethBalance, refetch: refetchEth } = useEthBalance();

  const [tally, setTally] = useState(5);

  const totalCost = useMemo(() => {
    return BigInt(tally) * BigInt(priceConstants?.ADALIAN_PRICE_ETH || 0);
  }, [tally, priceConstants?.ADALIAN_PRICE_ETH]);

  const [funding, setFunding] = useState(false);
  const [polling, setPolling] = useState(false);

  const onFundWallet = () => {
    setFunding(true);
  };

  const onSelectFundingOption = () => {
    setFunding(false);
    setPolling(true);
  };

  const onPurchaseCrewmates = useCallback(() => {
    purchaseCredits(tally);
  }, [tally, purchaseCredits]);

  const isPendingPurchase = useMemo(() => {
    return !!getPendingCreditPurchase();
  }, [getPendingCreditPurchase]);

  const isInsufficientBalance = useMemo(() => {
    if (ethBalance === null) return false;
    return totalCost > ethBalance;
  }, [ethBalance, totalCost]);

  // TODO: would it make more sense to just check on each new block?
  // TODO: definitely don't need this on both SKUs
  useInterval(() => {
    if (polling && isInsufficientBalance) refetchEth();
  }, 5e3);

  return (
    <>
      <SKUWrapper>
        <SKUInner>
          <Title>Crewmates</Title>
          <Imagery>
            <img src={AdaliansImages} alt="Adalian Crewmate Cards" />
          </Imagery>
          <Description>
            Crewmates are the literal heart and soul of Adalia. They perform all in-game tasks and form your crew.
          </Description>
          <Main>
            <UncontrolledTextInput
              disabled={nativeBool(isPendingPurchase)}
              min={1}
              onChange={(e) => setTally(Math.floor(e.currentTarget.value))}
              value={safeValue(tally)}
              step={1}
              type="number" />

            <label>Crewmate{Number(tally) === 1 ? '' : 's'}</label>
          </Main>
          <Price>
            <span>{formatters.crewmatePrice(priceConstants, 4)}</span>
            <label>Eth each</label>
          </Price>
          {(isPendingPurchase || !priceConstants?.ADALIAN_PRICE_ETH || Number(tally) === 0 || !isInsufficientBalance)
            ? (
              <Button
                loading={reactBool(isPendingPurchase)}
                disabled={nativeBool(isPendingPurchase || !priceConstants?.ADALIAN_PRICE_ETH || Number(tally) === 0)}
                isTransaction
                onClick={onPurchaseCrewmates}
                style={{ width: '100%' }}>
                Purchase
                {priceConstants && (
                  <ButtonExtra>
                    {/* TODO: should this update price before "approve"? what about asteroids? */}
                    <Ether>{formatters.ethPrice(totalCost, 4)}</Ether>
                  </ButtonExtra>
                )}
              </Button>
            )
            : (
              <Button
                onClick={onFundWallet}
                color={theme.colors.success}
                background={`rgba(${theme.colors.successRGB}, 0.1)`}
                style={{ width: '100%' }}>
                <PlusIcon />
                <span>Add Funds</span>
                <ButtonWarning>
                  Low Balance
                </ButtonWarning>
              </Button>
            )}
          <ClipCorner dimension={10} color={borderColor} />
        </SKUInner>
      </SKUWrapper>

      {funding && (
        <FundingDialog
          targetAmount={Math.max(formatEther(totalCost || 0n) || 0, 0.01)}
          onClose={() => setFunding(false)}
          onSelect={onSelectFundingOption}
        />
      )}
    </>
  );
};

export const AsteroidSKU = () => {
  const { data: priceConstants } = usePriceConstants();

  const filters = useStore(s => s.assetSearch['asteroidsMapped'].filters);
  const updateFilters = useStore(s => s.dispatchFiltersUpdated('asteroidsMapped'));
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);

  const [asteroidSale, setAsteroidSale] = useState({});

  const updateSale = useCallback(async () => {
    const salesData = await api.getAsteroidSale();
    setAsteroidSale(salesData || {});
  }, []);

  useEffect(() => updateSale(), [updateSale]);

  const filterAndClose = useCallback(() => {
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

  return (
    <SKUWrapper>
      <SKUInner>
        <Title>Asteroids</Title>
        <Imagery>
          <img src={AsteroidsImage} alt="Asteroid Card" />
        </Imagery>
        <Description>
          Asteroids are the core productive land in Influence. Each asteroid comes with one free
          Adalian crewmate!
        </Description>
        <Main>
          <label><b>{asteroidSale ? (Number(asteroidSale.limit) - Number(asteroidSale.volume)).toLocaleString() : ''}</b> Asteroids</label>
          <sub>remaining this period</sub>
        </Main>
        <Price>
            <label>Starting at</label>
            <span>{formatters.asteroidPrice(1, priceConstants)}</span>
            <label>Eth</label>
        </Price>
        <Button
          onClick={filterAndClose}
          style={{ width: '100%' }}>
          Browse Available Asteroids
        </Button>
        <ClipCorner dimension={10} color={borderColor} />
      </SKUInner>
    </SKUWrapper>
  );
};

export const SwaySKU = () => {
  const { accountAddress, starknet } = useSession();
  const { data: ethBalance, refetch: refetchEth } = useEthBalance();

  const [ethToSell, setEthToSell] = useState(0.01);

  const [funding, setFunding] = useState(false);
  const [polling, setPolling] = useState(false);
  const [quote, setQuote] = useState(null);

  const avnuUrl = `https://app.avnu.fi/en?tokenFrom=${process.env.REACT_APP_ERC20_TOKEN_ADDRESS}
      &tokenTo=${process.env.REACT_APP_STARKNET_SWAY_TOKEN}`;

  const swapForSway = useCallback(async () => {
    try {
      await api.executeSwaySwap({ quote, account: starknet?.account });
      setQuote(null);
      setEthToSell(0);
    } catch (e) {
      console.error(e);
    }
  }, [starknet?.account, quote]);

  useEffect(() => {
    const getPrice = async () => {
      try {
        const [ quote ] = await api.getSwayQuote({
          sellToken: process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
          buyToken: process.env.REACT_APP_STARKNET_SWAY_TOKEN,
          amount: parseUnits(ethToSell.toString(10)),
          account: accountAddress
        });

        if (quote) {
          setQuote(quote);
        } else {
          setQuote(null);
        }
      } catch (e) {
        console.error(e);
      }
    };

    getPrice();
  }, [accountAddress, ethToSell]);

  const onFundWallet = () => {
    setFunding(true);
  };

  const onSelectFundingOption = () => {
    setFunding(false);
    setPolling(true);
  };

  const isInsufficientBalance = useMemo(() => {
    if (ethBalance === null) return false;
    return parseUnits(ethToSell.toString(10), 18) + parseUnits('0.001', 18) > ethBalance;
  }, [ethBalance, ethToSell]);

  // TODO: would it make more sense to just check on each new block?
  // TODO: definitely don't need this on both SKUs
  useInterval(() => {
    if (polling && isInsufficientBalance) refetchEth();
  }, 5e3);

  const isPendingPurchase = false;

  const swayFormatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    minimumSignificantDigits: 4,
    maximumSignificantDigits: 4
  });

  return (
    <>
      <SKUWrapper>
        <SKUInner>
          <Title>SWAY</Title>
          <Imagery>
            <SwayIcon />
          </Imagery>
          <Description>
            <p>
              SWAY (Standard Weighted Adalian Yield) is the basic economic unit of exchange in Adalia. Purchases
              powered by <a href={avnuUrl} target="_blank" rel="noopener noreferrer">AVNU</a>.
            </p>
          </Description>
          <Main>
              <label>Exchange</label>
              <UncontrolledTextInput
                min={1}
                onChange={(e) => setEthToSell(e.currentTarget.value || 0)}
                value={ethToSell}
                step={1}
                type="number" />

              <label>ETH for</label>
          </Main>
          <Price>
              {!quote && <label>SWAY Unavailable</label>}
              {!!quote && (
                <>
                  <span>{swayFormatter.format(Number(quote.buyAmount) / 1e6)}</span>
                  <label>SWAY</label>
                </>
              )}
          </Price>
          {(isPendingPurchase || !ethToSell || !isInsufficientBalance)
            ? (
              <Button
                loading={reactBool(isPendingPurchase)}
                disabled={nativeBool(isPendingPurchase || !ethToSell)}
                isTransaction
                onClick={swapForSway}
                style={{ width: '100%' }}>
                Purchase
                  <ButtonExtra>
                    {/* TODO: should this update price before "approve"? what about asteroids? */}
                    <Ether>{Number(ethToSell) + 0.001}</Ether>
                  </ButtonExtra>
              </Button>
            )
            : (
              <Button
                onClick={onFundWallet}
                color={theme.colors.success}
                background={`rgba(${theme.colors.successRGB}, 0.1)`}
                style={{ width: '100%' }}>
                <PlusIcon />
                <span>Add Funds</span>
                <ButtonWarning>
                  Low Balance
                </ButtonWarning>
              </Button>
            )}
          <ClipCorner dimension={10} color={borderColor} />
        </SKUInner>
      </SKUWrapper>

      {funding && (
        <FundingDialog
          targetAmount={Math.max(ethToSell + 0.001) || 0.01}
          onClose={() => setFunding(false)}
          onSelect={onSelectFundingOption}
        />
      )}
    </>
  );
};

export const FaucetSKU = () => {
  const { starknet } = useSession();
  const queryClient = useQueryClient();
  const { data: faucetInfo, isLoading: faucetInfoLoading } = useFaucetInfo();
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [requestingEth, setRequestingEth] = useState(false);
  const [requestingSway, setRequestingSway] = useState(false);

  const ethEnabled = useMemo(() => {
    if (!faucetInfo) return false;
    const lastClaimed = faucetInfo.ETH.lastClaimed || 0;
    return Date.now() > (Date.parse(lastClaimed) + 23.5 * 3600 * 1000);
  }, [faucetInfo]);

  const swayEnabled = useMemo(() => {
    if (!faucetInfo) return false;
    const lastClaimed = faucetInfo.SWAY.lastClaimed || 0;
    return Date.now() > (Date.parse(lastClaimed) + 23.5 * 3600 * 1000);
  }, [faucetInfo]);

  const requestEth = useCallback(async () => {
    setRequestingEth(true);

    try {
      const txHash = await api.requestTokens('ETH');
      await starknet.account.waitForTransaction(txHash);

      createAlert({
        type: 'WalletAlert',
        data: { content: 'Added 0.015 ETH to your account.' },
        duration: 5000
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
      setRequestingEth(false);
    }

    onComplete();
  }, []);

  const requestSway = useCallback(async () => {
    setRequestingSway(true);

    try {
      const txHash = await api.requestTokens('SWAY');
      await starknet.account.waitForTransaction(txHash);

      createAlert({
        type: 'WalletAlert',
        data: { content: 'Added 400,000 SWAY to your account.' },
        duration: 5000
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

    onComplete();
  }, []);

  const onComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: 'faucetInfo', refetchType: 'none' });
    queryClient.refetchQueries({ queryKey: 'faucetInfo', type: 'active' });
    queryClient.invalidateQueries({ queryKey: 'swayBalance' });
  }, [queryClient]);

  return (
    <>
      <SKUWrapper>
        <SKUInner>
          <Title>Faucet</Title>
          <Imagery>
            <SwayIcon />
          </Imagery>
          <Description>
            <p>
              ETH and SWAY are required to play Influence. Requests can be made once per day, please use responsibly.
            </p>
          </Description>
          <Main>
            <label>Available daily</label>
          </Main>
          <Button
            onClick={requestEth}
            disabled={nativeBool(!ethEnabled || requestingEth || faucetInfoLoading)}
            color={theme.colors.success}
            background={`rgba(${theme.colors.successRGB}, 0.1)`}
            style={{ width: '100%', marginBottom: 10 }}>
            <PlusIcon />
            <span>Request ETH</span>
            <ButtonExtra>
              <Ether>{0.015}</Ether>
            </ButtonExtra>
          </Button>
          <Button
            onClick={requestSway}
            disabled={nativeBool(!swayEnabled || requestingSway || faucetInfoLoading)}
            color={theme.colors.success}
            background={`rgba(${theme.colors.successRGB}, 0.1)`}
            style={{ width: '100%' }}>
            <PlusIcon />
            <span>Request SWAY</span>
            <ButtonExtra>{Number(400000).toLocaleString()}</ButtonExtra>
          </Button>
          <ClipCorner dimension={10} color={borderColor} />
        </SKUInner>
      </SKUWrapper>
    </>
  );
};

const Store = () => {
  return (
    <Wrapper>
      <Group>
        <CrewmateSKU />
      </Group>
      {!!process.env.REACT_APP_AVNU_API_URL && process.env.REACT_APP_CHAIN_ID === '0x534e5f4d41494e' && (
        <Group>
          <SwaySKU />
        </Group>
      )}
      <Group>
        <AsteroidSKU />
      </Group>
      {process.env.NODE_ENV !== '0x534e5f4d41494e' && (
        <Group>
          <FaucetSKU />
        </Group>
      )}
    </Wrapper>
  );
};

export default Store;