import { useQuery } from 'react-query';
import useAuth from '~/hooks/useAuth';

import api from '~/lib/api';

const useBooks = () => {
  const { token } = useAuth();

  return useQuery(
    [ 'books', token ],
    () => api.getBooks()
  );
};

export default useBooks;
