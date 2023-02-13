import { useMemo } from "react";

import useChainTime from "~/hooks/useChainTime";
import { formatTimer } from "~/lib/utils";

const LiveTimer = ({ prefix = '', target, maxPrecision }) => {
  const chainTime = useChainTime();
  return useMemo(() => {
    const remaining = target === null ? NaN : target - chainTime;
    if (isNaN(remaining)) {
      return 'Initializing...';
    } else if (remaining < 0) { // TODO: potentially also use liveblocktime in here
      return 'Waiting for block...';
    } else {
      return `${prefix}${formatTimer(remaining, maxPrecision)}`;
    }
  }, [chainTime, maxPrecision, target]);
};

export default LiveTimer;