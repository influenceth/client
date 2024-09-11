import { useCallback, useEffect, useMemo, useState } from '~/lib/react-debug';
import { useQueryClient } from 'react-query';

import { TOKEN, TOKEN_SCALE } from '~/lib/priceUtils';
import useSession from '~/hooks/useSession';
import { nativeBool } from '~/lib/utils';
import UserPrice from '~/components/UserPrice';
import api from '~/lib/api';
import useFaucetInfo from '~/hooks/useFaucetInfo';
import BrightButton from '~/components/BrightButton';
import { PuffLoader } from 'react-spinners';

const EthFaucetButton = ({ onError, onProcessing, onSuccess }) => {
  const queryClient = useQueryClient();
  const { data: faucetInfo, isLoading: faucetInfoLoading } = useFaucetInfo();
  const { provider } = useSession();

  const [requestingEth, setRequestingEth] = useState();

  const ethEnabled = useMemo(import.meta.url, () => {
    if (!faucetInfo) return false;
    const lastClaimed = faucetInfo.ETH.lastClaimed || 0;
    return Date.now() > (Date.parse(lastClaimed) + 23.5 * 3600e3);
  }, [faucetInfo]);

  const requestEth = useCallback(import.meta.url, async () => {
    setRequestingEth(true);

    try {
      const txHash = await api.requestTokens('ETH');
      await provider.waitForTransaction(txHash);

      setRequestingEth(false);

      if (onSuccess) onSuccess();
    } catch (e) {
      console.error(e);
      setRequestingEth(false);
      if (onError) onError('Faucet request failed, please try again later.');
    }

    queryClient.invalidateQueries({ queryKey: 'faucetInfo', refetchType: 'none' });
    queryClient.refetchQueries({ queryKey: 'faucetInfo', type: 'active' });
    queryClient.invalidateQueries({ queryKey: ['walletBalance', 'eth'] });
  }, [provider]);

  useEffect(import.meta.url, () => {
    if (onProcessing) onProcessing(requestingEth);
  }, [onProcessing, requestingEth]);

  const disabled = !ethEnabled || requestingEth || faucetInfoLoading;
  return (
    <BrightButton
      onClick={requestEth}
      disabled={nativeBool(disabled)}
      success>
      <label>ETH Faucet (Daily)</label>
      <span style={{ textAlign: 'right' }}>
        {(requestingEth || faucetInfoLoading)
          ? <span style={{ alignItems: 'center', display: 'inline-flex', width: 24, height: 24 }}><PuffLoader size="20px" color="white" /></span>
          : (
            <>
              +<UserPrice price={0.015 * TOKEN_SCALE[TOKEN.ETH]} priceToken={TOKEN.ETH} format />
            </>
          )}
      </span>
    </BrightButton>
  );
}

export default EthFaucetButton;