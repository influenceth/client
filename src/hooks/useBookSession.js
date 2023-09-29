import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crewmate } from '@influenceth/sdk';

import adalianRecruitmentBook from '~/assets/stories/adalian-recruitment.json'
import arvadianRecruitmentBook from '~/assets/stories/arvadian-recruitment.json'
import useCrewContext from './useCrewContext';
import useStore from './useStore';
import { getCloudfrontUrl } from '~/lib/assetUtils';

export const bookIds = {
  ADALIAN_RECRUITMENT: 'adalian',
  ARVADIAN_RECRUITMENT: 'arvadian'
};

const anyOf = (mustHave, tests) => !!mustHave.find((x) => tests.includes(x));
const allOf = (mustHave, tests) => !mustHave.find((x) => !tests.includes(x));

const useBookSession = (rawCrewId, rawCrewmateId) => {
  const crewId = Number(rawCrewId);
  const crewmateId = Number(rawCrewmateId);
  const { adalianRecruits, arvadianRecruits, loading: crewIsLoading } = useCrewContext();

  const [bookId, crewmate] = useMemo(() => {
    const adalianRecruit = adalianRecruits.find((a) => a.id === crewmateId);
    if (adalianRecruit) return [bookIds.ADALIAN_RECRUITMENT, adalianRecruit];

    const arvadianRecruit = arvadianRecruits.find((a) => a.id === crewmateId);
    if (arvadianRecruit) return [bookIds.ARVADIAN_RECRUITMENT, arvadianRecruit];

    return [bookIds.ADALIAN_RECRUITMENT, null];
  }, [adalianRecruits, arvadianRecruits, crewmateId]);

  const error = useMemo(() => {
    // validate crewmate (must be adalian w/ 0, or owned uninitialized arvadian w/ !0)
    if ((crewmateId > 0 && !crewmate) || (crewmate && crewmate.Crewmate?.status > 0)) return 'Invalid params!';
    return null;
  }, [crewmate, crewmateId]);

  const sessionData = useStore(s => s.crewAssignments?.[`${crewId}_${crewmateId}`] || {});
  const dispatchCrewAssignmentPathSelection = useStore(s => s.dispatchCrewAssignmentPathSelection);
  const dispatchCrewAssignmentPathUndo = useStore(s => s.dispatchCrewAssignmentPathUndo);
  const dispatchCrewAssignmentRestart = useStore(s => s.dispatchCrewAssignmentRestart);

  const book = useMemo(() => {
    if (bookId === bookIds.ADALIAN_RECRUITMENT) {
      return adalianRecruitmentBook;
    } else if (bookId === bookIds.ARVADIAN_RECRUITMENT) {
      return arvadianRecruitmentBook;
    }
    return null;
  }, [bookId]);

  const { bookSession, storySession } = useMemo(() => {
    if (!book) return {};
    if (crewIsLoading) return {};
    if (crewmateId && !crewmate) return {};

    let currentStory;
    let currentStoryIndex = -1;
    let pathContent;
    let classObjective;
    let allStoriesCompleted = true;
    const traitObjectives = new Set();
    const fullPathHistory = [];

    for (let story of book) {
      currentStory = story;
      currentStoryIndex++;

      let storyComplete = false;

      // path content is initially the story-level values
      // (we only need to include the linkedPaths since they are the only part
      //  that may be manipulated from the story defaults)
      pathContent = { linkedPaths: [ ...story.linkedPaths ] };

      (sessionData[story.id] || []).forEach((pathId) => {
        fullPathHistory.push(pathId);
        if (pathId === 'x') {
          storyComplete = true;
        } else {
          pathContent = story.paths.find((p) => p.id === pathId);
          if (!(pathContent?.linkedPaths?.length > 0)) {
            pathContent.prompt = '';
            pathContent.linkedPaths = [{ id: 'x' }];
            pathContent.isLastPage = true;
          }
          if (pathContent?.classObjective) {
            classObjective = pathContent?.classObjective;
          }
          if (pathContent?.objectives) {
            traitObjectives.add(...pathContent?.objectives);
          }
        }
      });

      allStoriesCompleted = allStoriesCompleted && storyComplete;
      if (!allStoriesCompleted) {
        break;
      }
    }

    const selectedClass = classObjective;
    const selectedTraits = Array.from(traitObjectives);

    // limit linked paths to only those allowed
    if (currentStory && pathContent?.linkedPaths?.length > 0) {
      pathContent.linkedPaths = pathContent.linkedPaths.filter((p) => {
        if (p.id === 'x') return true;

        const linkedPath = currentStory.paths.find((sp) => sp.id === p.id);
        if (!linkedPath) return false;

        const crewmateClass = [selectedClass || crewmate?.Crewmate?.class];
        if (linkedPath.requiredCrewClasses?.anyOf && !anyOf(linkedPath.requiredCrewClasses.anyOf, crewmateClass)) return false;
        if (linkedPath.requiredCrewClasses?.allOf && !allOf(linkedPath.requiredCrewClasses.allOf, crewmateClass)) return false;
    
        const allTraits = [
          ...selectedTraits,
          ...(crewmate?.Crewmate?.cosmetic || []),
          ...(crewmate?.Crewmate?.impactful || [])
        ];
        if (linkedPath.requiredTraits?.anyOf && !anyOf(linkedPath.requiredTraits.anyOf, allTraits)) return false;
        if (linkedPath.requiredTraits?.allOf && !allOf(linkedPath.requiredTraits.allOf, allTraits)) return false;
    
        if (linkedPath.requiredPathHistory?.anyOf && !anyOf(linkedPath.requiredPathHistory.anyOf, fullPathHistory)) return false;
        if (linkedPath.requiredPathHistory?.allOf && !allOf(linkedPath.requiredPathHistory.allOf, fullPathHistory)) return false;
    
        return true;
      });
    }

    // resize the cover images (add fullsizeImage for "download art" button)
    const imageWidth = 1500;
    const fullsizeSlug = pathContent?.image || currentStory?.image;
    const imageOverrides = { fullsizeImage: getCloudfrontUrl(fullsizeSlug) };
    if (fullsizeSlug) imageOverrides.image = getCloudfrontUrl(fullsizeSlug, { w: imageWidth });
    if (currentStory?.completionImage) imageOverrides.completionImage = getCloudfrontUrl(currentStory.completionImage, { w: imageWidth });

    // return bookSession and storySession
    const { paths, ...storyDefaults } = currentStory;
    return {
      bookSession: {
        bookId,
        crewmate,
        currentStoryId: currentStory.id,
        currentStoryIndex,
        isComplete: allStoriesCompleted,
        isLastStory: currentStory.id === book[book.length - 1].id,
        isMintingStory: [bookIds.ADALIAN_RECRUITMENT, bookIds.ARVADIAN_RECRUITMENT].includes(bookId),
        selectedClass,
        selectedTraits
      },
      storySession: {
        ...storyDefaults,
        ...pathContent,
        ...imageOverrides,
        history: sessionData[currentStory.id] || [],
        currentStep: (sessionData[currentStory.id] || []).length,
        totalSteps: bookId === bookIds.ADALIAN_RECRUITMENT ? 5 : 3,
      }
    };
  }, [book, crewmate, crewIsLoading, sessionData]);

  const choosePath = useCallback((pathId) => {
    dispatchCrewAssignmentPathSelection(crewId, crewmateId, bookSession?.currentStoryId, pathId);
  }, [crewId, crewmateId, bookSession?.currentStoryId]);

  const undoPath = useCallback(() => {
    if (bookSession.currentStoryIndex > 0 && storySession.history.length === 0) {
      const previousStoryIndex = book.findIndex((s) => s.id === bookSession?.currentStoryId) - 1;
      if (previousStoryIndex >= 0) {
        dispatchCrewAssignmentPathUndo(crewId, crewmateId, book[previousStoryIndex].id);
      }
    } else {
      dispatchCrewAssignmentPathUndo(crewId, crewmateId, bookSession?.currentStoryId);
    }
  }, [crewId, crewmateId, book, bookSession, storySession]);

  const restart = useCallback(() => {
    dispatchCrewAssignmentRestart(crewId, crewmateId);
  }, [crewId, crewmateId]);

  return useMemo(() => ({
    bookError: error,
    bookSession,
    storySession,
    choosePath,
    undoPath,
    restart
  }), [bookSession, storySession, choosePath, undoPath, restart]);
};

export default useBookSession;