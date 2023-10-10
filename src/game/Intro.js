import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactPlayer from 'react-player';
import styled from 'styled-components';
import { gsap } from 'gsap';

import introVideoSrc from '~/assets/influence-load.webm';

const Wrapper = styled.div`
  background: black;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999; /* above everything except Suspense */
`;

const Intro = () => {
  const container = useRef();
  const [complete, setComplete] = useState(false);
  const [hiding, setHiding] = useState(false);

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

  const onError = useCallback((err) => {
    console.error(err);
    onComplete();
  }, [onComplete]);

  if (complete) return null;
  return createPortal(
    (
      <Wrapper ref={container} hiding={hiding}>
        <ReactPlayer
          url={introVideoSrc}
          height="100%"
          width="100%"
          volume={0}
          muted={true}
          playing
          onError={onError}
          onEnded={onComplete} />
      </Wrapper>
    ),
    document.body
  );
}

export default Intro;
