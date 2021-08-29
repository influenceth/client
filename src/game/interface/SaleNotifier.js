import { useEffect, useState } from 'react';
import { useWeb3React } from '@web3-react/core';

import useStore from '~/hooks/useStore';
import useInterval from '~/hooks/useInterval';
import useOwnedAsteroidsCount from '~/hooks/useOwnedAsteroidsCount';

const SaleNotifier = (props) => {
  const { sale } = props;
  const { library } = useWeb3React();
  const { data: soldCount } = useOwnedAsteroidsCount();
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const [ status, setStatus ] = useState();

  useInterval(async () => {
    if (status === 'starting' && library) {
      const block = await library.getBlock('latest');
      if (block.timestamp > sale.saleStartTime) setStatus('started');
    }
  }, status === 'starting' ? 1000 : null);

  useEffect(() => {
    if (!soldCount) return;

    // Sale starts in the future. Wait for the time until it starts and set to starting
    if (sale.saleStartTime > Date.now() / 1000) {
      setStatus('unstarted');
      const timeUntilSale = (sale.saleStartTime * 1000) - Date.now();
      setTimeout(() => setStatus('starting'), timeUntilSale);
    }

    // Sale has started. Start polling blockchain to make sure block time is ready
    if (sale.saleStartTime < Date.now() / 1000 && soldCount < sale.endCount) setStatus('starting');

    // Sale has already ended.
    if (sale.saleStartTime < Date.now() / 1000 && soldCount >= sale.endCount) setStatus('ended');
  }, [ sale, soldCount ]);

  useEffect(() => {
    if (status === 'started') createAlert({
      type: 'Sale_Started',
      available: sale.endCount - soldCount
    });

    if (status === 'unstarted') createAlert({
      type: 'Sale_TimeToStart',
      start: sale.saleStartTime * 1000
    });

    if (status === 'ended') createAlert({ type: 'Sale_Ended' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ status ]);

  return null;
};

export default SaleNotifier;
