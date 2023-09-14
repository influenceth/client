import { useCallback, useEffect, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';
import styled, { css, keyframes } from 'styled-components';
import Button from '~/components/ButtonAlt';

import CollapsibleSection from '~/components/CollapsibleSection';
import CrewCardFramed from '~/components/CrewCardFramed';
import { CaptainIcon, CrewIcon, CrewmateIcon, FoodIcon, IdleIcon, LocationIcon, PlusIcon, SwayIcon, WarningOutlineIcon } from '~/components/Icons';
import { useLotLink } from '~/components/LotLink';
import { useShipLink } from '~/components/ShipLink';
import TriangleTip from '~/components/TriangleTip';
import useAsteroid from '~/hooks/useAsteroid';
import useAuth from '~/hooks/useAuth';
import useBuilding from '~/hooks/useBuilding';
import useCrewContext from '~/hooks/useCrewContext';
import useShip from '~/hooks/useShip';
import useStore from '~/hooks/useStore';
import formatters from '~/lib/formatters';
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
  const { account } = useAuth();
  const history = useHistory();

  const dispatchLoggingIn = useStore(s => s.dispatchLoggingIn);

  const [tooltip, status, onClick] = useMemo(() => {
    if (!account) return ['Log-In', 'Account Not Connected', () => dispatchLoggingIn(true)];
    else return ['Start Crew', 'Crew Needs Recruits', () => history.push('/crew')];  // TODO: right place?
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
        <Button onClick={onClick} subtle width="140">
          {tooltip}
        </Button>
      </ButtonWrapper>
    </Wrapper>
  );
};

export default LoginMenu;