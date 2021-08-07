import { InjectedConnector } from "@web3-react/injected-connector";

export const injected = new InjectedConnector({
  supportedChainIds: [ Number(process.env.REACT_APP_CHAIN_ID) ]
});
