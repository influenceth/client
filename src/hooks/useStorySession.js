import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import api from '~/lib/api';

const useStorySession = (id) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
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
  }, [story]);

  // path selection
  const commitPath = useCallback(async (path) => {
    let content;
    if (session.pathHistory.includes(path)) {
      console.log('GET path', path);
      content = await api.getStorySessionPath(session.id, path);
      content.linkedPaths = selectablePaths(content.linkedPaths, currentStep + 1);
    } else {
      console.log('PATCH path', path);
      content = await api.patchStorySessionPath(session.id, path);
      if (content) {
        const sessionCacheKey = [ 'storySession', id ];
        const currentCacheValue = queryClient.getQueryData(sessionCacheKey);
        queryClient.setQueryData(
          sessionCacheKey,
          {
            ...currentCacheValue,
            pathHistory: [
              ...currentCacheValue.pathHistory,
              path
            ]
            // TODO: isComplete
          }
        );
      }
    }
    
    if (content) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setPathContent(content);
    } else {
      // TODO: clear all story-related caches
    }
  }, [currentStep, session]);

  // TODO: image needs to be attached with all content (backend can default to story value or not)
  // TODO: respond with function to fetch, patch, etc
  // TODO: on completion, invalidate book and books

  const storyState = useMemo(() => {
    console.log({ session, story, pathContent });
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
    currentStep,
    storyState: storyState,
    commitPath: commitPath
  };
};

export default useStorySession;
