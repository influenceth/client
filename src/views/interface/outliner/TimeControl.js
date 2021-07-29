import { useState } from 'react';
import styled from 'styled-components';
import { START_TIMESTAMP } from 'influence-utils';
import { MdFastRewind, MdFastForward, MdPlayArrow, MdPause, MdStop } from 'react-icons/md';
import { HiClock } from 'react-icons/hi';

import Section from './Section';
import DataReadout from '~/components/DataReadout';
import IconButton from '~/components/IconButton';
import useInterval from '~/hooks/useInterval';
import useTimeStore from '~/hooks/useTimeStore';

// Calculate the difference in game days between the start timestamp and the lore start time
const diff = 24 * (1618668000 - START_TIMESTAMP) / 86400;

const Controls = styled.div`
  padding-bottom: 25px;
`;

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

  const displayTime = time - diff;
  const adaliaTime = `
    ${displayTime >= 0 ? '+' : ''}
    ${displayTime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    days since Arrival
  `;

  const actualTime = (new Date((time * 86400 / 24 + START_TIMESTAMP) * 1000).toLocaleString([],
    { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  ));

  return (
    <Section title="Time Control" icon={<HiClock />}>
      <Controls>
        {!playing && <IconButton data-tip="Play" onClick={play}><MdPlayArrow /></IconButton>}
        {playing && <IconButton data-tip="Pause" onClick={pause}><MdPause /></IconButton>}
        {playing && <IconButton data-tip="Fast Forward" onClick={() => setSpeed(speed - 1)}><MdFastRewind /></IconButton>}
        {playing && <IconButton data-tip="Rewind" onClick={() => setSpeed(speed + 1)}><MdFastForward /></IconButton>}
        {playing && <IconButton data-tip="Reset to Current" onClick={stop}><MdStop /></IconButton>}
      </Controls>
      <DataReadout label="Adalia Time" data={adaliaTime} />
      <DataReadout label="Actual Time" data={actualTime} />
    </Section>
  );
};

export default TimeControl;
