// From https://overreacted.io/making-setinterval-declarative-with-react-hooks/
import { useEffect, useRef } from '~/lib/react-debug';

const useInterval = (callback, delay) => {
  const savedCallback = useRef();

  // Remember the latest callback.
  useEffect(import.meta.url, () => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(import.meta.url, () => {
    function tick() {
      savedCallback.current();
    }

    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

export default useInterval;
