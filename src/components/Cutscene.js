import { useCallback, useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player/lazy';
import styled from 'styled-components';
import IntroVideo from '~/assets/influence-load.webm';

import Button from '~/components/Button';

const ButtonHolder = styled.div`
  bottom: 0;
  position: absolute;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  opacity: ${p => p.highlight ? 1 : 0.3};
  width: 100%;
  transition: opacity 500ms ease;
  & > button {
    margin: 10px 10px 10px 0;
  }
  &:hover {
    opacity: 1;
  }
`;

const Container = styled.div`
  background-color: black;
  height: 100%;
  left: 0;
  opacity: 1;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 99999;
`;

const noop = () => {};

const Cutscene = (props) => {
  const { allowSkip, source, onComplete } = props;

  const [highlightButtons, setHighlightButtons] = useState(true);
  const [playing, setPlaying] = useState(false);

  const timeout = useRef();
  useEffect(() => {
    timeout.current = setTimeout(() => {
      setHighlightButtons(false);
    }, 8000);
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    }
  }, []);

  const handleSkip = useCallback(() => {
    onComplete();
  }, []);

  const onError = useCallback((err) => {
    console.error(err);
    onComplete();
  }, []);

  return (
    <Container onClick={() => setPlaying(true)}>
      <ReactPlayer
        url={source}
        height={'100%'}
        width={'100%'}
        playing
        onEnded={onComplete || noop}
        onError={onError}
        config={{
          file: {
            forceHLS: true
          }
        }} />
      {props.allowSkip && (
        <ButtonHolder highlight={highlightButtons}>
          <Button onClick={handleSkip}>Skip Cutscene</Button>
        </ButtonHolder>
      )}
    </Container>
  );
};

export default Cutscene;
