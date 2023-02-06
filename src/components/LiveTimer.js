import { useMemo } from "react";

import useChainTime from "~/hooks/useChainTime";
import { formatTimer } from "~/lib/utils";

const LiveTimer = ({ target, maxPrecision }) => {
  const chainTime = useChainTime();
  return useMemo(() => {
    const remaining = target === null ? NaN : Math.max(0, target - chainTime);
    return isNaN(remaining) ? 'Initializing...' : <>{formatTimer(remaining, maxPrecision)}</>;
  }, [chainTime, maxPrecision, target]);
};

export default LiveTimer;