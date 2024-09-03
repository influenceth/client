import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { createPortal } from 'react-dom';
import { PropagateLoader as Loader } from 'react-spinners';
import { RampInstantSDK } from '@ramp-network/ramp-instant-sdk';

import Button from '~/components/ButtonAlt';
import { ChevronRightIcon, CloseIcon, LinkIcon, WalletIcon } from '~/components/Icons';
import Details from '~/components/DetailsV2';
import useSession from '~/hooks/useSession';
import BrightButton from '~/components/BrightButton';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import useWalletPurchasableBalances from '~/hooks/useWalletPurchasableBalances';
import UserPrice from '~/components/UserPrice';
import { TOKEN, TOKEN_FORMAT, TOKEN_FORMATTER } from '~/lib/priceUtils';
import usePriceHelper from '~/hooks/usePriceHelper';
import useStore from '~/hooks/useStore';
import EthFaucetButton from './EthFaucetButton';
import { areChainsEqual, fireTrackingEvent, resolveChainId, safeBigInt } from '~/lib/utils';

const layerSwapChains = {
  SN_MAIN: { ethereum: 'ETHEREUM_MAINNET', starknet: 'STARKNET_MAINNET' },
  SN_SEPOLIA: { ethereum: 'ETHEREUM_SEPOLIA', starknet: 'STARKNET_SEPOLIA' }
};

const FundingBody = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  margin: 0 30px;
  padding: 5px 0;
  width: 450px;
  h3 {
    align-items: center;
    color: ${p => p.theme.colors.warning};
    display: flex;
    font-size: 16px;
    font-weight: normal;
    & > svg {
      font-size: 30px;
      margin-right: 16px;
    }
  }
`;

const FundingButtons = styled.div`
  padding: 0px 0 20px;
  width: 100%;
  & button {
    margin-bottom: 10px;
    padding: 15px 10px;
    text-transform: none;
    width: 100%;
    & > div {
      align-items: center;
      display: flex;
      justify-content: center;
      & > span {
        flex: 1;
        text-align: left;
      }
    }
  }
  & h4 {
    align-items: flex-end;
    font-weight: normal;
    margin: 0 0 10px;
    text-transform: uppercase;

    display: flex;
    flex-direction: row;
    & > span {
      flex: 1;
    }
    & > label {
      opacity: 0.5;
      font-size: 13px;
      text-transform: none;
      &:hover {
        opacity: 0.8;
      }
    }
  }
`;

const Disclaimer = styled.div`
  color: ${p => p.theme.colors.main};
  font-size: 12px;
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

const Receipt = styled.div`
  margin-bottom: 30px;
  width: 100%;
  & > div {
    align-items: center;
    display: flex;
    flex-direction: row;
    height: 30px;
    & > label {
      opacity: 0.5;
      flex: 1;
    }
    &:last-child {
      border-top: 1px solid #333;
      color: ${p => p.theme.colors.warning};
      margin-top: 4px;
      height: 38px;
      & > span {
        // color: ${p => p.theme.colors.warning};
        font-weight: bold;
      }
    }
  }
`;

const ButtonRow = styled.div`
  display: flex;
  flex-direction: row;
  & > button {
    margin-right: 10px;
    &:last-child {
      margin-right: 0;
    }
  }
`;

const Collapsible = styled.div`
  height: 26px;
  overflow: visible hidden;
  transition: height 150ms ease;

  & > h4 {
    border-bottom: 1px solid #333;
    padding-bottom: 6px;

    cursor: ${p => p.theme.cursors.active};
    opacity: 0.5;
    transition: opacity 150ms ease;
    & > svg {
      transition: transform 150ms ease;
    }
  }
  & > ${ButtonRow} {
    padding: 0 3px;
  }

  &:hover {
    height: 92px;
    & > h4 {
      border-bottom-color: transparent;
      opacity: 1;
      & > svg {
        transform: rotate(90deg);
      }
    }
  }
`;

const GiantIcon = styled.div`
  align-items: center;
  background: rgba(${p => p.theme.colors.mainRGB}, 0.2);
  border-radius: 60px;
  color: ${p => p.theme.colors.main};
  display: flex;
  font-size: 65px;
  height: 115px;
  justify-content: center;
  margin: 40px 0 10px;
  width: 115px;
`;
const WaitingWrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  padding-top: 10px;
  width: 360px;

  & > div {
    align-items: center;
    display: flex;
    flex-direction: column;
    text-align: center;
    & > h4 {
      margin: 20px 0 0;
    }
    & > small {
      opacity: 0.5;
    }
    & > button {
      margin-top: 20px;
    }
  }

  & > footer {
    align-items: center;
    border-top: 1px solid #333;
    display: flex;
    flex-direction: row;
    flex: 0 0 60px;
    justify-content: center;
    margin-top: 40px;
    width: 100%;
    & > div {
      align-items: center;
      background: #333;
      border-radius: 6px;
      display: flex;
      height: 36px;
      justify-content: center;
      width: 225px;
      & > * {
        margin-top: -10px;
        margin-left: -10px;
        opacity: 0.25;
      }
    }
  }
`;

const RampWrapper = styled.div`
  background: linear-gradient(225deg, black, rgba(${p => p.theme.colors.mainRGB}, 0.3));
  ${p => !p.display && `
    height: 0;
    overflow: hidden;
    width: 0;
  `}
  & > div {
    height: 600px;
    width: 900px;
  }
`;

const RAMP_PREPEND = process.env.NODE_ENV === 'production' ? '' : 'demo.';
const RAMP_PURCHASE_STATUS = {
  INITIALIZED: {
    statusText: 'The purchase has been initialized.',
    isSuccess: false,
    isError: true
  },
  PAYMENT_STARTED: {
    statusText: 'Automated payment has been initiated.',
    isSuccess: false,
    isError: false
  },
  PAYMENT_IN_PROGRESS: {
    statusText: 'Payment process has been completed.',
    isSuccess: false,
    isError: false
  },
  PAYMENT_FAILED: {
    statusText: 'The payment was cancelled, rejected, or otherwise failed.',
    isSuccess: false,
    isError: true
  },
  PAYMENT_EXECUTED: {
    statusText: 'Payment approved, waiting for funds to be received.',
    isSuccess: false,
    isError: false
  },
  FIAT_SENT: {
    statusText: 'Outgoing bank transfer has been confirmed.',
    isSuccess: false,
    isError: false
  },
  FIAT_RECEIVED: {
    statusText: 'Payment confirmed, final checks before crypto transfer.',
    isSuccess: false,
    isError: false
  },
  RELEASING: {
    statusText: 'Funds received, initiating crypto transfer...',
    isSuccess: false,
    isError: false
  },
  RELEASED: {
    statusText: 'Waiting for funds to be received by user\'s wallet...',
    isSuccess: true,
    isError: false
  },
  EXPIRED: {
    statusText: 'Time to pay for the purchase was exceeded. Please try again, making sure to follow all prompts.',
    isSuccess: false,
    isError: true
  },
  CANCELLED: {
    statusText: 'The purchase was been cancelled.',
    isSuccess: false,
    isError: true
  }
};

export const FundingFlow = ({ totalPrice, onClose, onFunded }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const { accountAddress, chainId, walletId } = useSession();
  const priceHelper = usePriceHelper();
  const { data: wallet, refetch: refetchBalances } = useWalletPurchasableBalances();
  const preferredUiCurrency = useStore(s => s.getPreferredUiCurrency());

  const [hoveredRampButton, setHoveredRampButton] = useState(false);
  const [ramping, setRamping] = useState();
  const [waiting, setWaiting] = useState();

  const startingBalance = useRef();

  const [debug, setDebug] = useState(0);

  // TODO: technically could wait to start polling until page is focused again
  useEffect(() => {
    // if (waiting && !debug) {
    //   setTimeout(() => {
    //     console.log('hack', startingBalance.current, wallet.tokenBalances); // tokenBalances
    //     startingBalance.current[TOKEN.ETH] -= safeBigInt(1e14);
    //     setDebug(1);
    //   }, 5000);
    // }
    if (waiting && !!wallet) {
      if (!startingBalance.current) startingBalance.current = { ...wallet.tokenBalances };
      const i = setInterval(() => {
        refetchBalances();
        // if (debug === 1) setDebug(2); // TODO: deprecate
      }, 10e3);
      return () => {
        if (i) clearInterval(i);
      };
    }
  }, [waiting, !!wallet, debug]);

  useEffect(() => {
    // if there is an actual increase in currency of a token (i.e. not just an
    // increase in value b/c we don't want a trigger on exchange rate changes)
    if (waiting && startingBalance.current) {
      const increaseToken = Object.keys(startingBalance.current).find((token) => {
        return (wallet.tokenBalances[token] > startingBalance.current[token])
      });
      if (increaseToken) {
        const increaseAmount = wallet.tokenBalances[increaseToken] - startingBalance.current[increaseToken];

        // alert
        createAlert({
          type: 'GenericAlert',
          data: { content: <>{TOKEN_FORMATTER[increaseToken](safeBigInt(increaseAmount), TOKEN_FORMAT.VERBOSE)} of funds received.</> },
          duration: 5e3
        });

        // reset state
        setWaiting(false);
        startingBalance.current = null;

        // callbacks
        // if there are now sufficient funds (or there was no target price), call onFunded && onClose
        // else (there is an unmet totalPrice), keep flow open (but will be back at beginning)
        if (!totalPrice || wallet.combinedBalance.usdcValue > totalPrice.usdcValue) {
          // console.log('FUNDING FLOW', { wallet, combinedBalance: wallet?.combinedBalance })
          if (onFunded) onFunded();
          if (onClose) onClose();
        }
      }
    }
  }, [debug, waiting, wallet?.tokenBalances])

  const [walletBalance, fundsNeeded] = useMemo(
    () => {
      if (!wallet) return [];
      const balance = wallet.combinedBalance;
      let needed;
      if (totalPrice) {
        needed = totalPrice.clone();
        needed.usdcValue -= balance.usdcValue;
      }
      return [balance, needed];
    },
    [priceHelper, totalPrice, wallet]
  );

  const suggestedAmounts = useMemo(() => {
    if (!fundsNeeded) return [10e6, 25e6, 50e6];

    const needed = Math.ceil(fundsNeeded.to(TOKEN.USDC));
    if (needed < 20e6) return [needed, 25e6, 50e6];
    if (needed < 40e6) return [needed, 50e6, 100e6];
    if (needed < 80e6) return [needed, 100e6, 250e6];
    if (needed < 200e6) return [needed, 250e6, 500e6];
    return [needed]
  }, [fundsNeeded]);

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

  const [rampPurchase, setRampPurchase] = useState();
  const checkRampPurchase = useCallback(async () => {
    try {
      const response = await fetch(
        `https://api.${RAMP_PREPEND}ramp.network/api/host-api/purchase/${rampPurchase.id}?secret=${rampPurchase.purchaseViewToken}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      if (response.ok) {
        const updatePurchaseObject = await response.json();
        setRampPurchase(updatePurchaseObject);

        // stop checking if terminal status
        const status = RAMP_PURCHASE_STATUS[updatePurchaseObject.status];
        if (status.isError || status.isSuccess) {
          return;
        }
      } else {
        console.error('Response not ok:', response);
      }
    } catch (error) {
      console.error('Error fetching purchase info:', error);
    }
    setTimeout(() => {
      checkRampPurchase();
    }, 5000);
  }, []);
  
  const onClickCC = useCallback((amount) => () => {
    fireTrackingEvent('funding_start', { externalId: accountAddress });
    setRamping(true);
    setRampPurchase();

    setTimeout(() => {
      const embeddedRamp = new RampInstantSDK({
        hostAppName: 'Influence',
        hostLogoUrl: window.location.origin + '/maskable-logo-192x192.png',
        hostApiKey: process.env.REACT_APP_RAMP_API_KEY,
        userAddress: accountAddress,
        swapAsset: 'STARKNET_ETH',  // TODO: STARKNET_USDC once enabled
        fiatCurrency: 'USD',
        fiatValue: Math.ceil(amount / 1e6),
        url: process.env.NODE_ENV === 'production' ? undefined : `https://app.${RAMP_PREPEND}ramp.network`,

        variant: 'embedded-desktop',
        containerNode: document.getElementById('ramp-container')
      })
      embeddedRamp.on('PURCHASE_CREATED', (e) => {
        console.log('PURCHASE_CREATED', e);
        try {
          setRampPurchase(e.payload.purchase);
        } catch (e) {
          console.warn('purchase_created event missing payload!', e);
        }
        setTimeout(() => {
          setRamping(false);
          setWaiting(true);
        }, 2000);
      });
      embeddedRamp.show();
    }, 100);
  }, [accountAddress]);

  const rampTxUrl = useMemo(() => {
    if (!rampPurchase) return;
    return `https://transactions.${RAMP_PREPEND}ramp.network/#/details/${rampPurchase.id}?secret=${rampPurchase.purchaseViewToken}`;
  }, [rampPurchase]);

  useEffect(() => {
    if (rampTxUrl) window.open(rampTxUrl, '_blank');
  }, [rampTxUrl]);

  const [layerswapUrl, setLayerswapUrl] = useState();
  const onClickLayerswap = useCallback(() => {
    let amount;
    if (fundsNeeded) {
      const swapAmount = fundsNeeded.clone();
      swapAmount.usdcValue *= 1.1;
      amount = Math.ceil(swapAmount.to(TOKEN.USDC));
    }

    setLayerswapUrl(
      `https://layerswap.io/app/?${
        new URLSearchParams({
          clientId: process.env.REACT_APP_LAYERSWAP_CLIENT_ID,
          amount,
          to: layerSwapChains[resolveChainId(chainId)]?.starknet,
          toAsset: 'USDC',
          destAddress: accountAddress,
          lockTo: true,
          lockToAsset: true,
          lockAddress: true,
          actionButtonText: 'Fund Account'
        }).toString()
      }`
    );
  }, [accountAddress, fundsNeeded]);

  const onClickStarkgate = useCallback(() => {
    const url = `https://${areChainsEqual('SN_SEPOLIA', chainId) ? 'sepolia.' : ''}starkgate.starknet.io/`;

    window.open(url, '_blank');
    setWaiting(true);
  }, []);

  const onFaucetError = useCallback(() => {
    createAlert({
      type: 'GenericAlert',
      data: { content: 'Faucet request failed, please try again later.' },
      level: 'warning',
      duration: 5000
    });
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (RAMP_PURCHASE_STATUS[rampPurchase?.status]?.isError) {
      // fire error
      fireTrackingEvent('funding_error', { externalId: accountAddress, status: rampPurchase?.status });

      // alert user
      createAlert({
        type: 'GenericAlert',
        data: { content: <>RAMP PAYMENT ERROR: "{RAMP_PURCHASE_STATUS[rampPurchase?.status].statusText}"<br/><br/>Click for more information.</> },
        level: 'warning',
        onRemoval: function () {
          if (rampTxUrl) window.open(rampTxUrl, '_blank');
        }
      });

      // clear purchase
      setRampPurchase();
      onClose();
    }
  }, [rampPurchase?.status, rampTxUrl])
  

  return createPortal(
    (
      <Details
        title={fundsNeeded ? 'Insufficient Funds' : 'Add Funds'}
        onClose={onClose}
        modalMode
        style={{ zIndex: 9000 }}>
        {!waiting && !ramping && !layerswapUrl && (
          <FundingBody>
            {fundsNeeded && (
              <Receipt>
                <div>
                  <label>Available Balance {/* TODO: based on settings + gas buffer (hide for Web2 / or use tooltip for both) */}(USDC + ETH)</label>
                  <span>{walletBalance.to(preferredUiCurrency, true)}</span>
                </div>
                <div>
                  <label>Purchase Total</label>
                  <span>{totalPrice.to(preferredUiCurrency, true)}</span>
                </div>
                <div>
                  <label>
                    Funding Required
                  </label>
                  <span>{fundsNeeded.to(preferredUiCurrency, true)}</span>
                </div>
              </Receipt>
            )}

            {walletId === 'argentWebWallet' && (
              <FundingButtons>

                {process.env.REACT_APP_CHAIN_ID === '0x534e5f5345504f4c4941' && (
                  <>
                    <h4>
                      <span>Request Free ETH</span>
                    </h4>
                    <ButtonRow style={{ marginBottom: 10 }}>
                      <EthFaucetButton
                        onError={onFaucetError}
                        onProcessing={(started) => setWaiting(!!started)} />
                    </ButtonRow>
                  </>
                )}

                <h4>
                  <span>Recharge Wallet</span>
                  <label onMouseEnter={onRampHover(true)} onMouseLeave={onRampHover(false)}>Disclaimer</label>
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
                </h4>
                <ButtonRow>
                  {suggestedAmounts.map((usdc, i) => (
                    <BrightButton key={usdc} onClick={onClickCC(usdc)}>
                      + <UserPrice price={usdc} priceToken={TOKEN.USDC} format={(fundsNeeded && i === 0) ? true : TOKEN_FORMAT.SHORT} />
                    </BrightButton>
                  ))}
                </ButtonRow>

                {/* TODO: start off collapsed */}
                <Collapsible style={{ marginTop: 10 }}>
                  <h4><span>Advanced Options</span><ChevronRightIcon /></h4>
                  <ButtonRow>
                    <BrightButton subtle onClick={onClickStarkgate}>
                      <span>Bridge from L1</span>
                      <ChevronRightIcon />
                    </BrightButton>
                    <BrightButton subtle onClick={onClickLayerswap}>
                      <span>Swap on L2</span>
                      <ChevronRightIcon />
                    </BrightButton>
                  </ButtonRow>
                </Collapsible>
              </FundingButtons>
            )}

            {walletId !== 'argentWebWallet' && (
              <FundingButtons>
                {process.env.REACT_APP_CHAIN_ID === '0x534e5f5345504f4c4941' && (
                  <EthFaucetButton
                    onError={onFaucetError}
                    onProcessing={(started) => setWaiting(!!started)} />
                )}

                <BrightButton onClick={onClickStarkgate}>
                  <span>Bridge Funds from L1</span>
                  <ChevronRightIcon />
                </BrightButton>

                <ButtonRow>
                  <BrightButton subtle onClick={onClickLayerswap}>
                    <span>Swap L2 Funds</span> <ChevronRightIcon />
                  </BrightButton>
                  <BrightButton subtle onClick={onClickCC(suggestedAmounts[0])}>
                    <span>Purchase L2 Funds</span> <ChevronRightIcon />
                  </BrightButton>
                </ButtonRow>
              </FundingButtons>
            )}
          </FundingBody>
        )}
        {ramping && (
          <>
            <RampWrapper display>
              <div id="ramp-container" />
            </RampWrapper>
            <div style={{ padding: '8px 0' }}>
              <Button onClick={() => setRamping()}>Back</Button>
            </div>
          </>
        )}
        {layerswapUrl && (
          <>
            <iframe src={layerswapUrl} style={{ border: 0, width: '450px', height: '600px' }} />
            <div style={{ display: 'flex', flexDirection: 'row', padding: '10px 0' }}>
              <Button onClick={() => setLayerswapUrl()}>Cancel</Button>
              <div style={{ flex: 1 }} />
              <Button onClick={() => { setLayerswapUrl(); setWaiting(true); }}>Finished</Button>
            </div>
          </>
        )}
        {waiting && (
          <WaitingWrapper>
            <div>
              <GiantIcon>
                <WalletIcon />
              </GiantIcon>
              {rampPurchase && !RAMP_PURCHASE_STATUS[rampPurchase.status].isSuccess
                ? (
                  <>
                    <h4>{RAMP_PURCHASE_STATUS[rampPurchase.status].statusText}</h4>
                    {!RAMP_PURCHASE_STATUS[rampPurchase.status].isError && <small>(taking too long?)</small>}
                    <Button size="small" onClick={() => window.open(rampTxUrl, '_blank')}>
                      <LinkIcon /> <span>View Transaction</span>
                    </Button>
                  </>
                )
                : (
                  <>
                    <h4>Waiting for funds to be received...</h4>
                    <small>(this may take several moments)</small>
                    <Button size="small" onClick={() => setWaiting(false)}>
                      <CloseIcon /> <span>Cancel</span>
                    </Button>
                  </>
                )}
            </div>
            <footer>
              <div>
                <Loader color="white" size="12px" />
              </div>
            </footer>
          </WaitingWrapper>
        )}
      </Details>
    ),
    document.body
  );
};

export default FundingFlow;