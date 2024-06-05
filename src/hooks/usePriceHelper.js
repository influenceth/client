import { useCallback, useMemo } from 'react';

import { useSwayPerUsdc, useUsdcPerEth } from '~/hooks/useSwapQuote';
import { TOKEN, TOKEN_FORMATTER, TOKEN_SCALE } from '~/lib/priceUtils';

class Price {
  constructor (usdcValue, convs) {
    this.usdcValue = usdcValue;
    this.convs = convs;
  }

  static from(tokenValue, tokenAddress, convs) {
    let usdcValue = 0n;
    if (tokenValue === 0n || tokenAddress === TOKEN.ETH) usdcValue = parseFloat(tokenValue) * convs.usdcPerEth;
    else if (tokenAddress === TOKEN.SWAY) usdcValue = parseFloat(tokenValue) / convs.swayPerUsdc;
    else if (tokenAddress === TOKEN.USDC) usdcValue = parseFloat(tokenValue);
    else throw new Error(`invalid token address: "${tokenAddress}"`);
    return new Price(usdcValue, convs);
  }

  to(tokenAddress, format = false) {
    let tokenValue = 0n;
    if (tokenAddress === TOKEN.ETH) tokenValue = this.usdcValue / this.convs.usdcPerEth;
    else if (tokenAddress === TOKEN.SWAY) tokenValue = this.usdcValue * this.convs.swayPerUsdc;
    else if (tokenAddress === TOKEN.USDC) tokenValue = this.usdcValue;
    else throw new Error(`invalid token address: "${tokenAddress}"`);
    return format
      ? TOKEN_FORMATTER[tokenAddress](tokenValue, format)
      : tokenValue;
  }
}

const usePriceHelper = () => {
  const { data: swayPerUsdc } = useSwayPerUsdc();
  const { data: usdcPerEth } = useUsdcPerEth();

  const convs = useMemo(() => ({
    swayPerUsdc: swayPerUsdc || (2500 * parseFloat(TOKEN_SCALE[TOKEN.SWAY] / TOKEN_SCALE[TOKEN.USDC])),
    usdcPerEth: usdcPerEth || (3800 * parseFloat(TOKEN_SCALE[TOKEN.USDC] / TOKEN_SCALE[TOKEN.ETH])),
  }), [swayPerUsdc, usdcPerEth]);
  
  const from = useCallback((value, originToken) => {
    return Price.from(value, originToken, convs);
  }, [swayPerUsdc, usdcPerEth, convs]);

  // TODO: disable this?
  const fromAddress = useCallback((value, originToken) => {
    return Price.from(value, originToken, convs);
  }, [swayPerUsdc, usdcPerEth, convs]);

  return useMemo(() => ({ from, fromAddress }), [from, fromAddress]);
};

export default usePriceHelper;