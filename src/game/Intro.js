import { useRef } from 'react';
import ReactPlayer from 'react-player/lazy';
import styled from 'styled-components';
import gsap from 'gsap';

import IntroVideo from '~/assets/influence-load.webm';

const StyledIntro = styled.div`
  background-color: black;
  position: absolute;
  height: 100%;
  opacity: 1;
  width: 100%;
  z-index: 9000;
`;

const Intro = (props) => {
  const { onVideoComplete } = props;
  const container = useRef();

  const _onEnded = () => {
    gsap.to(container.current, {
      delay: 0.5,
      opacity: 0,
      duration: 1,
      ease: 'power1.out',
      onComplete: () => {
        if (onVideoComplete) onVideoComplete();
      }
    });
  };

  return (
    <StyledIntro ref={container}>
      <ReactPlayer
        url={IntroVideo}
        height={'100%'}
        width={'100%'}
        muted={true}
        playing={true}
        onEnded={_onEnded} />
    </StyledIntro>
  );
};

export default Intro;
