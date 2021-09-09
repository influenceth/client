import { InjectedConnector } from '@web3-react/injected-connector';
import { WalletConnectConnector } from '@web3-react/walletconnect-connector'

export const injected = new InjectedConnector({
  supportedChainIds: [ Number(process.env.REACT_APP_CHAIN_ID) ]
});

export const walletconnect = new WalletConnectConnector({
  rpc: {
    1: `https://mainnet.infura.io/v3/${process.env.REACT_APP_INFURA_ID}`,
    4: `https://rinkeby.infura.io/v3/${process.env.REACT_APP_INFURA_ID}`
  },
  infuraId: process.env.REACT_APP_INFURA_ID,
  qrcode: true
});
