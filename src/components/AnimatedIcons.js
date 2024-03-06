import { useMemo } from 'react';
import Lottie from 'react-lottie';

import CrewBusy from '~/assets/icons/animated/CrewBusy.json';
import CrewIdle from '~/assets/icons/animated/CrewIdle.json';
import Failed from '~/assets/icons/animated/Failed.json';
import RandomEvent from '~/assets/icons/animated/RandomEvent.json';
import Ready from '~/assets/icons/animated/Ready.json';

const LottieIcon = ({ animation, isPaused = false, size = "1em" }) => {
  const options = useMemo(() => ({
    loop: true,
    autoplay: true,
    animationData: animation
  }), [animation]);
  return <Lottie options={options} isPaused={isPaused} height={size} width={size} style={{ lineHeight: 0 }} />;
};

export const CrewBusyIcon = (props) => <LottieIcon animation={CrewBusy} {...props} />;
export const CrewIdleIcon = (props) => <LottieIcon animation={CrewIdle} {...props} />;
export const FailedIcon = (props) => <LottieIcon animation={Failed} {...props} />;
export const RandomEventIcon = (props) => <LottieIcon animation={RandomEvent} {...props} />;
export const ReadyIcon = (props) => <LottieIcon animation={Ready} {...props} />;
