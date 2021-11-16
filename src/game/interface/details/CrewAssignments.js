import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { BsChevronDoubleDown as SelectIcon } from 'react-icons/bs';

import useCrewAssignments from '~/hooks/useCrewAssignments';
import useOwnedCrew from '~/hooks/useOwnedCrew';
import Details from '~/components/Details';
import NavIcon from '~/components/NavIcon';
import TitleWithUnderline from '~/components/TitleWithUnderline';
import { CheckIcon, CollapsedIcon, ExpandedIcon, CrewMemberIcon, LockIcon, WarningOutlineIcon } from '~/components/Icons';
import CrewCard from './crewAssignments/CrewCard';

import theme from '~/theme.js';

const books = [{
  id: '101',
  title: 'Genesis',
  parts: [
    {
      title: 'Prologue',
      expanded: true,
      chapters: [
        { id: '1', title: 'Earth and the Void', ready: 0, partial: 0, complete: 4 },
      ]
    },
    {
      title: 'Part 1: Arrival',
      expanded: true,
      chapters: [
        { id: '2', title: 'Chapter 1: The Planets', ready: 2, partial: 1, complete: 1 },
        { id: '3', title: 'Chapter 2: The Proposal', ready: 3, partial: 1, complete: 0 },
        { id: '4', title: 'Chapter 3: The Belt', ready: 1, partial: 0, complete: 0 },
      ]
    },
    {
      title: 'Part 2: The Arvad',
      expanded: true,
      chapters: [
        { id: '5', title: 'Coming Soon', ready: -1, },
        { id: '6', title: 'Coming Soon', ready: -1, },
      ]
    },
    {
      title: 'Part 3: Adalia Prime',
      expanded: true,
      chapters: [
        { id: '7', title: 'Coming Soon', ready: -1, },
        { id: '8', title: 'Coming Soon', ready: -1, },
      ]
    }
  ]
}];

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

// TODO: use theme on heights and paddings and font sizes?
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

// TODO: only change cursor if clickable
const ChapterRow = styled.div`
  align-items: center;
  color: ${p => p.status === 'locked' ? '#AAA' : 'white'};
  cursor: ${({ theme }) => theme.cursors.active};
  display: flex;
  flex-direction: row;
  height: 48px;
`;

const ChapterRowInner = styled.div`
  border-bottom: 1px solid rgba(255,255,255,0.2);
  flex: 1;
  height: 100%;
  margin-left: 0.75em;
  padding: 6px 0;

  ${ChapterRow}:first-child & {
    border-top: 1px solid rgba(255,255,255,0.2);
  }

  & > div {
    align-items: center;
    background-color: ${p => p.selected ? 'rgba(255, 255, 255, 0.2)' : 'none'};
    display: flex;
    font-size: 13px;
    height: 100%;
    padding: 0 6px 0 12px;
    transition: background-color 200ms ease;

    ${ChapterRow}:hover & {
      background-color: rgba(255, 255, 255, 0.25);
    }

    & > div {
      flex: 1;
      font-size: 17px;
    }
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
      return `border: 0.2em solid ${p.onColor};`;
    } else if (p.status === 'full') {
      return `background: ${p.onColor};`;
    } else if (p.status === 'partial') {
      return `background: linear-gradient(to right, ${p.offColor} 50%, ${p.onColor} 50%);`;
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
      <span style={{ color, marginRight: 6 }}>{crewReady}</span>
      {status === 'complete'
        ? (
          <CheckIcon style={{ color }} />
        )
        : (
          <ProgressIcon
            size={'1em'}
            onColor={color}
            offColor={'#003f54'}
            status={status}
          />
        )}
    </>
  );
}

// TODO: ...
const firstIncompleteStoryId = '2';

const CrewAssignments = (props) => {
  const { data: crew } = useOwnedCrew();
  // TODO: uncomment this
  //const { data: stories } = useCrewAssignments();

  const [story, setStory] = useState(firstIncompleteStoryId);

  const { title, parts } = books[0];

  const selectStory = (id) => () => {
    // TODO: make sure enabled
    setStory(id);
  };
  const selectCrew = (id) => () => {
    // TODO: make sure enabled
    // TODO: start story
  };

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
            {parts.map(({ title, chapters, expanded }, i) => (
              <PartSection key={i}>
                <PartTitle>
                  <div>{title}</div>
                  <div>{expanded ? <ExpandedIcon /> : <CollapsedIcon />}</div>
                </PartTitle>
                <span>
                  {/* TODO:
                    - "coming soon" should not have hover effect
                    - handle word wrapping / truncating for smaller devices
                    - scroll to first do-able story?
                    --
                    - "no-crew" message
                  */}
                  {/* TODO: is this safer as table for diamond / title split (i.e. in case of wrapping)? */}
                  {chapters.map(({ id, title, ready, partial, complete }, i) => {
                    let status = 'notready';
                    if (ready === -1) {
                      status = 'locked';
                    } else if (complete === crew?.length) {
                      status = 'complete';
                    } else if (ready + partial === crew?.length) {
                      status = 'full';
                    } else if (ready + partial + complete === crew?.length) {
                      status = 'partial';
                    }
                    
                    return (
                      <ChapterRow
                        key={id}
                        onClick={selectStory(id)}
                        status={status}>
                        <DiamondContainer connect={i > 0}>
                          <NavIcon selected={id === story} />
                        </DiamondContainer>
                        <ChapterRowInner index={i} selected={id === story}>
                          <div>
                            <div>{title}</div>
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
            {(crew || []).map((c, i) => (
              <CrewCard
                key={c.i}
                crew={c}
                config={crewStates[Object.keys(crewStates)[i]]}
                onClick={selectCrew(c)} />
            ))}
          </SectionBody>
        </div>
      </div>
    </Details>
  );
};

export default CrewAssignments;
