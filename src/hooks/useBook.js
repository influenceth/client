import { useQuery } from 'react-query';
import useAuth from '~/hooks/useAuth';

import api from '~/lib/api';

const useBook = (id) => {
  const { token } = useAuth();

  return useQuery(
    [ 'book', id, token ],
    /*
    () => ({
      i: 123,
      title: 'Genesis',
      parts: [
        {
          title: 'Prologue',
          chapters: [
            { id: '617b008b68c9ff30fb3ed389', title: 'Earth and the Void', sessions: [
              { id: '6197e8424775360a43474f2f', owner: 1, isComplete: false },
              { id: '617b008b68c9ff30fb3ed489', owner: 2, isComplete: true },
              { id: '617b008b68c9ff30fb3ed589', owner: 3, isComplete: false },
            ] },
          ]
        },
        {
          title: 'Part 1: Arrival',
          chapters: [
            { id: '617b008b68c9ff30fb3ed390', title: 'Chapter 1: The Planets', sessions: [] },
            { id: '617b008b68c9ff30fb3ed391', title: 'Chapter 2: The Proposal', sessions: [] },
            { id: '617b008b68c9ff30fb3ed392', title: 'Chapter 3: The Belt', sessions: [] },
          ]
        },
        {
          title: 'Part 2: The Arvad',
          chapters: [
            { id: '617b008b68c9ff30fb3ed393' },
            { id: '617b008b68c9ff30fb3ed394' },
          ]
        },
        {
          title: 'Part 3: Adalia Prime',
          chapters: [
            { id: '617b008b68c9ff30fb3ed395' },
            { id: '617b008b68c9ff30fb3ed396' },
          ]
        }
      ]
    }),
    */
    () => api.getBook(id),
    {
      enabled: !!id,
      retry: false
    }
  );
};

export default useBook;
