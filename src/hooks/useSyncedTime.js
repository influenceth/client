import { useContext } from '~/lib/react-debug';

import SyncedTimeContext from '~/contexts/SyncedTimeContext';

const useSyncedTime = () => {
  return useContext(SyncedTimeContext);
  // const [time, setTime] = useState(getSeconds());

  // useEffect(import.meta.url, () => {
  //   // on nearest second, start the interval
  //   let to, int;
  //   to = setTimeout(() => {
  //     int = setInterval(() => setTime(getSeconds()), 1000);
  //   }, Date.now() % 1000);

  //   // clear timeout and interval on dismount
  //   return () => {
  //     if (to) clearTimeout(to);
  //     if (int) clearInterval(int);
  //   }
  // }, []);

  // return time;
}

export default useSyncedTime;