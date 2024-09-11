import React, { useEffect, useState } from '~/lib/react-debug';

const SyncedTimeContext = React.createContext();

const getSeconds = () => Math.floor(Date.now() / 1000);

export function SyncedTimeProvider({ children }) {
  const [time, setTime] = useState(getSeconds());

  useEffect(import.meta.url, () => {
    const int = setInterval(() => setTime(getSeconds()), 1000);
    return () => clearInterval(int);
  }, []);

  return (
    <SyncedTimeContext.Provider value={time}>
      {children}
    </SyncedTimeContext.Provider>
  );
}

export default SyncedTimeContext;