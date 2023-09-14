import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';

import adalianImage from '~/assets/images/crew_collections/4.png'
import useCrewContext from '~/hooks/useCrewContext';
import useBookSession, { bookIds } from '~/hooks/useBookSession';
import useStore from '~/hooks/useStore';
import ConfirmationDialog from '~/components/ConfirmationDialog';
import CrewCard from '~/components/CrewCard';
import NavIcon from '~/components/NavIcon';

import CrewSilhouetteCard from '~/components/CrewSilhouetteCard';
import ChoicesDialog from '~/components/ChoicesDialog';

const CrewContainer = styled.div`
  flex: 0 1 275px;
  min-width: 210px;
  padding: 0 12px 12px 0;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: none;
  }
`;

const SilhouetteWrapper = styled.div`
  opacity: 0.3;
`;

const NavSpacer = styled.div`
  border-top: 1px dotted ${p => p.completed ? '#FFF' : '#777'};
  height: 0;
  margin: 0 8px;
  width: 1.5em;

  ${p => p.steps > 4 && `
    opacity: 0;
    width: 0.5em;
  `}
`;

const PagePrompt = styled.div`
  color: white;
  margin-bottom: 1em;
`;

const Progress = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  & > label {
    font-size: 20px;
  }
  & > div {
    display: flex;
    flex-direction: row;
    font-size: 20px;
    margin-left: 25px;
  }
`;

const PromptDetails = styled.div`
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  color: ${p => p.theme.colors.main};
  padding: 1em 2em;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 1em;
  }
`;

const AdalianFlourish = styled.div`
  display: block;
  height: 100%;
  width: 100%;
  &:before {
    content: "";
    background-image: url(${adalianImage});
    background-position: center center;
    background-repeat: no-repeat;
    background-size: 165%;
    display: block;
    filter: contrast(0%) sepia(100%) hue-rotate(150deg) saturate(150%);
    height: 100%;
    opacity: 0.65;
    width: 100%;
  }
`;

const REQUIRE_CONFIRM = false;

const CrewAssignment = () => {
  const { id: bookId } = useParams();
  const history = useHistory();
  const { crewmateMap } = useCrewContext();

  const {
    bookSession,
    storySession,
    choosePath,
    undoPath,
    restart
  } = useBookSession(bookId);

  const playSound = useStore(s => s.dispatchSoundRequested);

  const [pathLoading, setPathLoading] = useState();
  const [selection, setSelection] = useState();

  let onCloseDestination;
  if (bookSession.isMintingStory || Object.keys(crewmateMap || {}).length > 0) {
    onCloseDestination = '/crew';
  } else {
    onCloseDestination = '/';
  }

  // on step change, clear selection (to close modal) and set pseudo path-loading
  useEffect(() => {
    setSelection();

    setPathLoading(true);
    setTimeout(() => { setPathLoading(false); }, 100);
  }, [storySession.currentStep]);

  const confirmPath = useCallback(() => {
    playSound('effects.click');
    choosePath(selection.id);
  }, [choosePath, playSound, selection]);

  const selectPath = useCallback((path) => () => {
    playSound('effects.click');

    // if only one choice (or auto confirming), don't need to confirm
    if (!REQUIRE_CONFIRM || storySession.linkedPaths?.length === 1) {
      choosePath(path.id);

    // else, confirm in modal
    } else {
      setSelection(path);
    }
  }, [choosePath, playSound, storySession]);

  const onGoBack = useCallback(() => {
    playSound('effects.click');
    history.push(onCloseDestination);
  }, [history, playSound, onCloseDestination]);

  const onUndoPath = useCallback(() => {
    undoPath();
  }, [undoPath]);

  const finish = useCallback(() => {
    playSound('effects.success');
    history.push(`/crew-assignment/${bookId}/${bookSession.isMintingStory ? 'create' : 'complete'}`);
  }, [history, playSound, bookId, bookSession.isMintingStory]);

  const crewmate = useMemo(
    () => crewmateMap && storySession && crewmateMap[storySession.owner],
    [storySession, crewmateMap]
  );

  const contentReady = storySession && (crewmate || storySession.ownerType !== 'CREW_MEMBER');
  return (
    <>
      <ChoicesDialog
        dialogTitle={bookSession.isMintingStory ? 'Crewmate Creation' : 'Crew Assignments'}
        onCloseDestination={onCloseDestination}
        coverImage={storySession.image}
        coverImageCenter={storySession.imageCenter}
        content={storySession.content}
        choices={storySession.isLastPage ? null : storySession.linkedPaths}
        choicelessButton={{
          label: bookSession.isLastStory
            ? (bookSession.isMintingStory ? 'Create Your Crewmate' : 'Finish')
            : 'Next Chapter',
          onClick: bookSession.isLastStory ? finish : selectPath(storySession.linkedPaths[0])
        }}
        isLoading={!contentReady}
        isLoadingChoice={!contentReady || pathLoading}
        onSelect={selectPath}
        prompt={storySession.prompt}
        flourish={
          bookId === bookIds.ADALIAN_RECRUITMENT
            ? <AdalianFlourish />
            : (
              <CrewContainer>
                {crewmate ? <CrewCard crewmate={crewmate} /> : <SilhouetteWrapper><CrewSilhouetteCard /></SilhouetteWrapper>}
              </CrewContainer>
            )
        }
        leftButton={{
          label: 'Back',
          onClick: (bookSession.currentStoryIndex > 0 || storySession.currentStep > 0) ? onUndoPath : onGoBack,
        }}
        rightButton={{
          label: 'Skip',
          disabled: (storySession.isLastPage && bookSession.isLastStory),
          onClick: () => {},
        }}
        title={storySession.title}
        subtitle={(
          <Progress>
            <label>{Math.min(storySession.totalSteps, storySession.currentStep + 1)} of {storySession.totalSteps}</label>
            <div>
              {Array.from({ length: storySession.totalSteps }, (x, i) => {
                let color = '#777';
                if (i < storySession.currentStep) {
                  color = '#FFF'; //theme.colors.main;
                } else if (i === storySession.currentStep) {
                  color = '#FFF';
                }
                return (
                  <React.Fragment key={i}>
                    {i > 0 && <NavSpacer steps={storySession.totalSteps} completed={i <= storySession.currentStep} />}
                    <NavIcon
                      animate
                      selected={i === storySession.currentStep}
                      size="1em"
                      color={color} />
                  </React.Fragment>
                );
              })}
            </div>
          </Progress>
        )}
      />
      {REQUIRE_CONFIRM && selection && (
        <ConfirmationDialog
          title="Your Selection:"
          body={(
            <>
              <PagePrompt>{storySession.prompt}</PagePrompt>
              <PromptDetails>{selection.text}</PromptDetails>
            </>
          )}
          onConfirm={confirmPath}
          onReject={selectPath()}
        />
      )}
    </>
  );
};

export default CrewAssignment;
