import styled from 'styled-components';

import SwayFaucetButton from './components/SwayFaucetButton';
import EthFaucetButton from './components/EthFaucetButton';

const FaucetSKU = ({}) => {
  return (
    <div>
      <EthFaucetButton />
      <SwayFaucetButton />
    </div>
  );
};

export default FaucetSKU;
