import { useState } from 'react';
import styled from 'styled-components';

import Pane from './Pane';
import Button from '~/components/Button';
import useInterval from '~/hooks/useInterval';
import useTimeStore from '~/hooks/useTimeStore';

const TimeControl = (props) => {
  const [ speed, setSpeed ] = useState(1);
  const [ playing, setPlaying ] = useState(false);
  const time = useTimeStore(state => state.time);
  const updateTime = useTimeStore(state => state.updateTime);
  const updateAutoUpdatingTime = useTimeStore(state => state.updateAutoUpdatingTime);
  const updateToCurrentTime = useTimeStore(state => state.updateToCurrentTime);

  const play = () => {
    setPlaying(true);
    updateAutoUpdatingTime(false);
  };

  const pause = () => {
    setSpeed(0);
  };

  const stop = () => {
    setPlaying(false);
    updateAutoUpdatingTime(true);
    updateToCurrentTime();
  };

  useInterval(() => {
    if (!playing) return;
    updateTime(time + speed);
  }, 1000 / 30);

  return (
    <Pane title="Time Control">
      {!playing && <Button onClick={play}>Play</Button>}
      {playing && <Button onClick={pause}>Pause</Button>}
      {playing && <Button onClick={() => setSpeed(speed - 1)}>- Speed</Button>}
      {playing && <Button onClick={() => setSpeed(speed + 1)}>+ Speed</Button>}
      {playing && <Button onClick={stop}>Stop</Button>}
    </Pane>
  );
};

export default TimeControl;
