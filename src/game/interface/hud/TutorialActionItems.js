import { useCallback, useEffect, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';

import { TutorialIcon } from '~/components/Icons';
import { ICON_WIDTH, TRANSITION_TIME } from './ActionItem';
import { ActionItemContainer } from './ActionItems';
import TutorialMessage from './TutorialMessage';

const GUIDE_ID = 6877;

const COLOR = '64, 191, 255';

const opacityKeyframes = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
`;

const Icon = styled.div`
  & svg {
    filter: drop-shadow(1px 1px 1px #333);
    ${p => p.animate && css`
      animation: ${opacityKeyframes} 1000ms ease infinite;
    `}
  }
`;

const Status = styled.div`
  font-size: 110%;
  text-shadow: none;
`;

const Label = styled.div`
  white-space: nowrap;
`;

const ActionItemRow = styled.div`
  align-items: center;
  overflow: hidden;
  pointer-events: all;
  text-shadow: 1px 1px 2px black;
  background: rgba(${COLOR}, ${p => p.isCurrent ? 0.55 : 0.25});
  color: rgb(${COLOR});
  height: 34px;
  margin-bottom: 2px;
  opacity: ${p => p.isCurrent ? 1 : 0.8};
  transform: translateX(0);

  ${p => p.isCurrent ? '' : `
    cursor: ${p.theme.cursors.active};
    &:hover {
      background: rgba(${COLOR}, 0.4);
    }
  `}

  display: flex;
  flex-direction: row;
  font-size: 85%;
  position: relative;
  transition:
    opacity ${TRANSITION_TIME * 0.75}ms ease,
    transform ${TRANSITION_TIME * 0.75}ms ease,
    height ${TRANSITION_TIME * 0.25}ms ease ${TRANSITION_TIME * 0.75}ms,
    margin-bottom 1ms ease ${TRANSITION_TIME * 0.75}ms;
  ${Icon} {
    align-items: center;
    background: rgba(${COLOR}, 0.5);
    color: white;
    display: flex;
    font-size: ${ICON_WIDTH}px;
    height: ${ICON_WIDTH}px;
    justify-content: center;
    margin-right: 8px;
    width: ${ICON_WIDTH}px;
    & span {
      font-size: 24px;
      line-height: 0;
    }
  }
  ${Status} {
    margin-right: 8px;
    text-transform: uppercase;
  }
  ${Label} {
    color: white;
    white-space: nowrap;
  }
`;

const TutorialActionItems = ({ tutorialSteps }) => {
  const [selectedStep, setSelectedStep] = useState();

  const goToStep = useCallback((nextStep) => {
    if (selectedStep) {
      setSelectedStep();
      setTimeout(() => {
        setSelectedStep(nextStep);
      }, TRANSITION_TIME);
    } else {
      setSelectedStep(nextStep);
    }
  }, [selectedStep]);

  useEffect(() => {
    let nextStep;

    // if steps changed...
    if (!selectedStep) {
      nextStep = tutorialSteps[0];
    }

    // ...and selectedStep is no longer available
    else if (!tutorialSteps.find((t) => t.key === selectedStep.key)) {
      // unselect current step, find next step (or any step if out of order)
      nextStep = tutorialSteps.find((t) => t.key > selectedStep.key) || tutorialSteps[0];
    }

    // select next step if available
    if (nextStep) goToStep(nextStep);
    else setSelectedStep();
  }, [tutorialSteps]);

  return (
    <>
      <ActionItemContainer style={{ marginTop: 8 }}>
        {tutorialSteps.map((step) => (
          <ActionItemRow key={step.key}
            isCurrent={selectedStep?.key === step.key}
            onClick={() => goToStep(step)}>
            <Icon><span><TutorialIcon /></span></Icon>
            <Status>Mission{/* Step {step.key}*/}</Status>
            <Label>{step.title}</Label>
          </ActionItemRow>
        ))}
      </ActionItemContainer>

      <TutorialMessage
        crewmateId={GUIDE_ID}
        isIn={!!selectedStep}
        leftButton={selectedStep?.leftButton}
        onClose={() => setSelectedStep()}
        rightButton={selectedStep?.rightButton}
        step={selectedStep}
        messageHeight={225} />
    </>
  );
}

export default TutorialActionItems;
