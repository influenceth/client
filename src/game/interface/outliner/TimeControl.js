import { useCallback, useContext, useEffect, useState } from 'react';
import styled from 'styled-components';

import ClockContext from '~/contexts/ClockContext';
import useGetTime from '~/hooks/useGetTime';
import useStore from '~/hooks/useStore';
import Section from '~/components/Section';
import DataReadout from '~/components/DataReadout';
import IconButton from '~/components/IconButton';
import { RewindIcon, FastForwardIcon, PlayIcon, PauseIcon, StopIcon, TimeIcon } from '~/components/Icons';

const Controls = styled.div`
  padding-bottom: 25px;
`;

const speeds = [ 0, 0.001, 0.0025, 0.005, 0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28, 2.56, 5.12 ];

const TimeControl = (props) => {
  const getTime = useGetTime();
  const timeOverride = useStore(s => s.timeOverride);
  const dispatchTimeOverride = useStore(s => s.dispatchTimeOverride);
  const { displayTime, realWorldTime } = useContext(ClockContext);

  const [ speedSetting, setSpeedSetting ] = useState(0);
  const [ playing, setPlaying ] = useState(false);

  const play = useCallback(() => {
    setPlaying(true);
    dispatchTimeOverride(getTime(), 0);
  }, [dispatchTimeOverride, getTime]);

  const pause = useCallback(() => {
    setSpeedSetting(0);
    dispatchTimeOverride(getTime(), 0);
  }, [dispatchTimeOverride, getTime]);

  const stop = useCallback(() => {
    setPlaying(false);
    setSpeedSetting(0);
    dispatchTimeOverride();
  }, [dispatchTimeOverride]);

  const changeSpeed = useCallback((direction) => {
    const newSpeed = speeds[Math.abs(speedSetting + direction)];
    if (Number.isFinite(newSpeed)) {
      setSpeedSetting(speedSetting + direction);
    }
  }, [speedSetting]);

  useEffect(() => {
    if (timeOverride) {
      const dir = speedSetting < 0 ? -1 : 1;
      const selectedSpeed = speeds[Math.abs(speedSetting)] * dir;
      dispatchTimeOverride(getTime(), selectedSpeed);
    }
  }, [ dispatchTimeOverride, getTime, speedSetting ]);  // eslint-disable-line react-hooks/exhaustive-deps
  
  const adaliaTime = `${displayTime} days since Arrival`;
  const actualTime = realWorldTime.toLocaleString([], {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Section
      name="timeControl"
      title="Time Control"
      icon={<TimeIcon />}>
      <Controls>
        {!playing && <IconButton data-tip="Play" onClick={play}><PlayIcon /></IconButton>}
        {playing && (
          <IconButton
            data-tip="Reset to Current"
            onClick={stop}
            disabled={!playing}>
            <StopIcon />
          </IconButton>
        )}
        <IconButton
          data-tip="Rewind"
          onClick={() => changeSpeed(-1)}
          disabled={!playing}>
          <RewindIcon />
        </IconButton>
        <IconButton
          data-tip="Pause"
          onClick={pause}
          disabled={!playing}>
          <PauseIcon />
        </IconButton>
        <IconButton
          data-tip="Fast Forward"
          onClick={() => changeSpeed(1)}
          disabled={!playing}>
          <FastForwardIcon />
        </IconButton>
      </Controls>
      <DataReadout label="Adalia Time">{adaliaTime}</DataReadout>
      <DataReadout label="Actual Time">{actualTime}</DataReadout>
    </Section>
  );
};

export default TimeControl;
