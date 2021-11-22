import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { BsChevronDoubleDown as SelectIcon } from 'react-icons/bs';

import useBook from '~/hooks/useBook';
import useCreateStorySession from '~/hooks/useCreateStorySession';
import useOwnedCrew from '~/hooks/useOwnedCrew';
import useStore from '~/hooks/useStore';
import Details from '~/components/Details';
import NavIcon from '~/components/NavIcon';
import TitleWithUnderline from '~/components/TitleWithUnderline';
import { CheckIcon, ExpandedIcon, CrewMemberIcon, LockIcon, WarningOutlineIcon } from '~/components/Icons';
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

const SectionBody = styled.div`
  height: calc(100% - 40px - 1.5em);
  margin-top: 1.5em;
  overflow: auto;
  scrollbar-width: thin;
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

const PartSection = styled.div`
  margin-top: 1.5em;
  &:first-child { margin-top: 0; }
  & > div {
    display: flex;
    justifyContent: space-between;
    height: 24px;
    width: 100%; 
  }
`;
const PartTitle = styled.div`
  div:nth-child(1) {
    color: ${p => p.theme.colors.main};
    flex: 1;
    font-size: 13px;
  }
  div:nth-child(2) {
    font-size: 20px;
  }
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

/* TODO:
 - sound fx?
 - "no crew" message
 - enhancement:
  - "scroll to" firstIncompleteStory
  - use theme on heights and paddings and font sizes?
 - mobile:
  - handle word wrapping / truncating for smaller devices
*/

const CrewAssignments = (props) => {
  const { id: bookId } = useParams();
  const history = useHistory();

  const createStorySession = useCreateStorySession();
  const { data: crew } = useOwnedCrew();
  const { data: book, isError } = useBook(bookId);
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [selectedStory, setSelectedStory] = useState();

  const selectStory = useCallback((story) => () => {
    setSelectedStory(story);
  }, []);

  const selectCrew = useCallback((crewId) => async () => {
    if (crewId) {
      let session = (selectedStory.sessions || []).find((s) => s.owner === crewId);

      // if no session yet, create one
      // TODO: loading... (disable buttons?)
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
        history.push(`/crew-assignment/${session.id}`);
      }

      // TODO: report error?
    }
  }, [selectedStory]);

  useEffect(() => {
    if (book && crew) {
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

            // find first incomplete story
            if (firstIncompleteStory === null && story.status !== 'complete') {
              firstIncompleteStory = story;
            }
          } else {
            story.status = 'locked';
          }
        });
      });
      setSelectedStory(firstIncompleteStory);
    }
  }, [book, crew]);

  // TODO: show loading?
  if (!book) {
    if (isError) {
      createAlert({
        type: 'GenericLoadingError',
        label: 'crew assignment collection',
        level: 'warning',
      });
      history.push('/');
    }
    return null;
  }

  const { title, parts } = book;
  return (
    <Details title="Assignments">
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%'
      }}>
        <div style={{ flex: 1 }}>
          <BookHeader>
            <BookIcon><CrewMemberIcon /></BookIcon>
            <TitleWithUnderline>{title}</TitleWithUnderline>
          </BookHeader>

          <SectionBody style={{ paddingRight: 10 }}>
            {parts.map(({ title, stories }, x) => (
              <PartSection key={x}>
                <PartTitle>
                  <div>{title}</div>
                  <div><ExpandedIcon /></div>
                </PartTitle>
                <span>
                  {stories.map(({ story }, i) => {
                    if (!story) return null;
                    const { id, title, ready, partial, status } = story;
                    return (
                      <ChapterRow
                        key={id || i}
                        onClick={selectStory(status == 'locked' ? null : story)}
                        status={status}>
                        <DiamondContainer connect={i > 0}>
                          <NavIcon selected={id === selectedStory?.id} />
                        </DiamondContainer>
                        <ChapterRowInner index={x} selected={id === selectedStory?.id}>
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
                </span>
              </PartSection>
            ))}
          </SectionBody>
        </div>

        <div style={{ width: 40 }} />
        
        <div style={{ flex: 1 }}>
          <SectionHeader style={{
            justifyContent: 'flex-end',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <SectionTitle>Owned Crew ({crew?.length || 0})</SectionTitle>
            <SectionSubtitle>Select a Crew Member to begin the assignment with:</SectionSubtitle>
          </SectionHeader>
          <SectionBody style={{ display: 'flex', flexWrap: 'wrap', paddingLeft: 3, paddingTop: 3 }}>
            {(crew || []).map((c) => {
              return (
                <div key={c.i} style={{ padding: '0 12px 12px 0' }}>
                  <CrewCard
                    crew={c}
                    config={crewStates[selectedStory?.crewStatuses[c.i] || 'notReady']}
                    onClick={selectCrew(c.i)} />
                </div>
              );
            })}
          </SectionBody>
        </div>
      </div>
    </Details>
  );
};

export default CrewAssignments;
