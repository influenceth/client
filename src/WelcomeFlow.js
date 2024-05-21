import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';

import Details from '~/components/DetailsV2';
import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import { CrewmateSKU } from '~/game/launcher/components/CrewmateSKU';

const STATUS = {
  LOGGED_OUT: 0,
  LOGGED_IN: 1,
  NEED_CREWMATE_CREDITS: 2,
  NEED_CREWMATE_INITIALIZED: 3,
  READY: 4,
};

const Container = styled.div`
  display: flex;
  flex-direction: row;
  position: relative;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    width: 90vw;
  }
`;

const Info = styled.div`
  color: #999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 50px;
  & div {
    width: 350px;
    h4 {
      border-bottom: 1px solid #333;
      color: white;
      margin: 0;
      padding-bottom: 8px;
      text-transform: uppercase;
    }
    p {
      font-size: 17px;
      b {
        color: ${p => p.theme.colors.main};
        font-weight: normal;
      }
    }
  }
`;

const CrewmateCreditDialog = ({ onClose }) => (
  <Details title="Buy Crewmates" onClose={onClose} modalMode>
    <Container>
      <Info>
        <div>
          <h4>Crews & Crewmates</h4>
          <p>Playing Influence requires <b>Crewmates</b> that operate as part of a <b>Crew</b>.</p>
          <p>Each Crew contains up to 5 Crewmates and may be assigned any game tasks to perform.</p>
          <p>After recruiting a Crewmate, you will have the opportunity to assign them to a new Crew, or exchange between Crews you own.</p>
        </div>
      </Info>
      <div style={{ maxWidth: 380 }}>
        <CrewmateSKU />
      </div>
    </Container>
  </Details>
);

const DISABLE_LAUNCHER_TRAILER = true && process.env.NODE_ENV === 'development';

const WelcomeFlow = () => {
  const { authenticated } = useSession();
  const { crew, loading, adalianRecruits, arvadianRecruits } = useCrewContext();
  const history = useHistory();

  const hasSeenIntroVideo = useStore(s => s.hasSeenIntroVideo);
  const launcherPage = useStore(s => s.launcherPage);
  const dispatchCutscene = useStore(s => s.dispatchCutscene);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const dispatchSeenIntroVideo = useStore(s => s.dispatchSeenIntroVideo);
  const dispatchToggleInterface = useStore(s => s.dispatchToggleInterface);

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
        // (not prompting for crewmate credit pack on prerelease)
        // TODO: if remove this in prod, also see TutorialItems redirect into creation story
        else if (`${process.env.REACT_APP_CHAIN_ID}` !== `0x534e5f5345504f4c4941`) updatedStatus = STATUS.NEED_CREWMATE_CREDITS;
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

  if (!prompting || status === STATUS.READY) return null;
  return (
    <>
      {status === STATUS.NEED_CREWMATE_CREDITS && (
        <CrewmateCreditDialog onClose={() => setPrompting(false)} />
      )}
    </>
  );
};

export default WelcomeFlow;