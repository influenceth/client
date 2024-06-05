import { EthIcon, SwayIcon } from '~/components/Icons';

export const TOKEN = {
  ETH: process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
  SWAY: process.env.REACT_APP_STARKNET_SWAY_TOKEN,
  USDC: process.env.REACT_APP_USDC_TOKEN_ADDRESS,
}

export const TOKEN_SCALE = {
  [TOKEN.ETH]: 1e18,
  [TOKEN.SWAY]: 1e6,
  [TOKEN.USDC]: 1e6
};

export const TOKEN_FORMAT = {
  SHORT: 'SHORT',
  STANDARD: 'STANDARD',
  UNLABELED: 'UNLABELED',
  FULL: 'FULL',
}

export const TOKEN_FORMATTER = {
  [TOKEN.ETH]: (value, format) => {
    switch (format) {
      case TOKEN_FORMAT.FULL: return <><EthIcon className="icon" />{(value / TOKEN_SCALE[TOKEN.ETH]).toLocaleString(undefined)}</>
      case TOKEN_FORMAT.UNLABELED: return <>{(value / TOKEN_SCALE[TOKEN.ETH]).toLocaleString(undefined, { maximumFractionDigits: 4 })}</>
      default: return <><EthIcon className="icon" />{(value / TOKEN_SCALE[TOKEN.ETH]).toLocaleString(undefined, { maximumFractionDigits: 4 })}</>
    }
  
  },
  [TOKEN.SWAY]: (value, format) => {
    switch (format) {
      case TOKEN_FORMAT.FULL: return <><SwayIcon /> {(value / TOKEN_SCALE[TOKEN.USDC]).toLocaleString()}</>
      case TOKEN_FORMAT.UNLABELED: return <>{(value / TOKEN_SCALE[TOKEN.SWAY]).toLocaleString(undefined, { maximumFractionDigits: 0 })}</>;
      default: return <><SwayIcon /> {(value / TOKEN_SCALE[TOKEN.SWAY]).toLocaleString(undefined, { maximumFractionDigits: 0 })}</>
    }
  },
  [TOKEN.USDC]: (value, format) => {
    switch (format) {
      case TOKEN_FORMAT.SHORT: return <>${(value / TOKEN_SCALE[TOKEN.USDC]).toLocaleString(undefined, { maximumFractionDigits: 0 })}</>
      case TOKEN_FORMAT.FULL: return <>${(value / TOKEN_SCALE[TOKEN.USDC]).toLocaleString()}</>
      case TOKEN_FORMAT.UNLABELED: return <>{(value / TOKEN_SCALE[TOKEN.USDC]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
      default: return <>${(value / TOKEN_SCALE[TOKEN.USDC]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
    }
  }
};
