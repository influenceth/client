import { useStarknetkitConnectModal } from 'starknetkit';
import { useConnect } from '@starknet-react/core';

const LoginModal = () => {
  const { connect, connectors } = useConnect();
 
  const connectWallet = async() => {
    const { starknetkitConnectModal } = useStarknetkitConnectModal({
      connectors: connectors
    })
  
    const { connector } = await starknetkitConnectModal();
    await connect({ connector })
  }

  
};

export default LoginModal;