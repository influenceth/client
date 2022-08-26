import { useEffect, useRef, useState } from 'react';

import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';

const SaleNotifier = (props) => {
  const { sale } = props;
  const { wallet } = useAuth();
  const dispatchSaleStarted = useStore(s => s.dispatchSaleStarted);
  const dispatchSaleEnded = useStore(s => s.dispatchSaleEnded);
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const [ status, setStatus ] = useState();

  const poller = useRef();
  const waiter = useRef();

  useEffect(() => {
    if (!sale) return;
    const { cancelled, saleCount, saleLimit, saleStartTime } = sale;

    // clear timeout if re-running this due to a change in sale info
    if (waiter.current) clearTimeout(waiter.current);

    // if cancelled, update status to ended if there is one, otherwise, nothing to do
    if (cancelled) {
      if (status) setStatus('ended');

    } else {
      // Sale starts in the future. Wait for the time until it starts and set to starting
      if (saleStartTime > Date.now() / 1000) {
        setStatus('unstarted');
        const timeUntilSale = (saleStartTime * 1000) - Date.now();
        waiter.current = setTimeout(() => {
          setStatus('starting');
        }, timeUntilSale);
      }

      // Sale has started. Start polling blockchain to make sure block time is ready
      if (saleStartTime < Date.now() / 1000 && saleCount < saleLimit && status !== 'started') {
        setStatus('starting');
      }

      // Sale has already ended.
      if (saleStartTime < Date.now() / 1000 && saleCount >= saleLimit) {
        setStatus('ended');
      }
    }

    return () => {
      if (waiter.current) clearTimeout(waiter.current);
    }


  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale?.saleCount, sale?.saleLimit, sale?.saleStartTime, sale?.cancelled]);


  useEffect(() => {
    if (poller.current) clearInterval(poller.current);
    
    if (status === 'starting') {
      if (wallet?.starknet?.provider) {
        const pollFunc = () => {
          try {
            wallet.starknet.provider.getBlock('latest').then((block) => {
              if (block.timestamp > sale.saleStartTime) {
                setStatus('started'); // will trigger another run of this effect, clearing interval
              }
            })
          } catch (e) {
            console.warn(e);
          }
        };
        poller.current = setInterval(pollFunc, 30e3);
        pollFunc();
      }
    }

    else if (status === 'started') {
      // Use original sale value to support testnet usage
      dispatchSaleStarted();
      createAlert({
        type: 'Sale_Started',
        asset: sale.assetType,
        available: sale.saleLimit - (sale.saleCount || 0)
      });
    }

    else if (status === 'unstarted') {
      dispatchSaleEnded();
      createAlert({
        type: 'Sale_TimeToStart',
        asset: sale.assetType,
        start: sale.saleStartTime * 1000
      });
    }

    else if (status === 'ended') {
      dispatchSaleEnded();
      createAlert({
        type: 'Sale_Ended',
        asset: sale.assetType
      });
    }

    return () => {
      if (poller.current) clearInterval(poller.current);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ status, sale?.saleStartTime ]);

  return null;
};

export default SaleNotifier;
