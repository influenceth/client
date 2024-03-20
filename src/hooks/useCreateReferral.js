import { useQueryClient, useMutation } from 'react-query';

import useSession from '~/hooks/useSession';
import useStore from '~/hooks/useStore';
import api from '~/lib/api';

const useCreateReferral = (i) => {
  useSession();
  const referrer = useStore(s => s.referrer);
  const setRefCode = useStore(s => s.dispatchReferrerSet);
  const queryClient = useQueryClient();
  const referral = { i: i, referrer: referrer };

  return useMutation(async () => api.createReferral(referral),
  {
    onSuccess: async () => queryClient.invalidateQueries('referralsCount'),
    onError: async (e) => setRefCode(null)
  });
};

export default useCreateReferral;
