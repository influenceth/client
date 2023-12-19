import { useEffect, useState } from 'react';

const useReadyAtWatcher = (readyAt) => {
  const [ready, setReady] = useState(true);

  useEffect(() => {
    let to;
    if (readyAt > 0) {
      const now = Date.now();
      const readyAt_ms = readyAt * 1e3;
      if (readyAt_ms > now) {
        setReady(false);
        to = setTimeout(() => { setReady(true); }, readyAt_ms - now);
      } else {
        setReady(true);
      }
    } else {
      setReady(true);
    }
    return () => { if (to) { clearTimeout(to) } };
  }, [readyAt]);

  return ready;
};

export default useReadyAtWatcher;