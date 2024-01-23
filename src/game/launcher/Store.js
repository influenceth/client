import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { utils as ethersUtils } from 'ethers';
import { createPortal } from 'react-dom';
import { uint256 } from 'starknet';

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
import { ChevronRightIcon, PlusIcon, WarningOutlineIcon, SwayIcon } from '~/components/Icons';
import Details from '~/components/DetailsV2';
import useAuth from '~/hooks/useAuth';
import useInterval from '~/hooks/useInterval';
import BrightButton from '~/components/BrightButton';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';

const borderColor = `rgba(${theme.colors.mainRGB}, 0.5)`;

const Wrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 100%;
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
  min-height: 525px;
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
  & > img {
    height: 200px;
  }

  & > svg.icon {
    height: 200px;
    width: auto;
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
    text-align: right;
    width: 75px;
  }
  & > label {
    padding-left: 10px;
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
  const { account, walletContext: { starknet } } = useAuth();
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
    const url = `https://www.layerswap.io/app/?from=${fromChain}&to=${toChain}&asset=ETH&destAddress=${account}
      &lockAddress=true&amount=${targetAmount}&actionButtonText=Fund%20Account`;

    window.open(url, '_blank');
  }, [starknet?.chainId, account, targetAmount]);

  const selectStripe = useCallback(() => {
    const toChain = layerSwapChains[starknet?.chainId]?.starknet;
    const url = `https://www.layerswap.io/app/?from=STRIPE&to=${toChain}&asset=ETH&destAddress=${account}
      &lockAddress=true&amount=${targetAmount}&actionButtonText=Fund%20Account`;

    window.open(url, '_blank');
  }, [starknet?.chainId, account, targetAmount]);

  const selectRamp = useCallback(() => {
    const logoUrl = window.location.origin + '/maskable-logo-192x192.png';
    // TODO: url params are confusing/not working here `&swapAsset=ETH&swapAmount=${targetAmount}`
    const url = `https://app.${process.env.NODE_ENV === 'production' ? '' : 'demo.'}ramp.network
      ?hostApiKey=${process.env.REACT_APP_RAMP_API_KEY}&hostAppName=Influence&hostLogoUrl=${logoUrl}
      &userAddress=${account}&defaultAsset=STARKNET_ETH`;

    window.open(url, '_blank');
  }, [starknet?.chainId, account, targetAmount]);

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
          <Button subtle onClick={onClose}>Back</Button>
        </FundingFooter>
      </Details>
    ),
    document.body
  );
};

export const CrewmateSKU = () => {
  const { walletContext: { starknet } } = useAuth();
  const { purchaseCredits, getPendingCreditPurchase } = useCrewManager();
  const { data: priceConstants } = usePriceConstants();

  const [ethBalance, setEthBalance] = useState(null);
  const [tally, setTally] = useState(5);

  const totalCost = useMemo(() => {
    return BigInt(tally) * BigInt(priceConstants?.ADALIAN_PRICE_ETH || 0);
  }, [tally]);

  const [funding, setFunding] = useState(false);
  const [polling, setPolling] = useState(false);

  const onFundWallet = useCallback(() => {
    setFunding(true);
  }, []);

  const onSelectFundingOption = useCallback(() => {
    setFunding(false);
    setPolling(true);
  });

  const onPurchaseCrewmates = useCallback(() => {
    purchaseCredits(tally);
  }, [tally]);

  const isPendingPurchase = useMemo(() => {
    return !!getPendingCreditPurchase();
  }, [getPendingCreditPurchase]);

  const updateEthBalance = useCallback(async () => {
    if (!starknet?.account?.provider) return;
    try {
      const balance = await starknet.account.provider.callContract({
        contractAddress: process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
        entrypoint: 'balanceOf',
        calldata: [starknet.account.address]
      });
      setEthBalance(
        uint256.uint256ToBN({ low: balance.result[0], high: balance.result[1] })
      );
    } catch (e) {
      console.warn(e);
    }
  }, [starknet]);
  useEffect(updateEthBalance, []);

  const isInsufficientBalance = useMemo(() => {
    if (ethBalance === null) return false;
    return totalCost > ethBalance;
  }, [ethBalance, totalCost]);

  // TODO: would it make more sense to just check on each new block?
  useInterval(() => {
    if (polling && isInsufficientBalance) updateEthBalance();
  }, 5e3);

  return (
    <>
      <SKUWrapper>
        <SKUInner>
          <Title>Crewmates</Title>
          <Imagery>
            <img src={AdaliansImages} />
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
                subtle
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
                subtle
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
          targetAmount={Math.max(ethersUtils.formatEther(totalCost || 0n) || 0, 0.01)}
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

  useEffect(updateSale, []);

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
  }, [filters, updateFilters, zoomStatus]);

  return (
    <SKUWrapper>
      <SKUInner>
        <Title>Asteroids</Title>
        <Imagery>
          <img src={AsteroidsImage} />
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
          subtle
          style={{ width: '100%' }}>
          Browse Available Asteroids
        </Button>
        <ClipCorner dimension={10} color={borderColor} />
      </SKUInner>
    </SKUWrapper>
  );
};

export const SwaySKU = () => {
  const swayPerEth = 22000000;

  const { walletContext: { starknet } } = useAuth();

  const [ethBalance, setEthBalance] = useState(null);
  const [tally, setTally] = useState(100000);

  const totalCost = useMemo(() => {
    const fees = 1000000000000000n; // 0.001 ETH
    return BigInt(Math.round(tally * 1e18 / swayPerEth)) + fees;
  }, [tally, swayPerEth]);

  const [funding, setFunding] = useState(false);
  const [polling, setPolling] = useState(false);

  const onFundWallet = useCallback(() => {
    setFunding(true);
  }, []);

  const onSelectFundingOption = useCallback(() => {
    setFunding(false);
    setPolling(true);
  });

  const updateEthBalance = useCallback(async () => {
    if (!starknet?.account?.provider) return;
    try {
      const balance = await starknet.account.provider.callContract({
        contractAddress: process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
        entrypoint: 'balanceOf',
        calldata: [starknet.account.address]
      });
      setEthBalance(
        uint256.uint256ToBN({ low: balance.result[0], high: balance.result[1] })
      );
    } catch (e) {
      console.warn(e);
    }
  }, [starknet]);
  useEffect(updateEthBalance, []);

  const isInsufficientBalance = useMemo(() => {
    if (ethBalance === null) return false;
    return totalCost > ethBalance;
  }, [ethBalance, totalCost]);

  // TODO: would it make more sense to just check on each new block?
  useInterval(() => {
    if (polling && isInsufficientBalance) updateEthBalance();
  }, 5e3);

  const isPendingPurchase = false;

  const swayFormatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    minimumSignificantDigits: 3
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
            SWAY (Standard Weighted Adalian Yield) is the basic economic unit of exchange in Adalia.
          </Description>
          <Main>
              <UncontrolledTextInput
                min={1}
                onChange={(e) => setTally(Math.floor(e.currentTarget.value))}
                value={safeValue(tally)}
                step={1}
                style={{ width: '150px' }}
                type="number" />

              <label>SWAY</label>
          </Main>
          <Price>
              <label></label>
              <span>{swayFormatter.format(swayPerEth)}</span>
              <label>SWAY / Eth</label>
          </Price>
          {(isPendingPurchase || totalCost === 0 || !isInsufficientBalance)
            ? (
              <Button
                loading={reactBool(isPendingPurchase)}
                disabled={nativeBool(isPendingPurchase || totalCost === 0)}
                isTransaction
                onClick={() => console.log('TODO: purchase SWAY')}
                subtle
                style={{ width: '100%' }}>
                Purchase
                  <ButtonExtra>
                    {/* TODO: should this update price before "approve"? what about asteroids? */}
                    <Ether>{formatters.ethPrice(totalCost, 4)}</Ether>
                  </ButtonExtra>
              </Button>
            )
            : (
              <Button
                onClick={onFundWallet}
                color={theme.colors.success}
                background={`rgba(${theme.colors.successRGB}, 0.1)`}
                subtle
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
          targetAmount={Math.max(ethersUtils.formatEther(totalCost || 0n) || 0, 0.01)}
          onClose={() => setFunding(false)}
          onSelect={onSelectFundingOption}
        />
      )}
    </>
  );
};

const Store = () => {
  return (
    <Wrapper>
      <Group>
        <CrewmateSKU />
      </Group>
      <Group>
        <SwaySKU />
      </Group>
      <Group>
        <AsteroidSKU />
      </Group>
    </Wrapper>
  );
};

export default Store;