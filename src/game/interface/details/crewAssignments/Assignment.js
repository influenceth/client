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
  width: 260px;
  min-width: 210px;
  padding: 0 12px 12px 0;

  & > div {
    border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.3);
    padding: 10px;
  }

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
    align-items: center;
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

const CrewAssignment = ({ crewId, crewmateId, onFinish }) => {
  const history = useHistory();
  const { crewmateMap } = useCrewContext();

  const {
    bookError,
    bookSession,
    storySession,
    choosePath,
    undoPath
  } = useBookSession(crewId, crewmateId);

  const playSound = useStore(s => s.dispatchSoundRequested);

  const [confirmingExitStoryMode, setConfirmingExitStoryMode] = useState();
  const [pathLoading, setPathLoading] = useState();
  const [selection, setSelection] = useState();

  let onCloseDestination;
  if (bookSession?.isMintingStory || Object.keys(crewmateMap || {}).length > 0) {
    onCloseDestination = '/crew';
  } else {
    onCloseDestination = '/';
  }

  useEffect(() => {
    if (bookError) history.push(onCloseDestination);
  }, [bookError, onCloseDestination]);

  // on step change, clear selection (to close modal) and set pseudo path-loading
  useEffect(() => {
    setSelection();

    setPathLoading(true);
    setTimeout(() => { setPathLoading(false); }, 100);
  }, [storySession?.currentStep]);

  const confirmPath = useCallback(() => {
    playSound('effects.click');
    choosePath(selection.id);
  }, [choosePath, playSound, selection]);

  const selectPath = useCallback((path) => () => {
    playSound('effects.click');

    // if only one choice (or auto confirming), don't need to confirm
    if (!REQUIRE_CONFIRM || storySession?.linkedPaths?.length === 1) {
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
    choosePath('x');
    onFinish(); // ${bookSession?.isMintingStory ? 'create' : 'complete'}
  }, [history, playSound, bookSession?.isMintingStory]);

  const confirmExitStoryMode = useCallback(() => {
    setConfirmingExitStoryMode(true);
  }, []);

  const onConfirmExitStoryMode = useCallback(() => {
    onFinish(); // ${bookSession?.isMintingStory ? 'create' : 'complete'}
  }, []);

  if (!bookSession || !storySession) return null;
  // TODO: ^ should probably redirect somewhere

  // TODO: contentReady seems unnecessary
  const contentReady = true; // crewmate || storySession.ownerType !== 'CREW_MEMBER';
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
          bookSession.bookId === bookIds.ADALIAN_RECRUITMENT
            ? <AdalianFlourish />
            : (
              <CrewContainer>
                <div>
                  {bookSession.crewmate
                    ? <CrewCard
                        crewmate={bookSession.crewmate}
                        hideCollectionInHeader
                        hideFooter
                        hideIfNoName
                        noWrapName
                        showClassInHeader />
                    : <SilhouetteWrapper><CrewSilhouetteCard /></SilhouetteWrapper>}
                </div>
              </CrewContainer>
            )
        }
        leftButton={{
          label: 'Skip Story',
          onClick: confirmExitStoryMode,
          props: {
            disabled: (storySession.isLastPage && bookSession.isLastStory) ? 'true' : undefined
          }
        }}
        rightButton={{
          label: 'Back',
          onClick: (bookSession.currentStoryIndex > 0 || storySession.currentStep > 0) ? onUndoPath : onGoBack,
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
      {confirmingExitStoryMode && (
        <ConfirmationDialog
          body={(
            <div style={{ fontSize: '110%' }}>
              <div>
                Exiting story mode will allow you to select your character's traits
                all at once, in contrast to deriving their traits from the choices you
                make for them through their unique origin story.
              </div>
              <div style={{ marginTop: 15 }}>
                You will not be able to return to story mode once you exit.
              </div>
            </div>
          )}
          onConfirm={onConfirmExitStoryMode}
          onReject={() => setConfirmingExitStoryMode()}
        />
      )}
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
