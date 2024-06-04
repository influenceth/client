import { useMemo } from 'react';

import useSyncedTime from '~/hooks/useSyncedTime';
import { formatTimer } from '~/lib/utils';

const LiveTimer = ({ children, prefix = '', target, maxPrecision, waitingForBlockText = 'Waiting for block...' }) => {
  const syncedTime = useSyncedTime();
  const [formattedTime, isTimer] = useMemo(() => {
    const remaining = target === null ? NaN : target - syncedTime;
    if (isNaN(remaining)) {
      return ['Initializing...', false];
    } else if (remaining < 0) { // TODO: potentially also use liveblocktime in here
      return [waitingForBlockText, false];
    } else {
      return [`${prefix}${formatTimer(remaining, maxPrecision)}`, true];
    }
  }, [syncedTime, maxPrecision, target, waitingForBlockText]);

  return children ? children(formattedTime, isTimer) : formattedTime;
};

export default LiveTimer;