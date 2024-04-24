import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Time } from '@influenceth/sdk';

import useGetTime from '~/hooks/useGetTime';
import useStore from '~/hooks/useStore';
import IconButton from '~/components/IconButton';
import TimeComponent from '~/components/Time';
import { RewindIcon, FastForwardIcon, PlayIcon, PauseIcon } from '~/components/Icons';
import TimeIcon from '~/components/TimeIcon';
import useConstants from '~/hooks/useConstants';
import useCoarseTime from '~/hooks/useCoarseTime';
import { displayTimeFractionDigits } from '~/lib/utils';


const StyledTime = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  padding: 0 8px 6px 0;
`;

const Controls = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  transition: max-width 0.6s ease;
  white-space: nowrap;
  max-width: ${p => p.open ? 300 : 0}px;
`;

const DaysSince = styled(TimeComponent)`
  cursor: ${p => p.theme.cursors.active};
  text-align: right;
  transition: all 0.4s ease;
  user-select: none;
  width: 148px;

  &:hover:after {
    opacity: 0.8;
  }
`;

const Dot = styled.div`
  height: 10px;
  width: 10px;
  border-radius: 10px;
  background: #333;
`;
const SpeedDots = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 60px;

  ${p => p.speedSetting > 0
    ? `
      ${Dot}:nth-child(n+1):nth-child(-n+${p.speedSetting}) {
        background: white;
      }
    `
    : `
      ${Dot}:nth-child(n+${5 + p.speedSetting + 1}):nth-child(-n+5) {
        background: ${p.theme.colors.error};
        opacity: 0.6;
      }
    `
  }
`;

const SpeedMult = styled.div`
  color: ${p => p.dir < 0 ? p.theme.colors.error : p.theme.colors.main};
  min-width: 50px;
  padding: 0 8px;
  text-align: center;
`;

const TimeButton = styled(IconButton)`
  margin-right: 5px;
  &:last-child {
    margin-right: 0;
  }
`;

const speeds = [1, 10, 100, 1000, 10000, 100000];

const TimeController = ({ open }) => {
  const getTime = useGetTime();
  const timeOverride = useStore(s => s.timeOverride);
  const dispatchTimeOverride = useStore(s => s.dispatchTimeOverride);

  const [ isPaused, setIsPaused ] = useState(false);
  const [ speedSetting, setSpeedSetting ] = useState(0);

  const pause = useCallback(() => {
    setIsPaused(true);
    setSpeedSetting(0);
    dispatchTimeOverride(getTime(), 0);
  }, [dispatchTimeOverride, getTime]);

  const reset = useCallback(() => {
    setIsPaused(false);
    setSpeedSetting(0);
    dispatchTimeOverride();
  }, [dispatchTimeOverride]);

  const changeSpeed = useCallback((direction) => {
    const newSpeed = speeds[Math.abs(speedSetting + direction)];
    if (Number.isFinite(newSpeed)) {
      setIsPaused(false);
      setSpeedSetting(speedSetting + direction);
    }
  }, [speedSetting]);

  useEffect(() => {
    // if speedSetting is zero and timeOverride is already non-set, don't override
    // otherwise (there is a timeOverride and speedSetting changes), update override
    if (speedSetting !== 0 || timeOverride) {
      const dir = speedSetting < 0 ? -1 : 1;
      const selectedSpeed = speeds[Math.abs(speedSetting)] * dir;
      dispatchTimeOverride(getTime(), selectedSpeed);
    }
  }, [ speedSetting ]);  // eslint-disable-line react-hooks/exhaustive-deps

  const displaySpeed = useMemo(() => {
    if (isPaused) return '0';
    return speeds[Math.abs(speedSetting)].toLocaleString();
  }, [isPaused, speedSetting]);

  useEffect(() => {
    if (!open && timeOverride) {
      reset();
    }
  }, [open]);

  return (
    <Controls open={open}>
      <SpeedDots speedSetting={speedSetting}>
        <Dot />
        <Dot />
        <Dot />
        <Dot />
        <Dot />
      </SpeedDots>

      <SpeedMult dir={speedSetting < 0 ? -1 : 1}>
        {displaySpeed}x
      </SpeedMult>

      <TimeButton
        data-tooltip-content="Rewind"
        data-tooltip-place="top"
        disabled={speedSetting <= -5}
        onClick={() => changeSpeed(-1)}>
        <RewindIcon />
      </TimeButton>

      {isPaused
        ? (
          <TimeButton
            data-tooltip-content="Reset to Current Time"
            data-tooltip-place="top"
            onClick={reset}>
            <PlayIcon />
          </TimeButton>
        )
        : (
          <TimeButton
            data-tooltip-content="Pause"
            data-tooltip-place="top"
            onClick={pause}>
            <PauseIcon />
          </TimeButton>
        )
      }

      <TimeButton
        data-tooltip-content="Fast Forward"
        data-tooltip-place="top"
        disabled={speedSetting >= 5}
        onClick={() => changeSpeed(1)}>
        <FastForwardIcon />
      </TimeButton>
    </Controls>
  );
};

const TimeControls = () => {
  const coarseTime = useCoarseTime();
  const { data: TIME_ACCELERATION, isLoading } = useConstants('TIME_ACCELERATION');
  const timeOverride = useStore(s => s.timeOverride);

  const [open, setOpen] = useState(false);
  const toggleOpen = useCallback((e) => {
    setOpen((o) => !o);
  }, []);

  const displayTime = useMemo(() => {
    if (!coarseTime || isLoading) return '';
    return Time.fromOrbitADays(coarseTime, TIME_ACCELERATION || Time.DEFAULT_TIME_ACCELERATION)
      .toGameClockADays()
      .toLocaleString(undefined, { minimumFractionDigits: displayTimeFractionDigits });
  }, [coarseTime, isLoading, TIME_ACCELERATION])

  return (
    <StyledTime>
      <TimeController open={open} />
      <TimeIcon
        motionBlur={Math.abs(timeOverride?.speed || 0) > 10000}
        size="30px"
        style={{ marginLeft: 12 }}
        time={displayTime}
        onClick={toggleOpen} />
      <DaysSince displayTime={displayTime} onClick={toggleOpen} />
    </StyledTime>
  );
};

export default TimeControls;
