import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import FullscreenAttention, { delay } from '~/components/FullscreenAttention';
import useScreenSize from '~/hooks/useScreenSize';
import useInterval from '~/hooks/useInterval';
import useStore from '~/hooks/useStore';

export const COACHMARK_IDS = {
  actionButtonAssembleShip: 'actionButtonAssembleShip',
  actionButtonConstruct: 'actionButtonConstruct',
  actionButtonCoreSample: 'actionButtonCoreSample',
  actionButtonExtract: 'actionButtonExtract',
  actionButtonLaunchShip: 'actionButtonLaunchShip',
  actionButtonLease: 'actionButtonLease',
  actionButtonPlan: 'actionButtonPlan',
  actionButtonProcess: 'actionButtonProcess',
  actionButtonSelectDestination: 'actionButtonSelectDestination',
  actionButtonSetCourse: 'actionButtonSetCourse',
  actionButtonStationCrew: 'actionButtonStationCrew',
  actionDialogConstructSource: 'actionDialogConstructSource',
  actionDialogMaxRecipes: 'actionDialogMaxRecipes',
  actionDialogPlanType: 'actionDialogPlanType',
  actionDialogTargetInventory: 'actionDialogTargetInventory',
  actionDialogTargetProcess: 'actionDialogTargetProcess',
  actionDialogTargetLaunchType: 'actionDialogTargetLaunchType',
  asteroidMarketsHelper: 'asteroidMarketsHelper',
  backToBelt: 'backToBelt',
  detailsClose: 'detailsClose',
  destinationAsteroid: 'destinationAsteroid',
  hudCrewLocation: 'hudCrewLocation',
  hudInfoPane: 'hudInfoPane',
  hudMenuMarketplaces: 'hudMenuMarketplaces',
  hudMenuMyAssets: 'hudMenuMyAssets',
  hudMenuMyAssetsAgreement: 'hudMenuMyAssetsAgreement',
  hudMenuMyAssetsBuilding: 'hudMenuMyAssetsBuilding',
  hudMenuMyAssetsShip: 'hudMenuMyAssetsShip',
  hudMenuResources: 'hudMenuResources',
  hudMenuTargetResource: 'hudMenuTargetResource',
  hudRecruitCaptain: 'hudRecruitCaptain',
  porkchop: 'porkchop',
};

const CoachmarkContext = React.createContext();

const CoachmarkComponent = ({ refEl }) => {
  const { height, width } = useScreenSize();
  const [rect, setRect] = useState();

  // give the ref element time to "animate in" in case
  // that is something it does
  useEffect(() => {
    console.log({ refEl })
    const to = setTimeout(() => {
      const boundingRect = refEl && refEl.getBoundingClientRect();
      setRect(boundingRect);
    }, 500);
    return () => {
      clearTimeout(to);
      setRect();
    }
  }, [refEl, height, width]);

  // watch for position changes
  useInterval(() => {
    const boundingRect = refEl && refEl.getBoundingClientRect();
    setRect(boundingRect);
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