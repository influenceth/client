import { useEffect, useMemo, useRef } from 'react';
import Lottie from 'lottie-react';

import CrewBusy from '~/assets/icons/animated/CrewBusy.json';
import CrewIdle from '~/assets/icons/animated/CrewIdle.json';
import Failed from '~/assets/icons/animated/Failed.json';
import RandomEvent from '~/assets/icons/animated/RandomEvent.json';
import Ready from '~/assets/icons/animated/Ready.json';

const LottieIcon = ({ animation, isPaused = false, size = '1em' }) => {
  const lottieRef = useRef();
  const style = useMemo(() => ({
    alignItems: 'center',
    display: 'flex',
    height: size,
    justifyContent: 'center',
    width: size,
  }), [size]);

  useEffect(() => {
    if (isPaused) lottieRef.current.pause();
    else lottieRef.current.play();
  }, [isPaused]);

  return <Lottie lottieRef={lottieRef} animationData={animation} loop={true} autoplay={true} style={style} />;
};

export const CrewBusyIcon = (props) => <LottieIcon animation={CrewBusy} {...props} />;
export const CrewIdleIcon = (props) => <LottieIcon animation={CrewIdle} {...props} />;
export const FailedIcon = (props) => <LottieIcon animation={Failed} {...props} />;
export const RandomEventIcon = (props) => <LottieIcon animation={RandomEvent} {...props} />;
export const ReadyIcon = (props) => <LottieIcon animation={Ready} {...props} />;
