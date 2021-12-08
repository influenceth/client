import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useHistory } from 'react-router-dom';

import api from '~/lib/api';
import useStore from '~/hooks/useStore';

const useStorySession = (id) => {
  const history = useHistory();
  const queryClient = useQueryClient();
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [currentStep, setCurrentStep] = useState(0);
  const [loadingPath, setLoadingPath] = useState(false);
  const [pathContent, setPathContent] = useState();

  // load the session
  const { data: session } = useQuery(
    [ 'storySession', id ],
    () => api.getStorySession(id),
    {
      enabled: !!id,
      retry: false
    }
  );

  // load the story
  const { data: story } = useQuery(
    [ 'story', session?.story ],
    () => api.getStory(session?.story),
    {
      enabled: !!session?.story,
      retry: false
    }
  );

  // make sure load objective if navigate directly to "assignment completed" page
  const { data: objective } = useQuery(
    [ 'storySessionObjective', id ],
    async () => {
      const lastPath = await api.getStorySessionPath(session.id, session.pathHistory[session.pathHistory.length - 1]);
      return (lastPath?.objectives || [lastPath?.objective])[0];
    },
    {
      enabled: !!session?.isComplete
    }
  );

  // get selectablePaths
  const selectablePaths = useCallback((allPaths, step) => {
    const selectedPath = session?.pathHistory[step];
    if (selectedPath) {
      return allPaths.filter(({ path }) => path === selectedPath);
    }
    return allPaths;
  }, [session?.pathHistory]);

  // step 0 uses default content (from story)
  useEffect(() => {
    if (story) {
      if (currentStep === 0) {
        setPathContent({
          content: story.content,
          image: story.image,
          linkedPaths: selectablePaths(story.linkedPaths, 0),
          prompt: story.prompt,
        });
      }
    }
  }, [currentStep, selectablePaths, story]);

  // path selection
  const commitPath = useCallback(async (path) => {
    setLoadingPath(true);

    let content;
    try {
      if (session.pathHistory.includes(path)) {
        content = await api.getStorySessionPath(session.id, path);
        content.linkedPaths = selectablePaths(content.linkedPaths, currentStep + 1);
      } else {
        content = await api.patchStorySessionPath(session.id, path);
        if (content) {
          const sessionCacheKey = [ 'storySession', session.id ];
          const currentCacheValue = queryClient.getQueryData(sessionCacheKey);
          queryClient.setQueryData(
            sessionCacheKey,
            {
              ...currentCacheValue,
              pathHistory: [
                ...currentCacheValue.pathHistory,
                path
              ]
            }
          );
        }
      }
    } catch (e) {
      console.warn(e);
    }
    
    if (content) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setPathContent(content);
      setLoadingPath(false);

      // if just completed assignment (i.e. no more choices), then set objective and refetch assignments and book (for sessions)
      if (content.linkedPaths.length === 0) {
        queryClient.setQueryData(
          [ 'storySessionObjective', session.id ],
          content.objective
        );

        queryClient.refetchQueries('assignments');
        queryClient.refetchQueries(['book', story.book]);
      }

    // if no content found, probably because trying to make invalid choice... redirect to main page with error
    } else {
      createAlert({
        type: 'GenericLoadingError',
        label: 'crew assignment path',
        level: 'warning',
      });
      history.push(`/crew-assignments/${story.book}`);
    }
  }, [createAlert, currentStep, history, queryClient, selectablePaths, story, session]);

  const storyState = useMemo(() => {
    if (story && session && pathContent) {
      return {
        ...story,
        ...session,
        ...pathContent,
        objective
      };
    }
    return null;
  }, [pathContent, objective, session, story]);

  return {
    commitPath: commitPath,
    currentStep,
    loadingPath,
    storyState: storyState,
  };
};

export default useStorySession;
