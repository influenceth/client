import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import useCrewContext from '~/hooks/useCrewContext';
import useSession from '~/hooks/useSession';
import useStore from '~/hooks/useStore';
import useSimulationSteps from '~/simulation/useSimulationSteps';
import theme from '~/theme';
import TutorialMessage from './TutorialMessage';

const DELAY_MESSAGE = 1000;

const WelcomeSimulation = () => {
  const [isHidden, setIsHidden] = useState(false);

  const { currentStep, isLoading, isTransitioning } = useSimulationSteps();
  useEffect(() => {
    setIsHidden(false);

    // TODO: initialize
  }, [currentStep]);

  if (!currentStep) return null;
  return (
    <>
      <TutorialMessage
        crewmateId={currentStep?.crewmateId}
        isIn={currentStep && !isHidden && !isTransitioning}
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
        step={currentStep}
      />
    </>
  );
};

export default WelcomeSimulation;