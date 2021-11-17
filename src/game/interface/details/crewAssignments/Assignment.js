import React, { useCallback, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';

import orbitalPeriodImage from '~/assets/images/orbital-period.png';
import useCrewAssignments from '~/hooks/useCrewAssignments';
import useOwnedCrew from '~/hooks/useOwnedCrew';
import Button from '~/components/Button';
import Details from '~/components/Details';
import Dialog from '~/components/Dialog';
import { BackIcon } from '~/components/Icons';
import NavIcon from '~/components/NavIcon';
import CrewCard from './CrewCard';

import theme from '~/theme.js';

const story = {
  title: 'Earth and the Void',
  coverImg: 'https://images.fineartamerica.com/images/artworkimages/mediumlarge/2/spacex-bfr-leaving-earth-filip-hellman.jpg',
  content: `A century and a half ago, humanity started fleeing a dying Earth aboard a fleet of massive generational chips, each with a crew of thousands.

Your ancestor was lucky enough to earn a spot on one of them.`,
  prompt: 'How did they secure that spot?',
  paths: [
    {
      id: '23',
      content: 'Labour. They helped build the fleet, earning one spot for one of their children to fly away to survival.'
    },
    {
      id: '24',
      content: 'Merit. The mission required exceptional minds, who earned a spot in exchange for teaching the first generation born aboard the skills that would be needed for survival.'
    },
    {
      id: '25',
      content: 'Wealth. Even at the end of all things, money and power has value. It isn\'t glamorous, but it is what it is. They bought their ticket.',
    },
    {
      id: '26',
      content: 'Luck. Hope is a powerful force, and people will bet everything on long shots if there\'s nothing else. But it worked out for them, and they won a single place aboard in the Berth Lotteries.'
    }
  ]
};

const CoverImage = styled.div`
  height: calc(100% - 310px);
  &:before {
    background-image: url(${p => p.src});
    background-repeat: no-repeat;
    background-position: center center;
    background-size: cover;
    content: '';
    display: block;
    height: ${p => p.ready ? '100%' : '0'};
    mask-image: linear-gradient(to bottom, black 75%, transparent 100%);
    transition: height 1000ms ease;
  }
`;

const AboveFold = styled.div`
  height: 88px;
  margin-top: -88px;
  padding: 0 35px;
  position: relative;
  z-index: 1;
`;

const BelowFold = styled.div`
  display: flex;
  flex-direction: row;
  height: 310px;
  padding: 10px 0 10px 35px;
`;

const BackButton = styled.div`
  align-items: center;
  display: flex;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 1em;
  text-transform: uppercase;
  & *:first-child {
    margin-right: 0.75em;
  }
`;

const Title = styled.div`
  font-size: 36px;
  font-weight: bold;
`;

const Body = styled.div`
  font-size: 90%;
  height: 100%;
  overflow: auto;
  padding: 0 25px 0;
  flex: 1;
`;

const Flourish = styled.div`
  text-align: center;
  overflow: hidden;
  width: 250px;
  &:after {
    background: url(${orbitalPeriodImage}) no-repeat center center;
    background-size: contain;
    content: '';
    display: block;
    margin: 0 auto;
    opacity: 0.35;
    width: 175px;
    height: 175px;
  }
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

const Confirmation = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 300px;
  width: 650px;
`;
const ConfirmationTitle = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 60px;
  padding: 8px;
  & > h4 { flex: 1, margin: 0 }
`;
const ConfirmationBody = styled.div`
  flex: 1;
  font-size: 15px;
  padding: 40px 80px;
  & > article {
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    color: ${p => p.theme.colors.main};
    padding: 1em 2em;
  }
`;
const ConfirmationButtons = styled.div`
  display: flex;
  flex-direction: row;
  height: 60px;
  justify-content: center;
  align-items: center;
  padding: 8px 8px 16px;
  & > button {
    margin-top: 0;
    margin-left: 1em;
    &:first-child {
      margin-left: 0;
    }
  }
`;

// TODO: ...
// zero-indexed
const currentStep = 1;
const totalSteps = 3;

const CrewAssignment = (props) => {
  const { data: crew } = useOwnedCrew();

  const [selection, setSelection] = useState();

  const selectPath = useCallback((path) => () => {
    setSelection(path);
  });

  const confirmPath = useCallback(() => {

  }, []);

  if (!story || !crew) return null;
  return (
    <>
      <Details title="Assignments" edgeToEdge>
        <CoverImage src={story.coverImg} ready />
        <AboveFold>
          <BackButton><BackIcon /> Back</BackButton>
          <Title>{story.title}</Title>
        </AboveFold>
        <BelowFold>
          <CrewCard crew={crew[0]} />
          <Body>
            <PageContent>{story.content}</PageContent>
            {story.prompt && (
              <>
                <PagePrompt>{story.prompt}</PagePrompt>
                <div>
                  {story.paths.map((path, i) => (
                    <Path key={path.id}
                      selected={path.id === selection?.id}
                      onClick={selectPath(path)}>
                      <div>
                        <span>{String.fromCharCode(65 + i)}</span>
                        <span>{path.content}</span>
                      </div>
                    </Path>
                  ))}
                </div>
              </>
            )}
            {!story.prompt && (
              <Button style={{ margin: '0 auto' }}>Finish</Button>
            )}
          </Body>
          <Flourish>
            <h4 style={{ marginBottom: 6 }}>{currentStep + 1} of {totalSteps}</h4>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              {Array.from({ length: totalSteps }, (x, i) => {
                let color = '#777';
                if (i < currentStep) {
                  color = theme.colors.main;
                } else if (i === currentStep) {
                  color = '#FFF';
                }
                return (
                  <>
                    {i > 0 && (
                      <div style={{
                        height: 0,
                        borderTop: `1px dotted ${i <= currentStep ? '#FFF' : '#777'}`,
                        width: '1.5em'
                      }} />
                    )}
                    <div style={{ fontSize: '150%', width: '1.5em', height: '1.5em' }}>
                      <NavIcon selected={i === currentStep} color={color} />
                    </div>
                  </>
                );
              })}
            </div>
          </Flourish>
        </BelowFold>
      </Details>
      {selection && (
        <Dialog>
          <Confirmation>
            <ConfirmationTitle>
              <div style={{ fontSize: 28, lineHeight: '28px', width: 44 }}>
                <NavIcon selected selectedColor={'white'} />
              </div>
              <h4>Your Selection:</h4>
            </ConfirmationTitle>
            <ConfirmationBody>
              <PagePrompt>{story.prompt}</PagePrompt>
              <article>{selection.content}</article>
            </ConfirmationBody>
            <ConfirmationButtons>
              <Button onClick={selectPath()}>Back</Button>
              <Button onClick={confirmPath}>Confirm</Button>
            </ConfirmationButtons>
          </Confirmation>
        </Dialog>
      )}
    </>
  );
};

export default CrewAssignment;
