import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import CrewCard from '~/components/CrewCard';

import { SwayIcon } from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import useOwnedCrew from '~/hooks/useOwnedCrew';

const bgColor = '#000';
const cardWidth = `80px`;

const Avatar = styled.div`
  background: ${bgColor};
  border: 1px solid #888;
  overflow: hidden;
  pointer-events: auto;
  position: absolute;
  top: 1px;
  left: 1px;
  width: ${cardWidth};

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
  top: 1px;
  left: ${p => p.noCaptain ? '0' : cardWidth};
  padding: 3px 4px;
  width: 100px;
`;

const AvatarMenu = (props) => {
  const { token } = useAuth();
  const history = useHistory();
  const { data: crew } = useOwnedCrew();
  const captain = useMemo(() => (crew || []).find((c) => c.activeSlot === 0), [crew]);

  if (!token) return;
  return (
    <>
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
      <SwayContainer noCaptain={!captain}><SwayIcon /> 0</SwayContainer>
    </>
  );
};

export default AvatarMenu;