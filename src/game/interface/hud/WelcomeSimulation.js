import { useContext, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import Loader from 'react-spinners/PuffLoader';

import useCrewContext from '~/hooks/useCrewContext';
import useSession from '~/hooks/useSession';
import useStore from '~/hooks/useStore';
import useSimulationSteps from '~/simulation/useSimulationSteps';

import TutorialMessage from './TutorialMessage';
import MockDataManager from '~/simulation/MockDataManager';
import MockTransactionManager from '~/simulation/MockTransactionManager';
import theme from '~/theme';
import { ChevronDoubleDownIcon } from '~/components/Icons';
import { createPortal } from 'react-dom';
import { COACHMARK_IDS } from '~/contexts/CoachmarkContext';
import useCoachmarkRefSetter from '~/hooks/useCoachmarkRefSetter';

const BUBBLE_WIDTH = 60;

const Bubble = styled.div`
  background: rgba(${p => p.theme.colors.darkMainRGB}, 0.7);
  bottom: 10px;
  border-radius: 50px;
  cursor: ${p => p.theme.cursors.active};
  height: ${BUBBLE_WIDTH}px;
  left: 50%;
  opacity: ${p => p.isIn ? 1 : 0};
  outline: 1px solid ${p => p.theme.colors.main};
  padding: 2px;
  pointer-events: all;
  position: fixed;
  transition: background 100ms ease, opacity 250ms ease ${p => p.isIn ? '200ms' : '0'}, outline 100ms ease;
  width: ${BUBBLE_WIDTH}px;
  z-index: 1000000;

  &:after {
    color: ${p => p.theme.colors.brightMain};
    content: "▾";
    position: absolute;
    bottom: -4px;
    right: -8px;
    transition: color 100ms ease;
  }

  &:hover {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.6);
    outline: 3px solid white;
    &:after {
      color: white;
    }
  }
`;

const CrewmateImage = styled.div`
  background-image: 
  ${p => p.crewmateImageOptionString
    ? `url("${process.env.REACT_APP_IMAGES_URL}/v1/crew/provided/image.svg?bustOnly=true&options=${escape(p.crewmateImageOptionString)}")`
    : (
      p.crewmateId
      ? `url("${process.env.REACT_APP_IMAGES_URL}/v1/crew/${p.crewmateId}/image.svg?bustOnly=true")`
      : 'none'
    )
  };

  background-position: top center;
  background-repeat: no-repeat;
  background-size: cover;
  border-radius: 0 0 ${BUBBLE_WIDTH}px ${BUBBLE_WIDTH}px;
  bottom: 40%;
  padding-top: 140%;
  position: relative;
  width: 100%;
  z-index: 2;
`;

const WelcomeSimulation = () => {
  const setCoachmarkRef = useCoachmarkRefSetter();
  const [isHidden, setIsHidden] = useState(false);
  const [canAutohide, setCanAutohide] = useState(false);

  const { currentStep, currentStepIndex, isTransitioning } = useSimulationSteps();

  const initialLoad = useRef(true);

  // watching for user action
  const history = useHistory();
  const actionDialog = useStore(s => s.actionDialog);
  const openHudMenu = useStore(s => s.openHudMenu);
  const [locationPath, setLocationPath] = useState();
  useEffect(() => {
    // (returns unlisten, so can just return directly to useEffect)
    return history.listen((location) => setLocationPath(location.pathname));
  }, [history]);

  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
    } else if (canAutohide) {
      setIsHidden(true);
    }
  }, [actionDialog?.type, locationPath, openHudMenu]);

  // we want to unhide the message on step change
  // then we want to hide it on first coachmark change for step (i.e. user has read and is now doing)
  useEffect(() => {
    setIsHidden(false);
    setCanAutohide(false);
    setTimeout(() => {
      setCanAutohide(true);
    }, 1000);
  }, [currentStepIndex]);

  if (!currentStep) return null;
  return createPortal(
    (
      <>
        <MockDataManager />
        <MockTransactionManager />

        <Bubble
          isIn={currentStep && !isTransitioning && isHidden}
          onClick={() => setIsHidden(false)}
          ref={(currentStep && !isTransitioning && isHidden) ? setCoachmarkRef(COACHMARK_IDS.simulationRightButton) : undefined}>
          <CrewmateImage 
            crewmateId={currentStep?.crewmateId}
            crewmateImageOptionString={currentStep?.crewmateImageOptionString}
          />
          <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
            <Loader size={BUBBLE_WIDTH} color={theme.colors.brightMain} speedMultiplier={0.5} />
          </div>
        </Bubble>
        
        <TutorialMessage
          closeIconOverride={<ChevronDoubleDownIcon />}
          crewmateId={currentStep?.crewmateId}
          crewmateImageOptionString={currentStep?.crewmateImageOptionString}
          isIn={currentStep && !isTransitioning && !isHidden}
          messageOffset={15}
          onClose={() => setIsHidden(true)}
          rightButton={currentStep.rightButton
            ? {
              // TODO: defaults to overwrite
              // color: theme.colors.main,
              // disabled: false,
              ...currentStep.rightButton
            }
            : null
          }
          setButtonRef={(currentStep && !isTransitioning && !isHidden) ? setCoachmarkRef(COACHMARK_IDS.simulationRightButton) : undefined}
          step={currentStep}
        />
      </>
    ),
    document.body
  );
};

export default WelcomeSimulation;