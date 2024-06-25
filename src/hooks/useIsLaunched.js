import { useMemo } from 'react';

import useBlockTime from '~/hooks/useBlockTime';
import { openAccessJSTime } from '~/lib/utils';

const useIsLaunched = (crew) => {
  const blockTime = useBlockTime();

  return useMemo(() => {
    // use crew-specific value if have a crew specified
    if (crew) {
      return crew._launched;
    }

    // else, recheck against general launch time params
    // (above would be more relevant if early access were set)
    if (openAccessJSTime) {
      if (blockTime) return blockTime > (openAccessJSTime / 1e3);
      return false;
    }

    // if no openAccessJSTime is set, then assume open
    return true;

  }, [blockTime, crew])
};

export default useIsLaunched;
