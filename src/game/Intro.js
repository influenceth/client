import { useCallback, useRef, useState } from 'react';
import ReactPlayer from 'react-player/lazy';
import styled from 'styled-components';
import gsap from 'gsap';

import IntroVideo from '~/assets/influence-load.webm';
import Button from '~/components/Button';

const StyledIntro = styled.div`
  background-color: black;
  position: absolute;
  height: 100%;
  opacity: 1;
  width: 100%;
  z-index: 9000;
`;

const Launcher = styled.div`
  top: 62.5%;
  left: 0;
  opacity: ${p => p.hiding ? 0: 1};
  position: fixed;
  right: 0;
  text-align: center;
  transition: opacity 600ms ease;
  & > h4 {
    margin: 0 0 15px;
    opacity: 0.5;
    @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
      font-size: 90%;
    }
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    top: auto;
    bottom: 15px;
  }
`;
const ButtonContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0 20px;
  & > button {
    margin: 0 10px 15px;
  }
`;

const Intro = (props) => {
  const { onVideoComplete, onVideoError, ...restProps } = props;
  const [videoPlaying, setVideoPlaying] = useState(true);
  const container = useRef();

  const onVideoEnded = useCallback(() => {
    setVideoPlaying(false);
  }, []);

  const launchStandard = useCallback(() => {
    gsap.to(container.current, {
      delay: 0.5,
      opacity: 0,
      duration: 1,
      ease: 'power1.out',
      onComplete: () => {
        if (onVideoComplete) onVideoComplete();
      }
    });
  }, [onVideoComplete]);

  const launchFullscreen = useCallback(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
      elem.msRequestFullscreen();
    }
    launchStandard();
  }, [launchStandard]);

  const installPWA = useCallback(async () => {
    window.installPromptable.prompt();
    const { outcome } = await window.installPromptable.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    window.installPromptable = null;
  }, []);

  return (
    <StyledIntro ref={container} {...restProps}>
      <ReactPlayer
        url={IntroVideo}
        height={'100%'}
        width={'100%'}
        volume={0}
        muted={true}
        playing={true}
        onError={launchStandard}
        onEnded={onVideoEnded} />
      <Launcher hiding={videoPlaying}>
        <h4>Launch Experience:</h4>
        <ButtonContainer>
          <Button onClick={launchStandard}>
            Standard
          </Button>
          <Button onClick={launchFullscreen}>
            Fullscreen
          </Button>
          {window.installPromptable && (
            <Button onClick={installPWA}>
              Install
            </Button>
          )}
        </ButtonContainer>
      </Launcher>
    </StyledIntro>
  );
};

export default Intro;
