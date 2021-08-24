import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import useStore from '~/hooks/useStore';

const Referrals = () => {
  const params = useLocation().search;
  const setRefCode = useStore(s => s.dispatchReferrerSet);

  useEffect(() => {
    const query = new URLSearchParams(params);
    const refCode = query.get('r');

    if (refCode) setRefCode(refCode);
  }, [ params, setRefCode ]);

  return null;
};

export default Referrals;
