import { useMemo } from 'react';

import useSyncedTime from '~/hooks/useSyncedTime';
import { formatTimer } from '~/lib/utils';

const LiveTimer = ({ children, prefix = '', target, maxPrecision }) => {
  const syncedTime = useSyncedTime();
  const formattedTime = useMemo(() => {
    const remaining = target === null ? NaN : target - syncedTime;
    if (isNaN(remaining)) {
      return 'Initializing...';
    } else if (remaining < 0) { // TODO: potentially also use liveblocktime in here
      return 'Waiting for block...';
    } else {
      return `${prefix}${formatTimer(remaining, maxPrecision)}`;
    }
  }, [syncedTime, maxPrecision, target]);

  return children ? children(formattedTime) : formattedTime;
};

export default LiveTimer;