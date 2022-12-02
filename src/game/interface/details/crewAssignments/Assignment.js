import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { toCrewClass } from '@influenceth/sdk';

import useBook from '~/hooks/useBook';
import useCrew from '~/hooks/useCrew';
import useStorySession from '~/hooks/useStorySession';
import useStore from '~/hooks/useStore';
import Button from '~/components/Button';
import ConfirmationDialog from '~/components/ConfirmationDialog';
import CrewCard from '~/components/CrewCard';
import CrewClassIcon from '~/components/CrewClassIcon';
import Details from '~/components/DetailsModal';
import { ArvadIcon, BackIcon } from '~/components/Icons';
import Loader from '~/components/Loader';
import NavIcon from '~/components/NavIcon';
import SvgFromSrc from '~/components/SvgFromSrc';

import theme from '~/theme.js';

const foldOffset = 28;
const belowFoldMin = 256;

const opacityTransition = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

const InvisibleImage = styled.img`
  display: none;
`;

const CoverImage = styled.div`
  height: calc(50% + ${foldOffset}px);
  max-height: calc(100% - ${foldOffset}px - ${belowFoldMin}px);

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    height: 33%;
    max-height: none;
  }

  &:before {
    background-image: url(${p => p.src});
    background-repeat: no-repeat;
    background-position: ${p => p.center || 'center center'};
    background-size: cover;
    content: '';
    display: block;
    opacity: ${p => p.ready ? 1 : 0};
    height: 100%;
    mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 75%, transparent 100%);
    transition:
      background-position 750ms ease-out,
      opacity 750ms ease-out;
  }
`;

const aboveFoldHeight = 88;
const aboveFoldMobileMargin = -30;
const AboveFold = styled.div`
  height: ${aboveFoldHeight}px;
  margin-top: -${aboveFoldHeight}px;
  opacity: 0;
  padding: 0 35px;
  position: relative;
  z-index: 1;

  opacity: ${p => p.ready ? 1 : 0};
  transition: opacity 750ms ease-out;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    height: ${aboveFoldHeight * 0.72}px;
    margin-top: ${aboveFoldMobileMargin}px;
    padding: 0 25px;
  }
`;

const BelowFold = styled.div`
  display: flex;
  flex-direction: row;
  height: calc(50% - ${foldOffset}px);
  padding: 10px 0 10px 35px;
  position: relative;
  @media (min-width: ${p => p.theme.breakpoints.mobile}px) {
    min-height: ${belowFoldMin}px;
  }
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    height: calc(67% - ${aboveFoldHeight + aboveFoldMobileMargin}px);
    padding: 10px 0 0;
  }

  & > * {
    opacity: 0;
    &:nth-child(1) {
      animation: ${opacityTransition} 600ms normal forwards ease 200ms;
    }
    &:nth-child(2) {
      animation: ${opacityTransition} 600ms normal forwards ease 400ms;
    }
    &:nth-child(3) {
      animation: ${opacityTransition} 600ms normal forwards ease 600ms;
    }
  }
`;

const CrewContainer = styled.div`
  flex: 0 1 275px;
  min-width: 210px;
  padding: 0 12px 12px 0;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: none;
  }
`;

const MobileCrewContainer = styled.div`
  display: none;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    align-items: center;
    display: flex;
    & > div:first-child {
      flex: 1;
    }
    & > div:last-child {
      font-size: 13px;
    }
  }
`;

const BackButton = styled.div`
  align-items: center;
  cursor: ${p => p.theme.cursors.active};
  display: inline-flex;
  filter: drop-shadow(1px -1px 1px rgba(0, 0, 0, 1));
  font-size: 14px;
  font-weight: bold;
  ${p => p.isMintingStory
    ? `
      position: relative;
      bottom: -36px;
    `
    : `margin-bottom: 1em;`
  }
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    bottom: 0;
    margin-bottom: 1em;
  }

  text-transform: uppercase;
  & *:first-child {
    margin-right: 0.75em;
  }
  &:hover {
    color: white;
  }

  ${p => p.disableAndHide && `
    cursor: ${p.theme.cursors.default};
    opacity: 0;
    pointer-events: none;
  `}
`;

const Title = styled.div`
  filter: drop-shadow(1px -1px 1px rgba(0, 0, 0, 1));
  font-size: 36px;
  pointer-events: none;
  ${p => p.ownerType === 'CREW' && 'text-align: center;'}

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    font-size: 28px;
    text-align: left;
  }
`;

const Body = styled.div`
  flex: 0 1 775px;
  font-size: 90%;
  height: 100%;
  line-height: 1.25em;
  overflow: auto;
  padding: 0 25px 25px 25px;
  position: relative;
  scrollbar-width: thin;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding-top: 5px;
  }
`;

const Flourish = styled.div`
  display: flex;
  flex: 1 0 250px;
  flex-direction: column;
  overflow: hidden;
  text-align: center;

  @media (max-width: 1300px) {
    display: none;
  }

  & > h4 {
    margin-bottom: 16px;
  }
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

const FlourishCentered = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: center;
`;

const FlourishImageContainer = styled(FlourishCentered)`
  color: white;
  font-size: ${p => p.shrinkIcon ? '80px' : '120px'};
  margin-top: ${p => p.shrinkIcon ? '24px' : '16px'};
  opacity: 0.1;
`;

const Path = styled.div`
  cursor: ${p => p.theme.cursors.active};
  background-color: rgba(255, 255, 255, 0);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 6px 0;
  transition: background-color 200ms ease;

  &:first-child {
    border-top: 1px solid rgba(255, 255, 255,0.2);
  }

  & > div {
    align-items: flex-start;
    display: flex;
    padding: 6px 16px 6px 0;

    & > span:first-child {
      color: white;
      font-weight: bold;
      text-align: center;
      width: 3em;
    }
    & > span:last-child {
      color: ${p => p.theme.colors.main};
      flex: 1;
      transition: color 200ms ease;
    }
  }

  ${p => p.selected ? '&' : '&:hover'} > div {
    background-color: rgba(255, 255, 255, 0.2);
    & > span:last-child {
      color: white;
    }
  }
`;

const PageContent = styled.div`
  color: #aaa;
  white-space: pre-line;
  margin-bottom: 1.5em;
`;
const PagePrompt = styled.div`
  color: white;
  margin-bottom: 1em;
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

const CrewAssignment = (props) => {
  const { id: sessionId } = useParams();
  const history = useHistory();
  const { crewMemberMap} = useCrew();
  const { currentStep, storyState, commitPath, loadingPath } = useStorySession(sessionId);
  const { data: book } = useBook(storyState?.book)
  const playSound = useStore(s => s.dispatchSoundRequested);

  const [coverImageLoaded, setCoverImageLoaded] = useState();
  const [selection, setSelection] = useState();

  const isMintingStory = (storyState?.tags || []).includes('ADALIAN_RECRUITMENT');
  const headerTitle = isMintingStory ? 'Crewmate Creation' : 'Crew Assignments';
  const totalSteps = isMintingStory ? 5 : 3;

  let onCloseDestination;
  let onCloseDestinationLabel;
  if (storyState?.book) {
    onCloseDestination = `/crew-assignments/${storyState?.book}/${storyState?.story}`;
    onCloseDestinationLabel = book?.title;
  } else if (Object.keys(crewMemberMap || {}).length > 0) {
    onCloseDestination = '/owned-crew';
    onCloseDestinationLabel = 'Crew Management';
  } else {
    onCloseDestination = '/';
    onCloseDestinationLabel = 'The Belt';
  }

  // on step change, clear selection (to close modal)
  useEffect(() => {
    setSelection();
  }, [currentStep]);

  const onCoverImageLoad = useCallback(() => {
    setCoverImageLoaded(storyState?.image);
  }, [storyState?.image]);

  const selectPath = useCallback((path) => () => {
    playSound('effects.click');

    // if only one choice, don't need to confirm
    if (storyState.linkedPaths?.length === 1) {
      commitPath(path.path);
    // else, confirm in modal
    } else {
      setSelection(path);
    }
  }, [commitPath, playSound, storyState]);

  const confirmPath = useCallback(() => {
    playSound('effects.click');
    commitPath(selection.path);
  }, [commitPath, playSound, selection]);

  const goBack = useCallback(() => {
    playSound('effects.click');
    history.push(onCloseDestination);
  }, [history, playSound, onCloseDestination]);

  const undoPath = useCallback(() => {
    commitPath(-1);
  }, [commitPath]);

  const finish = useCallback(() => {
    playSound('effects.success');
    history.push(isMintingStory
      ? `/crew-assignment/${sessionId}/create`
      : `/crew-assignment/${sessionId}/complete`
    );
  }, [history, playSound, sessionId, isMintingStory]);

  const crew = useMemo(
    () => crewMemberMap && storyState && crewMemberMap[storyState.owner],
    [storyState, crewMemberMap]
  );

  const contentReady = storyState && (crew || storyState.ownerType !== 'CREW_MEMBER');
  const pathIsReady = contentReady && storyState.image === coverImageLoaded && !loadingPath;
  return (
    <>
      <Details
        edgeToEdge
        onCloseDestination={onCloseDestination}
        title={headerTitle}
        width="max">
        {!contentReady && <Loader />}
        {contentReady && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <InvisibleImage src={storyState.image} onLoad={onCoverImageLoad} />
            <CoverImage
              src={coverImageLoaded}
              center={storyState.imageCenter}
              ready={storyState.image === coverImageLoaded} />
            <AboveFold ready={!!coverImageLoaded}>
              {storyState.features?.canGoBack && currentStep > 0 ? (
                <BackButton onClick={undoPath} isMintingStory={isMintingStory}>
                  <BackIcon /> Previous Selection
                </BackButton>
              ) : (
                <BackButton onClick={goBack} isMintingStory={isMintingStory}>
                  <BackIcon /> Back to {onCloseDestinationLabel}
                </BackButton>
              )}
              <Title ownerType={storyState.ownerType} isMintingStory={isMintingStory}>{storyState.title}</Title>
              {crew && (
                <MobileCrewContainer>
                  <div>
                    <b>{crew.name || `Crew Member #${crew.i}`}</b>
                    {' '}<CrewClassIcon crewClass={crew.crewClass} />
                  </div>
                  <div>{toCrewClass(crew.crewClass) || 'Unknown Class'}</div>
                </MobileCrewContainer>
              )}
            </AboveFold>
            <BelowFold>
              {!pathIsReady && <Loader />}
              {pathIsReady && (
                <>
                  <CrewContainer>
                    {crew && <CrewCard crew={crew} />}
                  </CrewContainer>
                  <Body>
                    <PageContent>{storyState.content}</PageContent>
                    {(storyState.linkedPaths || []).length > 0
                      ? (
                        <>
                          <PagePrompt>{storyState.prompt}</PagePrompt>
                          <div>
                            {storyState.linkedPaths.map((linkedPath, i) => (
                              <Path key={linkedPath.path}
                                selected={linkedPath.path === selection?.id}
                                onClick={selectPath(linkedPath)}>
                                <div>
                                  <span>{String.fromCharCode(65 + i)}</span>
                                  <span>{linkedPath.text}</span>
                                </div>
                              </Path>
                            ))}
                          </div>
                        </>
                      )
                      : (
                        <Button
                          onClick={finish}
                          style={{ margin: '0 auto' }}>{isMintingStory ? 'Create Your Adalian' : 'Finish'}</Button>
                      )
                    }
                  </Body>
                  <Flourish>
                    <h4>{Math.min(totalSteps, currentStep + 1)} of {totalSteps}</h4>
                    <FlourishCentered>
                      {Array.from({ length: totalSteps }, (x, i) => {
                        let color = '#777';
                        if (i < currentStep) {
                          color = theme.colors.main;
                        } else if (i === currentStep) {
                          color = '#FFF';
                        }
                        return (
                          <React.Fragment key={i}>
                            {i > 0 && <NavSpacer steps={totalSteps} completed={i <= currentStep} />}
                            <NavIcon
                              animate
                              selected={i === currentStep}
                              size="1em"
                              color={color} />
                          </React.Fragment>
                        );
                      })}
                    </FlourishCentered>
                    <FlourishImageContainer shrinkIcon={!(book && book.icon)}>
                      {book && book.icon && <SvgFromSrc src={book.icon} />}
                      {!(book && book.icon) && <ArvadIcon />}
                    </FlourishImageContainer>
                  </Flourish>
                </>
              )}
            </BelowFold>
          </div>
        )}
      </Details>
      {selection && (
        <ConfirmationDialog
          title="Your Selection:"
          body={(
            <>
              <PagePrompt>{storyState.prompt}</PagePrompt>
              <PromptDetails>{selection.text}</PromptDetails>
            </>
          )}
          loading={!!loadingPath}
          onConfirm={confirmPath}
          onReject={selectPath()}
        />
      )}
    </>
  );
};

export default CrewAssignment;
