import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Crewmate } from '@influenceth/sdk';

import UncontrolledTextInput, { TextInputWrapper } from '~/components/TextInputUncontrolled';
import { nativeBool, safeBigInt } from '~/lib/utils';
import useCrewManager from '~/hooks/actionManagers/useCrewManager';
import useFundingFlow from '~/hooks/useFundingFlow';
import usePriceConstants from '~/hooks/usePriceConstants';
import usePriceHelper from '~/hooks/usePriceHelper';
import { PurchaseForm, PurchaseFormRows } from './components/PurchaseForm';
import SKUTitle from './components/SKUTitle';
import AdalianFlourish from '~/components/AdalianFlourish';
import CrewmateCardFramed from '~/components/CrewmateCardFramed';
import { barebonesCrewmateAppearance } from './StarterPackSKU';
import theme from '~/theme';
import SKUInputRow from './components/SKUInputRow';
import { CrewmateSwayPrice } from '~/components/SwayPrice';
import SKUHighlight from './components/SKUHighlight';
import { CrewmateCreditIcon } from '~/components/Icons';
import SKUButton from './components/SKUButton';

const Wrapper = styled.div`
  align-items: flex-end;
  display: flex;
  flex-direction: row;
  width: 100%;
  & > * {
    margin-top: 10px;
  }

  & h4 {
    color: #ccc;
    font-size: 90%;
    font-weight: normal;
    margin: 0 0 6px;
    opacity: 0.6;
  }
`;

const Description = styled.div`
  align-items: center;
  color: ${p => p.theme.colors.main};
  display: flex;
  flex-direction: row;
  font-size: 16px;
  line-height: 1.4em;
  padding-right: 20px;
  padding-bottom: 20px;
  & > div {
    color: white;
    height: 190px;
    margin-right: 15px;
    text-align: center;
    width: 145px;
  }
  & > p {
    flex: 1;
    margin: 0 0 1em;
  }
`;

const CrewmatePurchaseForm = styled(PurchaseForm)`
  & > h3 {
    padding-left: 100px;
  }
`;

const FlairCard = styled.div`
  left: 10px;
  position: absolute;
  top: 10px;
  z-index: 1;
  filter: drop-shadow(2px 2px 6px black);
`;

const Body = styled.div`
  padding: 10px;
`;

const maxCrewmatesAtOnce = 25;

const cleanseCrewmates = (x) => {
  if (x === '') return '';
  return Math.abs(Math.min(parseInt(x) || 0, maxCrewmatesAtOnce));
};

const CrewmateSKU = () => {
  const { purchaseCredits, getPendingCreditPurchase } = useCrewManager();
  const { fundingPrompt, onVerifyFunds } = useFundingFlow();
  const { data: priceConstants } = usePriceConstants();
  const priceHelper = usePriceHelper();

  const [quantity, setQuantity] = useState(1);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    setIsPurchasing(!!getPendingCreditPurchase());
  }, [getPendingCreditPurchase]);

  const totalPrice = useMemo(() => {
    const cleanQuantity = cleanseCrewmates(quantity) || 1;
    return priceHelper.from(
      safeBigInt(cleanQuantity) * priceConstants?.ADALIAN_PURCHASE_PRICE,
      priceConstants?.ADALIAN_PURCHASE_TOKEN
    );
  }, [quantity, priceConstants, priceHelper]);

  const onPurchase = useCallback(async () => {
    setIsPurchasing(true);
    try {
      await purchaseCredits(cleanseCrewmates(quantity) || 1);
    } catch (e) {
      console.warn(e);
    }
    setIsPurchasing(false);
  }, [quantity]);

  const onClick = useCallback(() => {
    onVerifyFunds(
      totalPrice,
      onPurchase
    )
  }, [onPurchase, onVerifyFunds, totalPrice]);

  return (
    <Wrapper>
      <div style={{ paddingRight: 20 }}>
        <SKUTitle>Buy Crewmates</SKUTitle>
        <Description>
          <div>
            <AdalianFlourish filter="brightness(125%) saturate(135%)" />
          </div>
          <p>
            Crewmates are the literal heart and soul of Adalia. They perform all in-game
            tasks and form your crew. A crew is composed of up to 5 crewmates.
            <br/><br/>
            Crewmate credits are turned into crewmates after completing their backstory
            and earning traits at any Habitat in the belt.
          </p>
        </Description>
      </div>
      <CrewmatePurchaseForm>
        <h3>Additional Crewmates</h3>

        <FlairCard>
          <CrewmateCardFramed
            noArrow
            CrewmateCardProps={{
              gradientRGB: theme.colors.mainRGB,
              useExplicitAppearance: true,
            }}
            crewmate={{
              Crewmate: {
                appearance: barebonesCrewmateAppearance,
                class: 0,
                coll: Crewmate.COLLECTION_IDS.ADALIAN,
              }
            }}
            width={85} />
        </FlairCard>

        <div style={{ padding: '10px 0 15px 100px' }}>
          <PurchaseFormRows>
            <div>
              <label>Collection</label>
              <span>Adalian</span>
            </div>
            <div>
              <label>Price</label>
              <span>
                <CrewmateSwayPrice /> Each
              </span>
            </div>
          </PurchaseFormRows>
        </div>

        <Body>
          <h4>Quantity</h4>
          <SKUInputRow>
            <TextInputWrapper rightLabel="CREWMATE CREDITS">
              <UncontrolledTextInput
                disabled={nativeBool(isPurchasing)}
                max={maxCrewmatesAtOnce}
                min={0}
                onChange={(e) => setQuantity(cleanseCrewmates(e.currentTarget.value))}
                step={1}
                style={{ height: 28 }}
                type="number"
                value={quantity} />
            </TextInputWrapper>
          </SKUInputRow>

          <div style={{ margin: '20px 0 15px' }}>
            <h4>Receive</h4>
            <SKUHighlight>
              <CrewmateCreditIcon />
              <span style={{ marginLeft: 8 }}>{quantity} Crewmate{quantity === 1 ? '' : 's'}</span>
            </SKUHighlight>
          </div>

          <SKUButton
            isPurchasing={isPurchasing}
            isSway
            onClick={onClick}
            usdcPrice={totalPrice.usdcValue}
            style={{ width: '100%' }}
          />
        </Body>
      </CrewmatePurchaseForm>
      {fundingPrompt}
    </Wrapper>
  );
};

export default CrewmateSKU;