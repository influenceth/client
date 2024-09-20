import styled from 'styled-components';

import SwayFaucetButton from './components/SwayFaucetButton';
import EthFaucetButton from './components/EthFaucetButton';
import { PurchaseForm, PurchaseFormRows } from './components/PurchaseForm';

const Wrapper = styled.div`
  align-self: center;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  width: 100%;

  & p {
    color: white;
    font-size: 15px;
    font-style: italic;
    margin: 0;
    opacity: 0.3;
    padding: 10px 5px;
    text-align: center;
  }
`;

const FaucetSKU = () => {
  return (
    <Wrapper>
      <PurchaseForm>
        <h3>ETH Faucet</h3>
        <p>To facilitate use of our testing environment, take advantage of our Sepolia ETH Faucet.</p>
        <PurchaseFormRows>
          <div>
            <label>Use Limit</label>
            <span>Once Daily</span>
          </div>
        </PurchaseFormRows>
        <EthFaucetButton noLabel />
      </PurchaseForm>

      <PurchaseForm>
        <h3>Sway Faucet</h3>
        <p>To facilitate use of our testing environment, take advantage of our Sepolia SWAY Faucet.</p>
        <PurchaseFormRows>
          <div>
            <label>Use Limit</label>
            <span>Once Daily</span>
          </div>
        </PurchaseFormRows>
        <SwayFaucetButton noLabel />
      </PurchaseForm>
    </Wrapper>
  );
};

export default FaucetSKU;
