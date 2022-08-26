import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactPlayer from 'react-player/lazy';
import styled from 'styled-components';
import gsap from 'gsap';

import IntroVideo from '~/assets/influence-load.webm';
import Button from '~/components/Button';
import Cutscene from '~/components/Cutscene';
import useStore from '~/hooks/useStore';

const StyledIntro = styled.div`
  background-color: black;
  position: absolute;
  height: 100%;
  opacity: 1;
  width: 100%;
  z-index: 9000;
`;

const Launcher = styled.div`
  bottom: 27.75%;
  left: 0;
  opacity: ${p => p.hiding ? 0: 1};
  position: fixed;
  right: 0;
  text-align: center;
  transition: opacity 600ms ease;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    bottom: 5%;
  }
`;
const ButtonContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0 20px;
  & > button {
    margin: 15px 10px 0;
  }
`;

const isStandalone = (navigator.standalone || window.matchMedia('(display-mode: standalone)').matches);

const Intro = (props) => {
  const { onComplete, ...restProps } = props;

  const dispatchSeenIntroVideo = useStore(s => s.dispatchSeenIntroVideo);
  const hasSeenIntroVideo = useStore(s => s.hasSeenIntroVideo);

  const container = useRef();
  const [closing, setClosing] = useState(false);
  const [showingTrailer, setShowingTrailer] = useState(false);
  const [launchOptions, setLaunchOptions] = useState([]);

  const closeIntro = useCallback(() => {
    gsap.to(container.current, {
      delay: 0.5,
      opacity: 0,
      duration: 1,
      ease: 'power1.out',
      onComplete
    });
  }, [onComplete]);

  const onTrailerComplete = useCallback(() => {
    setShowingTrailer(false);
    dispatchSeenIntroVideo(true);
    closeIntro();
  }, [dispatchSeenIntroVideo, closeIntro]);

  const onLaunch = useCallback(() => {
    setClosing(true); // (so they fade back out)
    if (!hasSeenIntroVideo) {
      setShowingTrailer(true);
    } else {
      closeIntro();
    }
  }, [closeIntro, hasSeenIntroVideo]);

  const onVideoEnded = useCallback(() => {
    // if standalone, launch standard
    if (isStandalone) return onLaunch();

    // always have standard option
    const options = [{
      label: 'Launch',
      onClick: onLaunch
    }];

    // include fullscreen option if fullscreen is available
    const docElem = document.documentElement;
    if (docElem.requestFullscreen || docElem.webkitRequestFullscreen || docElem.msRequestFullscreen) {
      options.push({
        label: 'Launch Fullscreen',
        onClick: () => {
          if (docElem.requestFullscreen) {
            docElem.requestFullscreen();
          } else if (docElem.webkitRequestFullscreen) { /* Safari */
            docElem.webkitRequestFullscreen();
          } else if (docElem.msRequestFullscreen) { /* IE11 */
            docElem.msRequestFullscreen();
          }
          onLaunch();
        }
      });
    }

    // include "install" option if PWA install is available
    if (!!window.installPrompt) {
      options.push({
        label: 'Install App',
        onClick: async () => {
          window.installPrompt.prompt();
          const { outcome } = await window.installPrompt.userChoice;
          if (outcome === 'accepted') {
            window.installPrompt = null;
            onLaunch();
          }
        }
      });
    }

    // if only one option, just "click" it automatically
    // (only if seen intro video; otherwise, we need the interaction to start the video)
    if (options.length === 1 && hasSeenIntroVideo) {
      options[0].onLaunch();

    // else, set launch options for user selection
    } else {
      setLaunchOptions(options);
    }
  }, [hasSeenIntroVideo, onLaunch]);

  return (
    <StyledIntro ref={container} {...restProps}>
      <ReactPlayer
        url={IntroVideo}
        height={'100%'}
        width={'100%'}
        volume={0}
        muted={true}
        playing={true}
        onError={onVideoEnded}
        onEnded={onVideoEnded} />
      <Launcher hiding={closing || launchOptions?.length < 2}>
        <ButtonContainer>
          {launchOptions.map(({ label, onClick }) => (
            <Button key={label} onClick={onClick}>
              {label}
            </Button>
          ))}
        </ButtonContainer>
      </Launcher>

      {showingTrailer && createPortal(
        <Cutscene
          source="https://d1c1daundk1ax0.cloudfront.net/influence/goerli/videos/intro.m3u8"
          allowSkip
          onComplete={onTrailerComplete}
        />,
        document.body
      )}
    </StyledIntro>
  );
};

export default Intro;
