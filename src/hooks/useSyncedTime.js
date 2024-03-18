import { useEffect, useState } from 'react';

const getSeconds = () => Math.floor(Date.now() / 1000);

const useSyncedTime = () => {
  const [time, setTime] = useState(getSeconds());

  useEffect(() => {
    // on nearest second, start the interval
    let to, int;
    to = setTimeout(() => {
      int = setInterval(() => setTime(getSeconds()), 1000);
    }, Date.now() % 1000);

    // clear timeout and interval on dismount
    return () => {
      if (to) clearTimeout(to);
      if (int) clearInterval(int);
    }
  }, []);

  return time;
}

export default useSyncedTime;