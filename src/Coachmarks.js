import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';

import useScreenSize from '~/hooks/useScreenSize';
import useStore from './hooks/useStore';
import useInterval from './hooks/useInterval';

const stagger = 200;
const duration = 1500;
const delay = 3000;
const finishedAt = Math.round(100 * duration / (duration + delay));
const pivot = Math.round(2 * finishedAt / 3);

const animation1 = keyframes`
  0% {
    opacity: 0;
    transform: scale(100);
  }
  ${pivot}% {
    opacity: 0.75;
    transform: scale(1);
  }
  ${finishedAt}% {
    opacity: 0;
    transform: scale(2);
  }
  100% {
    opacity: 0;
  }
`;

const FullscreenAttention = styled.div`
  animation: ${animation1} ${duration + delay}ms ease-out infinite;
  animation-delay: ${p => p.staggered ? stagger : 0}ms;
  border-radius: 3px;
  outline: 2px solid ${p => `rgba(${p.theme.colors.mainRGB}, ${p.staggered ? 0.5 : 1})`};
  pointer-events: none;
  position: fixed;
  z-index: 1000000;
`;

export const COACHMARK_IDS = {
  actionButtonConstruct: 'actionButtonConstruct',
  actionButtonLease: 'actionButtonLease',
  actionButtonPlan: 'actionButtonPlan',
  actionDialogConstructSource: 'actionDialogConstructSource',
  actionDialogPlanType: 'actionDialogPlanType',
  backToBelt: 'backToBelt',
  hudCrewLocation: 'hudCrewLocation',
  hudInfoPane: 'hudInfoPane',
  hudMenuMyAssets: 'hudMenuMyAssets',
  hudMenuMyAssetsAgreement: 'hudMenuMyAssetsAgreement',
  hudMenuResources: 'hudMenuResources',
  hudMenuTargetResource: 'hudMenuTargetResource',
  hudRecruitCaptain: 'hudRecruitCaptain',
};

// TODO: position options (in corner vs. wrap vs. in center)
const CoachmarkAnimation = ({ refEl }) => {
  const { height, width } = useScreenSize();
  const [ready, setReady] = useState();
  const [rect, setRect] = useState();

  // give time to "animate in"
  useEffect(() => {
    setTimeout(() => {
      setRect(refEl.getBoundingClientRect());
      setReady(true);
    }, 500)
  }, [refEl]);

  // watch the position in case changes
  useInterval(() => {
    setRect(refEl.getBoundingClientRect());
  }, delay);

  // update the position as needed
  const position = useMemo(() => {
    if (!rect) return { display: 'none' };
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    };
  }, [height, width, rect]);

  if (!ready) return null;
  return createPortal(
    (
      <>
        <FullscreenAttention style={position} />
        <FullscreenAttention style={position} staggered />
      </>
    ), document.body
  );
};

const Coachmarks = ({ forceOn, label, refEl }) => {
  const coachmarks = useStore(s => s.coachmarks);
  const launcherPage = useStore(s => s.launcherPage);

  const isOn = useMemo(() => {
    if (!refEl) return false;
    if (forceOn) return true;
    return label && !launcherPage && !!coachmarks[label];
  }, [coachmarks, forceOn, label, launcherPage, !refEl]);

  return isOn ? <CoachmarkAnimation refEl={refEl} /> : null;
}

export default Coachmarks;