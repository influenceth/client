import { useEffect, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';
import styled from 'styled-components';
import Button from '~/components/ButtonAlt';

import CrewCardFramed from '~/components/CrewCardFramed';
import { PlusIcon } from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import theme from '~/theme';

const Wrapper = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: row;
  padding: 25px 0 0 25px;
`;

const ButtonWrapper = styled.div`
  padding-top: 20px;
  padding-left: 15px;
  & label {
    color: #888;
    display: block;
    font-size: 95%;
    margin-bottom: 10px;
  }
`;

const LoginMenu = () => {
  const { account, authenticating, login } = useAuth();
  const history = useHistory();

  const [tooltip, status, onClick] = useMemo(() => {
    if (!account) return ['Log-In', 'Account Not Connected', login];
    else return ['Start Crew', 'Crew Needs Recruits', () => history.push('/crew')];
  }, [ account ]);

  useEffect(() => ReactTooltip.rebuild(), [tooltip]);

  return (
    <Wrapper>
      <CrewCardFramed
        borderColor={`rgba(${theme.colors.mainRGB}, 0.4)`}
        crewmate={null}
        isCaptain
        noAnimation
        onClick={onClick}
        silhouetteOverlay={{
          alwaysOn: ['icon'],
          disableHover: true,
          icon: <PlusIcon />,
          iconSize: 45,
          rgb: theme.colors.mainRGB,
        }}
        width={88} />
      <ButtonWrapper>
        <label>{status}</label>
        <Button onClick={onClick} disabled={authenticating} subtle width="140">
          {tooltip}
        </Button>
      </ButtonWrapper>
    </Wrapper>
  );
};

export default LoginMenu;