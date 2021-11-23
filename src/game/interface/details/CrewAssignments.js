import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useWeb3React } from '@web3-react/core';
import { BsChevronDoubleDown as SelectIcon } from 'react-icons/bs';

import useBook from '~/hooks/useBook';
import useCreateStorySession from '~/hooks/useCreateStorySession';
import useMintableCrew from '~/hooks/useMintableCrew';
import useOwnedCrew from '~/hooks/useOwnedCrew';
import useStore from '~/hooks/useStore';
import Details from '~/components/Details';
import Loader from '~/components/Loader';
import NavIcon from '~/components/NavIcon';
import TitleWithUnderline from '~/components/TitleWithUnderline';
import { CheckIcon, CollapsedIcon, ExpandedIcon, CrewMemberIcon, LockIcon, WarningOutlineIcon } from '~/components/Icons';
import CrewCard from './crewAssignments/CrewCard';

import theme from '~/theme.js';

const crewStates = {
  ready: {
    alwaysOn: [],
    button: 'Begin Assignment',
    clickable: true,
    icon: <SelectIcon />,
    rgb: '255, 255, 255',
  },
  notReady: {
    alwaysOn: ['button', 'caption', 'icon'],
    button: 'Not Ready',
    caption: 'This character must finish a previous chapter first.',
    fade: true,
    icon: <WarningOutlineIcon />,
    rgb: theme.colors.mainRGB,
  },
  complete: {
    alwaysOn: ['button', 'icon'],
    button: 'Finished',
    fade: true,
    icon: <CheckIcon />,
    rgb: theme.colors.successRGB,
  },
  incomplete: {
    alwaysOn: ['button'],
    button: 'Continue »',
    clickable: true,
    icon: <SelectIcon />,
    rgb: '255, 255, 255',
  }
};

const SectionContainer = styled.div`
  flex: 1;
  position: relative;
`;

const SectionBody = styled.div`
  height: calc(100% - 40px - 1.5em);
  margin-top: 1.5em;
  overflow: auto;
  scrollbar-width: thin;
`;

const CrewSection = styled(SectionBody)`
  display: flex;
  flex-wrap: wrap;
  padding-left: 3px;
  padding-top: 3px;
  & > div {
    flex: 0 1 50%;
    padding: 0 12px 12px 0;
    @media (min-width: ${p => p.theme.breakpoints.lg}px) {
      flex-basis: 33%;
    }
  }
`;

const CrewlessSection = styled(SectionBody)`
  padding: 15px;
  background: rgba(51, 51, 51, 0.5);
  text-align: center;
  & > div {
    & > a {
      white-space: nowrap;
    }
  } 
`;

const SectionHeader = styled.div`
  height: 40px;
`;

const SectionTitle = styled.div`
  font-size: 16px;  
  font-weight: bold;
`;

const SectionSubtitle = styled.div`
  font-size: 13px;  
  line-height: 1.6em;
  opacity: 0.6;
`;

const BookHeader = styled(SectionHeader)`
  align-items: flex-end;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  color: ${p => p.theme.colors.main};
  display: flex;
  font-size: 16px;
  text-transform: uppercase;

  & > * {
    height: 32px;
  }
`;
const BookIcon = styled.div`
  font-size: 1.5em;  
  margin-right: 0.5em;
`;

const PartTitle = styled.div`
  cursor: ${p => p.theme.cursors.active};
  div:nth-child(1) {
    color: ${p => p.theme.colors.main};
    flex: 1;
    font-size: 13px;
  }
  div:nth-child(2) {
    font-size: 20px;
  }
`;
const PartSection = styled.div`
  margin-top: 1.5em;
  &:first-child { margin-top: 0; }
  & > ${PartTitle} {
    display: flex;
    justifyContent: space-between;
    height: 24px;
    width: 100%; 
  }
`;

const ChaptersContainer = styled.div`
  max-height: ${p => p.collapsed ? '1px' : '400px'};
  overflow: hidden;
  transition: max-height 250ms ease-out;
`;

const ChapterRowInner = styled.div`
  border-bottom: 1px solid rgba(255,255,255,0.2);
  flex: 1;
  height: 100%;
  margin-left: 0.75em;
  padding: 6px 0;

  & > div {
    align-items: center;
    background-color: ${p => p.selected ? 'rgba(255, 255, 255, 0.2)' : 'none'};
    display: flex;
    font-size: 13px;
    height: 100%;
    padding: 0 6px 0 12px;
    transition: background-color 200ms ease;

    & > div {
      flex: 1;
      font-size: 17px;
    }
  }
`;

const ChapterRow = styled.div`
  align-items: center;
  color: ${p => p.status === 'locked' ? '#AAA' : 'white'};
  cursor: ${p => p.status === 'locked' ? null : p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  height: 48px;

  &:first-child ${ChapterRowInner} {
    border-top: 1px solid rgba(255,255,255,0.2);
  }

  &:hover ${ChapterRowInner} > div {
    background-color: ${p => p.status === 'locked' ? null : 'rgba(255, 255, 255, 0.25)'};
  }
`;

const diamondConnectionHeight = 20;
const DiamondContainer = styled.div`
  align-items: center;
  display: flex;
  height: 100%;
  position: relative;
  width: 1em;
  ${(p) => p.connect && `
    &:before {
      content: '';
      position: absolute;
      height: ${diamondConnectionHeight}px;
      width: 0;
      border-left: 1px dotted #AAA;
      bottom: calc(100% - ${diamondConnectionHeight / 2}px);
      left: calc(50% - 1px);
    }`}
`;

const ProgressIcon = styled.span`
  border-radius: 50%;
  display: block;
  height: ${p => p.size};
  width: ${p => p.size};
  ${p => {
    if (p.status === 'notready') {
      return `border: 0.2em solid ${p.activeColor};`;
    } else if (p.status === 'full') {
      return `background: ${p.activeColor};`;
    } else if (p.status === 'partial') {
      return `background: linear-gradient(to right, ${p.inactiveColor} 50%, ${p.activeColor} 50%);`;
    }
    return '';
  }}
`;

const ChapterProgress = ({ crewReady, status }) => {
  if (status === 'locked') {
    return <LockIcon style={{ opacity: 0.7 }} />;
  }

  const color = status === 'complete' ? theme.colors.success : theme.colors.main;
  return (
    <>
      <span style={{ color, marginRight: 6 }}>{crewReady > -1 ? crewReady : ''}</span>
      {status === 'complete'
        ? <CheckIcon style={{ color }} />
        : (
          <ProgressIcon
            size={'1em'}
            activeColor={color}
            inactiveColor={'#003f54'}
            status={status}
          />
      )}
    </>
  );
}

const CrewAssignments = (props) => {
  const { id: bookId } = useParams();
  const history = useHistory();
  const { account } = useWeb3React();

  const createStorySession = useCreateStorySession();
  const { data: crew } = useOwnedCrew();
  const { data: mintable } = useMintableCrew();
  const { data: book, isError } = useBook(bookId);
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const playSound = useStore(s => s.dispatchSoundRequested);

  const [selectedStory, setSelectedStory] = useState();
  const [collapsedParts, setCollapsedParts] = useState([]);

  const selectStory = useCallback((story) => () => {
    if (story) {
      playSound('effects.click');
      setSelectedStory(story);
    } else {
      playSound('effects.failure');
    }
  }, [playSound]);

  const selectCrew = useCallback((crewId) => async () => {
    if (crewId) {
      let session = (selectedStory.sessions || []).find((s) => s.owner === crewId);

      // if no session yet, create one
      if (!session) {
        session = await new Promise((resolve, reject) => {
          createStorySession.mutate({
            bookId,
            storyId: selectedStory.id,
            crewId
          }, {
            onSuccess: resolve,
            onError: reject
          })
        });
      }

      if (session) {
        playSound('effects.success');
        history.push(`/crew-assignment/${session.id}`);
      } else {
        playSound('effects.failure');
      }
    } else {
      playSound('effects.failure');
    }
  }, [bookId, createStorySession, history, playSound, selectedStory]);

  useEffect(() => {
    if (book && crew) {
      let lastStory = null;
      let firstIncompleteStory = null;
      let crewReadyForNext = crew.map(({ i }) => i);
      book.parts.forEach(({ stories }) => {
        stories.forEach((item, i) => {
          if (!item.story) item.story = { id: `placeholder_${i}` };

          const { story } = item;
          if (story.title) {
            story.crewStatuses = {};
            story.ready = 0;
            story.partial = 0;
            story.complete = 0;

            const crewCompleted = [];
            crew.forEach(({ i }) => {
              if (crewReadyForNext.includes(i)) {
                const crewSession = (story.sessions || []).find((s) => s.owner === i);
                if (crewSession && crewSession.isComplete) {
                  story.complete++;
                  story.crewStatuses[i] = 'complete';
                  crewCompleted.push(i);
                } else if (crewSession && !crewSession.isComplete) {
                  story.partial++;
                  story.crewStatuses[i] = 'incomplete';
                } else {
                  story.ready++;
                  story.crewStatuses[i] = 'ready';
                }
              } else {
                story.crewStatuses[i] = 'notReady';
              }
            });
            crewReadyForNext = crewCompleted;

            // set story status
            if (story.complete === crew?.length) {
              story.status = 'complete';
            } else if (story.ready + story.partial === crew?.length) {
              story.status = 'full';
            } else if (story.ready + story.partial + story.complete === crew?.length) {
              story.status = 'partial';
            } else {
              story.status = 'notready';
            }

            // find first incomplete story (and keep track of last story as fallback)
            if (firstIncompleteStory === null && story.status !== 'complete') {
              firstIncompleteStory = story;
            }
            lastStory = story;
          } else {
            story.status = 'locked';
          }
        });
      });
      setSelectedStory(firstIncompleteStory || lastStory);
    }
  }, [book, crew]);

  const togglePart = useCallback((partId) => () => {
    playSound('effects.click');
    if (collapsedParts.includes(partId)) {
      setCollapsedParts(
        collapsedParts.filter((p) => p !== partId)
      );
    } else {
      setCollapsedParts([
        ...collapsedParts,
        partId
      ]);
    }
  }, [collapsedParts, playSound]);

  if (!book && isError) {
    createAlert({
      type: 'GenericLoadingError',
      label: 'crew assignment collection',
      level: 'warning',
    });
    history.push('/');
  }

  const { title, parts } = book || {};
  return (
    <Details title="Assignments">
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%'
      }}>
        <SectionContainer>
          {!book && <Loader />}
          {book && (
            <>
              <BookHeader>
                <BookIcon><CrewMemberIcon /></BookIcon>
                <TitleWithUnderline>{title}</TitleWithUnderline>
              </BookHeader>

              <SectionBody style={{ paddingRight: 10 }}>
                {parts.map(({ title, stories }, x) => {
                  const isCollapsed = collapsedParts.includes(title);
                  return (
                    <PartSection key={x}>
                      <PartTitle onClick={togglePart(title)}>
                        <div>{title}</div>
                        <div>{isCollapsed ? <CollapsedIcon /> : <ExpandedIcon />}</div>
                      </PartTitle>
                      <ChaptersContainer collapsed={isCollapsed}>
                        {stories.map(({ story }, i) => {
                          const { id, title, ready, partial, status } = (story || { status: 'locked' });
                          return (
                            <ChapterRow
                              key={id || `placeholder_${i}`}
                              onClick={selectStory(status === 'locked' ? null : story)}
                              status={status}>
                              <DiamondContainer connect={i > 0}>
                                <NavIcon selected={selectedStory && id === selectedStory.id} />
                              </DiamondContainer>
                              <ChapterRowInner index={x} selected={selectedStory && id === selectedStory.id}>
                                <div>
                                  <div>{title || 'Coming Soon'}</div>
                                  <ChapterProgress
                                    crewReady={ready + partial}
                                    status={status}
                                  />
                                </div>
                              </ChapterRowInner>
                            </ChapterRow>
                          )
                        })}
                      </ChaptersContainer>
                    </PartSection>
                  );
                })}
              </SectionBody>
            </>
          )}
        </SectionContainer>

        <div style={{ width: 40 }} />
        
        <SectionContainer>
          {account && !crew && <Loader />}
          {!(account && !crew) && (
            <>
              <SectionHeader style={{
                justifyContent: 'flex-end',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <SectionTitle>Owned Crew ({crew?.length || 0})</SectionTitle>
                <SectionSubtitle>Select a Crew Member to begin the assignment with:</SectionSubtitle>
              </SectionHeader>
              {crew && crew.length > 0
                ? (
                  <CrewSection>
                    {crew.map((c) => {
                      const crewStatus = selectedStory?.crewStatuses[c.i] || 'notReady';
                      return (
                        <div key={c.i}>
                          <CrewCard
                            crew={c}
                            config={crewStates[crewStatus]}
                            onClick={selectCrew(crewStatus !== 'notReady' ? c.i : null)} />
                        </div>
                      );
                    })}
                  </CrewSection>
                )
                : (
                  <CrewlessSection>
                    <h4>You must have a crew to complete crew assignments.</h4>
                    <div>
                      <a href={`${process.env.REACT_APP_OPEN_SEA_URL}/collection/influence-crew`} target="_blank" rel="noreferrer">Click here</a>
                      {' '}to acquire crew members through trade
                      {true || mintable?.length
                        ? (
                          <span>
                            {', '}or <Link to="/owned-crew">click here</Link> to mint your own.
                          </span>
                        ) : '.'}
                    </div>
                  </CrewlessSection>
                )
              }
            </>
          )}
        </SectionContainer>
      </div>
    </Details>
  );
};

export default CrewAssignments;
