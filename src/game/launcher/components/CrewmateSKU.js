import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { formatEther } from 'ethers';

import CrewmatesImage from '~/assets/images/sales/crewmates.png';
import Button from '~/components/ButtonAlt';
import ClipCorner from '~/components/ClipCorner';
import Ether from '~/components/Ether';
import { PlusIcon } from '~/components/Icons';
import UncontrolledTextInput, { safeValue } from '~/components/TextInputUncontrolled';
import useCrewManager from '~/hooks/actionManagers/useCrewManager';
import { useEthBalance } from '~/hooks/useWalletBalance';
import useInterval from '~/hooks/useInterval';
import usePriceConstants from '~/hooks/usePriceConstants';
import formatters from '~/lib/formatters';
import { nativeBool, reactBool } from '~/lib/utils';
import theme from '~/theme';
import { FundingDialog } from './FundingDialog';

const borderColor = `rgba(${theme.colors.mainRGB}, 0.5)`;

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

export const CrewmateSKU = () => {
  const { purchaseCredits, getPendingCreditPurchase } = useCrewManager();
  const { data: priceConstants } = usePriceConstants();
  const { data: weiBalance, refetch: refetchEth } = useEthBalance();

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
    if (weiBalance === null) return false;
    return totalCost > weiBalance;
  }, [weiBalance, totalCost]);

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
            <img src={CrewmatesImage} alt="Adalian Crewmate Cards" />
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