import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';

import Details from '~/components/DetailsV2';
import useAuth from '~/hooks/useAuth';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import { CrewmateSKU } from '~/game/launcher/Store';


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
      color: white;
      text-transform: uppercase;
      border-bottom: 1px solid #333;
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

const WelcomeFlow = () => {
  const { token } = useAuth();
  const { crew, loading, adalianRecruits, arvadianRecruits } = useCrewContext();
  const history = useHistory();
  
  const launcherPage = useStore(s => s.launcherPage);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const dispatchToggleInterface = useStore(s => s.dispatchToggleInterface);

  const [status, setStatus] = useState(STATUS.LOGGED_OUT);
  const [prompting, setPrompting] = useState(true);

  useEffect(() => {
    let updatedStatus = STATUS.LOGGED_OUT;
    if (token) {
      updatedStatus = STATUS.LOGGED_IN;
      if (!loading) {
        if (crew && crew._crewmates?.length > 0) updatedStatus = STATUS.READY;
        else if (adalianRecruits?.length > 0 || arvadianRecruits?.length > 0) updatedStatus = STATUS.NEED_CREWMATE_INITIALIZED;
        else updatedStatus = STATUS.NEED_CREWMATE_CREDITS;
      }
    }
    setStatus(updatedStatus);
  }, [token, crew, loading, adalianRecruits, arvadianRecruits]);

  useEffect(() => {
    if (prompting && status > STATUS.LOGGED_OUT && status < STATUS.READY) {
      if (launcherPage) {
        dispatchLauncherPage();
        dispatchToggleInterface(false);
      }
    }
    if (prompting && status === STATUS.NEED_CREWMATE_INITIALIZED) {
      setPrompting(false);
      if (!window.location.href.includes(`/recruit`)) {
        history.push(`/recruit/${crew?.i || 0}`);
      }
    }
  }, [launcherPage, prompting, status, crew?.i]);

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