import { useQuery } from 'react-query';
import useAuth from '~/hooks/useAuth';

import api from '~/lib/api';

const useBook = (id) => {
  const { token } = useAuth();

  return useQuery(
    [ 'book', id, token ],
    () => api.getBook(id),
    {
      enabled: !!id,
      retry: false
    }
  );
};

export default useBook;
