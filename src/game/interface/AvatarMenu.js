import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import CrewCard from '~/components/CrewCard';

import { SwayIcon } from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import useCrew from '~/hooks/useCrew';

const bgColor = '#000';
const cardWidth = 80;

const Avatar = styled.div`
  background: ${bgColor};
  border: 1px solid #888;
  overflow: hidden;
  pointer-events: auto;
  position: absolute;
  top: 5px;
  left: 5px;
  width: ${cardWidth}px;

  & > div {
    margin-top: -8px;
  }
`;
const SwayContainer = styled.div`
  background: ${bgColor};
  color: white;
  margin-left: 1px;
  pointer-events: auto;
  position: absolute;
  top: 0;
  left: 0;
  padding: 6px 12px 6px ${p => 12 + (p.noCaptain ? 0 : cardWidth)}px;
  min-width: ${p => 100 + (p.noCaptain ? 0 : cardWidth)}px;

  clip-path: polygon(
    0 0,
    100% 0,
    calc(100% - 10px) 100%,
    0 100%
  );
`;

const AvatarMenu = (props) => {
  const { account } = useAuth();
  const { captain } = useCrew();
  const history = useHistory();

  if (!account) return null;
  return (
    <>
      <SwayContainer noCaptain={!captain}><SwayIcon /> 0</SwayContainer>
      {captain && (
        <Avatar>
          <CrewCard
            crew={captain}
            clickable={true}
            hideHeader
            hideFooter
            hideMask
            onClick={() => history.push('/owned-crew')} />
        </Avatar>
      )}
    </>
  );
};

export default AvatarMenu;