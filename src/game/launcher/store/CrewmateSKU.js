import { useEffect, useState } from 'react';
import styled from 'styled-components';

import UncontrolledTextInput from '~/components/TextInputUncontrolled';
import { safeBigInt } from '~/lib/utils';
import useCrewManager from '~/hooks/actionManagers/useCrewManager';
import usePriceConstants from '~/hooks/usePriceConstants';
import usePriceHelper from '~/hooks/usePriceHelper';
import UserPrice from '~/components/UserPrice';
import { PurchaseForm, PurchaseFormRows } from './components/PurchaseForm';

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

const maxCrewmatesAtOnce = 25;

const cleanseCrewmates = (x) => {
  if (x === '') return '';
  return Math.abs(Math.min(parseInt(x) || 0, maxCrewmatesAtOnce));
};

const noop = () => {};

const CrewmateSKU = ({ onUpdatePurchase = noop, onPurchasing = noop }) => {
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
      safeBigInt(cleanQuantity) * priceConstants?.ADALIAN_PURCHASE_PRICE,
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

export default CrewmateSKU;