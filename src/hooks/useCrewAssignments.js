import { useQuery } from 'react-query';
import useAuth from '~/hooks/useAuth';

import api from '~/lib/api';

const useCrewAssignments = () => {
  const { token } = useAuth();

  return useQuery(
    [ 'assignments', token ],
    async () => {
      const assignmentsByBook = {};
      let totalAssignments = 0;

      const assignments = (await api.getUserAssignments()) || [];
      assignments.forEach((story) => {
        const { book } = story;
        if (!assignmentsByBook[book.id]) {
          assignmentsByBook[book.id] = {
            id: book.id,
            title: book.title,
            stories: [],
            actionable: false
          };
        }
        assignmentsByBook[book.id].stories.push(story);
        if (story.actionable > 0) {
          assignmentsByBook[book.id].actionable = true;
          totalAssignments += story.actionable;
        }
      });

      return {
        assignmentsByBook: Object.values(assignmentsByBook),
        totalAssignments
      };
    },
    {
      enabled: !!token
    }
  );
};

export default useCrewAssignments;
