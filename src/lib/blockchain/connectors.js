import { InjectedConnector } from '@web3-react/injected-connector';
import { WalletConnectConnector } from '@web3-react/walletconnect-connector'

export const injected = new InjectedConnector({
  supportedChainIds: [ Number(process.env.REACT_APP_CHAIN_ID) ]
});

export const walletconnect = new WalletConnectConnector({
  rpc: { 4: 'https://rinkeby.infura.io/v3/df039ca14ccd47d7bc89c7dd7d1d6b98' },
  infuraId: process.env.REACT_APP_INFURA_ID,
  qrcode: true
});
