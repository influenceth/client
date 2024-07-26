import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import FullscreenAttention, { delay } from '~/components/FullscreenAttention';
import useScreenSize from '~/hooks/useScreenSize';
import useInterval from '~/hooks/useInterval';
import useStore from '~/hooks/useStore';

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

const CoachmarkContext = React.createContext();

const CoachmarkComponent = ({ refEl }) => {
  const { height, width } = useScreenSize();
  const [rect, setRect] = useState();

  // give the ref element time to "animate in" in case
  // that is something it does
  useEffect(() => {
    const to = setTimeout(() => {
      setRect(refEl.getBoundingClientRect());
    }, 500);
    return () => {
      clearTimeout(to);
      setRect();
    }
  }, [refEl, height, width]);

  // watch for position changes
  useInterval(() => {
    setRect(refEl.getBoundingClientRect());
  }, delay);

  // update the position as needed if rect or screen changes
  const position = useMemo(() => {
    if (!rect) return null;
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    };
  }, [rect]);

  if (!position) return null;
  return createPortal(
    (
      <>
        <FullscreenAttention style={position} />
        <FullscreenAttention style={position} staggered />
      </>
    ), document.body
  );
}

export function CoachmarkProvider({ children }) {
  const coachmarks = useStore(s => s.coachmarks);

  const [refEls, setRefEls] = useState({});

  const refEl = useMemo(() => {
    const refElKey = Object.keys(coachmarks).find((k) => !!coachmarks[k] && !!refEls[k]);
    return refElKey ? refEls[refElKey] : null;
  }, [coachmarks, refEls]);

  const register = useCallback((label) => (r) => {
    // because of how this setter 
    setRefEls((prev) => {
      let updated = { ...prev };
      if (r) updated[label] = r;
      else if (updated[label]) delete updated[label];
      return updated;
    });
  }, []);

  return (
    <>
      <CoachmarkContext.Provider value={register}>
        {children}
      </CoachmarkContext.Provider>
      {refEl && <CoachmarkComponent refEl={refEl} />}
    </>
  );
}

export default CoachmarkContext;