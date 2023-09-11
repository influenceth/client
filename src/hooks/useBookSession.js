import { useCallback, useEffect, useMemo, useState } from 'react';
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

const useBookSession = (bookId, crewmate) => {
  const { crew } = useCrewContext();
  const crewId = crew?.id || 0;
  const crewmateId = crewmate?.id || 0;

  const sessionData = useStore(s => s.crewAssignments?.[`${crewId}_${crewmateId}`]?.[bookId] || {});
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
  }, [book, crewmate, sessionData]);

  const choosePath = useCallback((pathId) => {
    dispatchCrewAssignmentPathSelection(crewId, crewmateId, bookId, bookSession?.currentStoryId, pathId);
  }, [crewId, crewmateId, bookId, bookSession?.currentStoryId]);

  const undoPath = useCallback(() => {
    if (bookSession.currentStoryIndex > 0 && storySession.history.length === 0) {
      const previousStoryIndex = book.findIndex((s) => s.id === bookSession?.currentStoryId) - 1;
      if (previousStoryIndex >= 0) {
        dispatchCrewAssignmentPathUndo(crewId, crewmateId, bookId, book[previousStoryIndex].id);
      }
    } else {
      dispatchCrewAssignmentPathUndo(crewId, crewmateId, bookId, bookSession?.currentStoryId);
    }
  }, [crewId, crewmateId, book, bookId, bookSession, storySession]);

  const restart = useCallback(() => {
    dispatchCrewAssignmentRestart(crewId, crewmateId, bookId);
  }, [crewId, crewmateId, bookId]);

  return useMemo(() => ({
    bookSession,
    storySession,
    choosePath,
    undoPath,
    restart
  }), [bookSession, storySession, choosePath, undoPath, restart]);
};

export default useBookSession;
