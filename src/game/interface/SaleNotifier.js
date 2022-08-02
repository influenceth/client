import { useEffect, useState } from 'react';

import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import useInterval from '~/hooks/useInterval';
import useOwnedAsteroidsCount from '~/hooks/useOwnedAsteroidsCount';

const SaleNotifier = (props) => {
  const { sale } = props;
  const { wallet } = useAuth();
  const { data: soldCount } = useOwnedAsteroidsCount();
  const saleStarted = useStore(s => s.dispatchSaleStarted);
  const saleEnded = useStore(s => s.dispatchSaleEnded);
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const [ status, setStatus ] = useState();

  useInterval(async () => {
    if (status === 'starting' && wallet?.starknet?.provider) {
      const block = await wallet.starknet.provider.getBlock('latest');
      if (block.timestamp > sale.saleStartTime) setStatus('started');
    }
  }, status === 'starting' ? 1000 : null);

  useEffect(() => {
    if (!Number.isInteger(soldCount)) return;

    // Use original sale value to support testnet usage
    const endCount = sale.endCount || 1859;

    // Sale starts in the future. Wait for the time until it starts and set to starting
    if (sale.saleStartTime > Date.now() / 1000) {
      setStatus('unstarted');
      const timeUntilSale = (sale.saleStartTime * 1000) - Date.now();
      setTimeout(() => setStatus('starting'), timeUntilSale);
    }

    // Sale has started. Start polling blockchain to make sure block time is ready
    if (sale.saleStartTime < Date.now() / 1000 && soldCount < endCount && status !== 'started') {
      setStatus('starting');
    }

    // Sale has already ended.
    if (sale.saleStartTime < Date.now() / 1000 && soldCount >= endCount) setStatus('ended');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ sale, soldCount ]);

  useEffect(() => {
    if (status === 'started') {
      // Use original sale value to support testnet usage
      const endCount = sale.endCount || 1859;

      saleStarted();
      createAlert({
        type: 'Sale_Started',
        available: endCount - soldCount
      });
    }

    if (status === 'unstarted') {
      saleEnded();
      createAlert({
        type: 'Sale_TimeToStart',
        start: sale.saleStartTime * 1000
      });
    }

    if (status === 'ended') {
      saleEnded();
      createAlert({ type: 'Sale_Ended' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ status ]);

  return null;
};

export default SaleNotifier;
