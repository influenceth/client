import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';

import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';

const STATUS = {
  LOGGED_OUT: 0,
  LOGGED_IN: 1,
  NEED_CREWMATE_CREDITS: 2,
  NEED_CREWMATE_INITIALIZED: 3,
  READY: 4,
};

const DISABLE_LAUNCHER_TRAILER = true && process.env.NODE_ENV === 'development';

const WelcomeFlow = () => {
  const { authenticated } = useSession();
  const { crew, loading, adalianRecruits, arvadianRecruits } = useCrewContext();
  const history = useHistory();

  const hasSeenIntroVideo = useStore(s => s.hasSeenIntroVideo);
  const launcherPage = useStore(s => s.launcherPage);
  const dispatchCutscene = useStore(s => s.dispatchCutscene);
  const dispatchSeenIntroVideo = useStore(s => s.dispatchSeenIntroVideo);

  const [status, setStatus] = useState(STATUS.LOGGED_OUT);
  const [prompting, setPrompting] = useState(true);

  const wasLauncherPage = useRef(!!launcherPage);

  useEffect(() => {
    wasLauncherPage.current = wasLauncherPage.current || !!launcherPage;
  }, [launcherPage])

  useEffect(() => {
    let updatedStatus = STATUS.LOGGED_OUT;

    if (authenticated) {
      updatedStatus = STATUS.LOGGED_IN;

      if (!loading) {
        if (crew && crew._crewmates?.length > 0) updatedStatus = STATUS.READY;
        else if (adalianRecruits?.length > 0 || arvadianRecruits?.length > 0) updatedStatus = STATUS.NEED_CREWMATE_INITIALIZED;
      }
    }
    setStatus(updatedStatus);
  }, [authenticated, crew, loading, adalianRecruits, arvadianRecruits]);

  useEffect(() => {
    if (prompting && status === STATUS.NEED_CREWMATE_INITIALIZED) {
      setPrompting(false);
      if (!window.location.href.includes(`/recruit`)) {
        history.push(`/recruit/${crew?.id || 0}`);
      }
    }

    // if have interacted with the launcher page so that there is no longer launcher page
    // (then have either logged in or clicked "explore")... show intro trailer as needed
    // NOTE: this happens whether still in "prompting" mode or not
    if (wasLauncherPage.current && !launcherPage) {
      if (!hasSeenIntroVideo && !DISABLE_LAUNCHER_TRAILER) {
        dispatchSeenIntroVideo(true);
        dispatchCutscene(
          `${process.env.REACT_APP_CLOUDFRONT_OTHER_URL}/videos/intro.m3u8`,
          true
        );
      }
    }
  }, [launcherPage, prompting, status, crew?.id]);

  return null;
};

export default WelcomeFlow;