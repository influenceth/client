import { useCallback, useEffect, useRef, useState } from '~/lib/react-debug';
import { createPortal } from 'react-dom';
import Lottie from 'lottie-react';
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

const Intro = () => {
  const container = useRef();
  const lottieRef = useRef();
  const [complete, setComplete] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [paused, setPaused] = useState(true);

  const onReady = useCallback(import.meta.url, () => {
    setPaused(true);
    setTimeout(() => setPaused(false), 1000);
  }, []);

  const onComplete = useCallback(import.meta.url, () => {
    setHiding(true); // (so they fade back out)
    gsap.to(container.current, {
      delay: 1,
      opacity: 0,
      duration: 1,
      ease: 'power1.out',
      onComplete: () => setComplete(true)
    });
  }, []);

  useEffect(import.meta.url, () => {
    if (paused) lottieRef.current.pause();
    else lottieRef.current.play();
  }, [paused]);

  if (complete) return null;
  return createPortal(
    (
      <Wrapper ref={container} hiding={hiding}>
        <Lottie
          lottieRef={lottieRef}
          animationData={IntroLottie}
          loop={false}
          autoplay={false}
          onDOMLoaded={onReady}
          onComplete={onComplete}
          style={{ height: '200px', width: '100%' }} />
      </Wrapper>
    ),
    document.body
  );
}

export default Intro;
