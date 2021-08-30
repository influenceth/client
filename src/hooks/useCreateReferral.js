import { useQueryClient, useMutation } from 'react-query';

import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import api from '~/lib/api';

const useCreateReferral = (i) => {
  useAuth();
  const referrer = useStore(s => s.referrer);
  const queryClient = useQueryClient();
  const referral = { i: i, referrer: referrer };

  return useMutation(async () => api.createReferral(referral),
  {
    onSuccess: async () => {
      queryClient.invalidateQueries('referralsCount');
    }
  });
};

export default useCreateReferral;
