import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useHistory } from 'react-router-dom';

import api from '~/lib/api';
import useStore from '~/hooks/useStore';

const useStorySession = (id) => {
  const history = useHistory();
  const queryClient = useQueryClient();
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const initialized = useRef();

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
    [ 'story', session?.story, id ],
    () => api.getStory(session.story, id),
    {
      enabled: !!session?.story,
      retry: false
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

  const updatePathHistory = useCallback((sessionId, updatedPathHistory) => {
    const sessionCacheKey = [ 'storySession', sessionId ];
    const currentCacheValue = queryClient.getQueryData(sessionCacheKey);
    queryClient.setQueryData(
      sessionCacheKey,
      {
        ...currentCacheValue,
        pathHistory: [ ...updatedPathHistory ]
      }
    );
  }, [queryClient]);

  const getDefaultContent = useCallback(() => ({
    content: story.content,
    image: story.image,
    linkedPaths: selectablePaths(story.linkedPaths, 0),
    prompt: story.prompt,
  }), [selectablePaths, story]);

  // path selection
  // [if canGoBack, then will start at current path; else, will start at 0]
  const commitPath = useCallback(async (path) => {
    setLoadingPath(true);

    let content;
    let updatedStep;
    let updatedPathHistory = session.pathHistory;
    try {
      // if can go back and committing path as "-1"
      if (story.features?.canGoBack && path === -1) {
        content = await api.deleteStorySessionPath(session.id, session.pathHistory[session.pathHistory.length - 1]);
        updatedPathHistory.pop();
        updatedStep = updatedPathHistory.length;
        updatePathHistory(session.id, updatedPathHistory);
        if (updatedStep === 0) {
          content = getDefaultContent();
        }

      // else, if have already committed this path, then just replaying... use GET
      } else if (session.pathHistory.includes(path)) {
        updatedStep = session.pathHistory.indexOf(path) + 1;
        content = await api.getStoryPath(session.story, path, session.id);
        content.linkedPaths = selectablePaths(content.linkedPaths, updatedStep);

      // else, commit path and update session and load content
      } else {
        content = await api.patchStorySessionPath(session.id, path);
        if (content) {
          updatedPathHistory.push(path);
          updatedStep = updatedPathHistory.length;
          updatePathHistory(session.id, updatedPathHistory);
        }
      }
    } catch (e) {
      console.warn(e);
    }

    if (content) {
      setCurrentStep(updatedStep);
      setPathContent(content);
      setLoadingPath(false);

      // if just completed assignment (i.e. no more choices), then refetch full session, assignments and book (for sessions)
      if (content.linkedPaths.length === 0) {
        // refetch session upon completion to get accrued traits
        queryClient.refetchQueries(['storySession', id]);
        queryClient.refetchQueries('assignments');
        if (story.book) {
          queryClient.refetchQueries(['book', story.book]);
        }
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
  }, [createAlert, getDefaultContent, history, id, queryClient, selectablePaths, session, story, updatePathHistory]);

  const goToPath = useCallback((path) => {
    if (path) {
      commitPath(path);

    } else {
      setCurrentStep(0);
      setPathContent(getDefaultContent());
      setLoadingPath(false);
    }
  }, [commitPath, getDefaultContent]);

  // on initial load, go to appropriate step
  useEffect(() => {
    if (!initialized.current) {
      setLoadingPath(true);
      if (story && session) {
        // if canGoBack, start at "current" path
        if (story.features?.canGoBack && session.pathHistory?.length > 0) {
          goToPath(session.pathHistory[session.pathHistory.length - 1]);
        
        // else, start at initial path (since will present without choices)
        } else {
          goToPath();
        }
        initialized.current = true;
      }
    }
  }, [story?.id, session?.id, session?.pathHistory]); // eslint-disable-line react-hooks/exhaustive-deps

  const storyState = useMemo(() => {
    if (story && session && pathContent) {
      return {
        ...story,
        ...session,
        ...pathContent
      };
    }
    return null;
  }, [pathContent, session, story]);

  return {
    commitPath,
    currentStep,
    loadingPath,
    storyState: storyState,
  };
};

export default useStorySession;
