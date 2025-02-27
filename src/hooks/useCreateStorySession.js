import { useMutation, useQueryClient } from 'react-query';

import useSession from '~/hooks/useSession';
import api from '~/lib/api';

const useCreateStorySession = () => {
  const { token } = useSession();
  const queryClient = useQueryClient();

  return useMutation(
    async ({ storyId, crewId }) => {
      return api.createStorySession(crewId, storyId);
    },
    {
      enabled: !!token,
      onSuccess: async (data, variables) => {
        // TODO: setQueryData instead?
        queryClient.invalidateQueries('book', variables.bookId);
        return data;
      }
    }
  );
};

export default useCreateStorySession;
