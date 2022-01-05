import { useCallback, useMemo, useRef, useState } from 'react';
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

const isStandalone = (navigator.standalone || window.matchMedia('(display-mode: standalone)').matches);

let installedApps = [];
/*
if (navigator.getInstalledRelatedApps) {
  navigator.getInstalledRelatedApps().then((apps) => {
    installedApps = apps;
    console.log('installedApps', installedApps);
  });
}
*/

const Intro = (props) => {
  const { onVideoComplete, onVideoError, ...restProps } = props;

  const [launching, setLaunching] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(true);
  const container = useRef();
  console.log('in intro', !!window.installPrompt);

  const launchStandard = useCallback(() => {
    setLaunching(true);
    gsap.to(container.current, {
      delay: 0.5,
      opacity: 0,
      duration: 1,
      ease: 'power1.out',
      onComplete: () => {
        if (onVideoComplete) onVideoComplete();

        // logging out of curiosity
        if (navigator.getInstalledRelatedApps) {
          navigator.getInstalledRelatedApps().then((apps) => {
            installedApps = apps;
            console.log('installedApps', installedApps);
          });
        }
      }
    });
  }, [onVideoComplete]);

  const launchOptions = useMemo(() => {
    console.log('launchOptions useMemo');
    const options = [];

    // always have standard option
    options.push({
      label: 'Standard',
      onClick: launchStandard
    });

    // include fullscreen option if fullscreen is available
    const docElem = document.documentElement;
    if (docElem.requestFullscreen || docElem.webkitRequestFullscreen || docElem.msRequestFullscreen) {
      options.push({
        label: 'Fullscreen',
        onClick: () => {
          if (docElem.requestFullscreen) {
            docElem.requestFullscreen();
          } else if (docElem.webkitRequestFullscreen) { /* Safari */
            docElem.webkitRequestFullscreen();
          } else if (docElem.msRequestFullscreen) { /* IE11 */
            docElem.msRequestFullscreen();
          }
          launchStandard();
        }
      });
    }

    // include "install" option if PWA install is available
    console.log('before', !!window.installPrompt);
    if (!!window.installPrompt) {
      options.push({
        label: 'Install App',
        onClick: async () => {
          window.installPrompt.prompt();
          const { outcome } = await window.installPrompt.userChoice;
          if (outcome === 'accepted') {
            window.installPrompt = null;
            launchStandard();
          }
        }
      });

    // else, if PWA already installed, send to PWA
    } else if (installedApps.length) {
      options.push({
        label: 'Open App',
        onClick: async () => {
          console.log('open app');
        }
      });
    }

    return options;
  }, [launchStandard]);

  const onVideoEnded = useCallback(() => {
    // if only one launch option, just use it
    if (isStandalone || launchOptions.length === 1) {
      launchOptions[0].onClick();
    }
    setVideoPlaying(false);
  }, [launchOptions]);

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
      <Launcher hiding={videoPlaying || launching}>
        <h4>Launch Experience:</h4>
        <ButtonContainer>
          {launchOptions.map(({ label, onClick }) => (
            <Button key={label} onClick={onClick}>
              {label}
            </Button>
          ))}
        </ButtonContainer>
      </Launcher>
    </StyledIntro>
  );
};

export default Intro;
