import { useMemo } from "react";

import useChainTime from "~/hooks/useChainTime";
import { formatTimer } from "~/lib/utils";

const LiveTimer = ({ children, prefix = '', target, maxPrecision }) => {
  // TODO: instead of this context re-rendering entire app every second, we could sync 
  //  multiple setIntervals by using a setTimeout to get to a Date.now where %1000 === 0
  //  (i.e. setTimeout(setInterval(..., 1000), Math.ceil(Date.now() / 1e3) * 1e3 - Date.now())
  //  multiple setIntervals are also a potential performance issue, but worth benchmarking
  const chainTime = useChainTime();
  const formattedTime = useMemo(() => {
    const remaining = target === null ? NaN : target - chainTime;
    if (isNaN(remaining)) {
      return 'Initializing...';
    } else if (remaining < 0) { // TODO: potentially also use liveblocktime in here
      return 'Waiting for block...';
    } else {
      return `${prefix}${formatTimer(remaining, maxPrecision)}`;
    }
  }, [chainTime, maxPrecision, target]);

  return children ? children(formattedTime) : formattedTime;
};

export default LiveTimer;