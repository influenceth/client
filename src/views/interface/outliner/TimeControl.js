import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { START_TIMESTAMP } from 'influence-utils';
import { MdFastRewind, MdFastForward, MdPlayArrow, MdPause, MdStop } from 'react-icons/md';
import { HiClock } from 'react-icons/hi';

import useInterval from '~/hooks/useInterval';
import useStore from '~/hooks/useStore';
import Section from '~/components/Section';
import DataReadout from '~/components/DataReadout';
import IconButton from '~/components/IconButton';

// Calculate the difference in game days between the start timestamp and the lore start time
const diff = 24 * (1618668000 - START_TIMESTAMP) / 86400;

const Controls = styled.div`
  padding-bottom: 25px;
`;

const speeds = [ 0, 0.001, 0.0025, 0.005, 0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28, 2.56, 5.12 ];

const TimeControl = (props) => {
  const [ speed, setSpeed ] = useState(0);
  const [ speedSetting, setSpeedSetting ] = useState(0);
  const [ playing, setPlaying ] = useState(false);
  const time = useStore(state => state.time.current);
  const dispatchTimeUpdated = useStore(state => state.dispatchTimeUpdated);
  const dispatchTimeControled = useStore(state => state.dispatchTimeControled);
  const dispatchTimeUncontrolled = useStore(state => state.dispatchTimeUncontrolled);

  const play = () => {
    setPlaying(true);
    dispatchTimeControled();
  };

  const pause = () => {
    setSpeedSetting(0);
  };

  const stop = () => {
    setPlaying(false);
    dispatchTimeUncontrolled();
    dispatchTimeUpdated(((Date.now() / 1000) - START_TIMESTAMP) / 3600);
  };

  const changeSpeed = (direction) => {
    const newSpeed = speeds[Math.abs(speedSetting + direction)];
    if (Number.isFinite(newSpeed)) setSpeedSetting(speedSetting + direction);
  };

  useEffect(() => {
    const dir = speedSetting < 0 ? -1 : 1;
    setSpeed(speeds[Math.abs(speedSetting)] * dir);
  }, [ speedSetting ]);

  useInterval(() => {
    if (!playing) return;
    dispatchTimeUpdated(time + speed);
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
    <Section
      name="timeControl"
      title="Time Control"
      icon={<HiClock />}>
      <Controls>
        {!playing && <IconButton data-tip="Play" onClick={play}><MdPlayArrow /></IconButton>}
        {playing && (
          <IconButton
            data-tip="Reset to Current"
            onClick={stop}
            disabled={!playing}>
            <MdStop />
          </IconButton>
        )}
        <IconButton
          data-tip="Rewind"
          onClick={() => changeSpeed(-1)}
          disabled={!playing}>
          <MdFastRewind />
        </IconButton>
        <IconButton
          data-tip="Pause"
          onClick={pause}
          disabled={!playing}>
          <MdPause />
        </IconButton>
        <IconButton
          data-tip="Fast Forward"
          onClick={() => changeSpeed(1)}
          disabled={!playing}>
          <MdFastForward />
        </IconButton>
      </Controls>
      <DataReadout label="Adalia Time">{adaliaTime}</DataReadout>
      <DataReadout label="Actual Time">{actualTime}</DataReadout>
    </Section>
  );
};

export default TimeControl;
