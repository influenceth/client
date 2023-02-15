import { useQuery } from 'react-query';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';
import useCrew from '~/hooks/useCrew';

const useCrewAssignments = () => {
  const { token } = useAuth();
  const { crewMemberMap } = useCrew();

  return useQuery(
    // (refresh on crewMemberMap change)
    [ 'assignments', token, Object.keys(crewMemberMap || {}).sort().join(',') ],
    async () => {
      const assignmentsByBook = {};
      let totalAssignments = 0;
      let crewRecruitmentStoryId;
      let crewRecruitmentSessionId;

      const assignments = (await api.getUserAssignments()) || [];
      assignments.forEach((story) => {
        const { book, isCrewRecruitmentStory } = story;
        if (book) {
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
        } else if (isCrewRecruitmentStory) {
          crewRecruitmentStoryId = story.id;
          crewRecruitmentSessionId = story.openSession;
        }
      });

      return {
        assignmentsByBook: Object.values(assignmentsByBook),
        crewRecruitmentStoryId,
        crewRecruitmentSessionId,
        totalAssignments
      };
    },
    {
      enabled: !!token
    }
  );
};

export default useCrewAssignments;
