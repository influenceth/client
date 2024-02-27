import { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Lottie from 'react-lottie';
import styled from 'styled-components';
import { gsap } from 'gsap';

import IntroLottie from '~/assets/intro.json';

const Wrapper = styled.div`
  align-items: center;
  background: black;
  display: flex;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999; /* above everything except Suspense */
`;

const animationOptions = {
  loop: false,
  autoplay: false,
  animationData: IntroLottie
};

const Intro = () => {
  const container = useRef();
  const [complete, setComplete] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [paused, setPaused] = useState(true);

  const onDataReady = useCallback(() => {
    setTimeout(() => setPaused(false), 1000);
  }, []);

  const onComplete = useCallback(() => {
    setHiding(true); // (so they fade back out)
    gsap.to(container.current, {
      delay: 1,
      opacity: 0,
      duration: 1,
      ease: 'power1.out',
      onComplete: () => setComplete(true)
    });
  }, []);

  const eventListeners = useMemo(() => {
    return [
      { eventName: 'DOMLoaded', callback: onDataReady },
      { eventName: 'complete', callback: onComplete }
    ];
  }, [onComplete, onDataReady]);

  if (complete) return null;
  return createPortal(
    (
      <Wrapper ref={container} hiding={hiding}>
        <Lottie
          eventListeners={eventListeners}
          options={animationOptions}
          isPaused={paused}
          height="200px"
          width="75%" />
      </Wrapper>
    ),
    document.body
  );
}

export default Intro;
