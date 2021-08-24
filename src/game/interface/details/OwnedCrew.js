import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { toCrewClass } from 'influence-utils';
import LoadingAnimation from 'react-spinners/PuffLoader';

import useOwnedCrew from '~/hooks/useOwnedCrew';
import useMintableCrew from '~/hooks/useMintableCrew';
import useSettleCrew from '~/hooks/useSettleCrew';
import Details from '~/components/Details';
import Button from '~/components/Button';
import DataReadout from '~/components/DataReadout';
import formatters from '~/lib/formatters';
import silhouette from '~/assets/images/silhouette.png';

const StyledCrewDetails = styled.div`
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  padding-left: 12px;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 0;
  }
`;

const CrewHeader = styled.div`
  align-items: center;
  display: flex;
  flex: 0 0 10%;
  font-size: ${p => p.theme.fontSizes.featureText};

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding-left: 20px;
  }
`;

const CrewList = styled.div`
  display: flex;
  flex: 1 1 0;
  height: 45%;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: thin;
`;

const CrewMember = styled.div`
  background-image: linear-gradient(0.25turn, rgba(54, 167, 205, 0.15), rgba(0, 0, 0, 0));
  border-left: 2px solid ${p => p.theme.colors.main};
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  height: 100%;
  position: relative;
  width: 300px;

  &:hover {
    background-image: linear-gradient(0.25turn, rgba(54, 167, 205, 0.25), rgba(54, 167, 205, 0.10));
  }
`;

const CrewInfo = styled.div`
  align-items: flex-start;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  height: 100%;
  padding-left: 15px;
`;

const CrewName = styled.span`
  font-size: ${p => p.theme.fontSizes.featureText};
  padding: 15px 0;
`;

const CrewAvatar = styled.img`
  display: ${p => p.visible ? 'block' : 'none'};
  filter: brightness(80%);
  height: 100%;
  object-fit: contain;
  object-position: 100% 100%;
  padding: 10px 0 0 10px;
  position: absolute;
  transition: all 0.3s ease;
  width: 100%;

  ${CrewMember}:hover & {
    filter: brightness(100%);
    padding: 0;
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    filter: none;
  }
`;

const StyledButton = styled(Button)`
  margin: auto 0 15px 0;
`;

const EmptyMessage = styled.div`
  font-size: ${p => p.theme.fontSizes.detailText};
  margin: auto auto;
`;

const ClassBadge = styled.span`
  color: ${p => p.theme.colors.classes[p.crewClass]};
`;

const OwnedCrewMember = (props) => {
  const { crew } = props;
  const [ imageLoaded, setImageLoaded ] = useState(false);
  const history = useHistory();
  const imageUrl = crew.crewCollection ?
    `${process.env.REACT_APP_API_URL}/v1/metadata/crew/${crew.i}/card.svg?bustOnly=true` :
    silhouette;
  const loadingCss = css`
    left: 50%;
    top: 50%;
  `;

  return (
    <CrewMember onClick={() => history.push(`/crew/${crew.i}`)}>
      <LoadingAnimation color={'white'} css={loadingCss} loading={!imageLoaded} />
      <CrewAvatar
        onLoad={() => setImageLoaded(true)}
        visible={imageLoaded}
        src={imageUrl} />
      <CrewInfo>
        <CrewName>
          {crew.name || `Crew Member #${crew.i}`}
          <ClassBadge crewClass={toCrewClass(crew.crewClass)}> &#9679;</ClassBadge>
        </CrewName>
        <DataReadout label="Class">{toCrewClass(crew.crewClass) || 'Unknown Class'}</DataReadout>
      </CrewInfo>
    </CrewMember>
  );
};

const MintableCrewMember = (props) => {
  const { asteroid, ...restProps } = props;
  const settleCrew = useSettleCrew(asteroid.i);
  const collection = asteroid.purchaseOrder <= 1859 ? 'Arvad Specialist' : 'Arvad Citizen';
  const bonus = Math.pow(250000 - asteroid.i, 2) / 2500000000;

  return (
    <CrewMember {...restProps}>
      <CrewAvatar visible={true} src={silhouette} />
      <CrewInfo>
        <CrewName>{asteroid.name}</CrewName>
        <DataReadout label="Crew Type">{collection}</DataReadout>
        <DataReadout label="Asteroid Radius">{formatters.radius(asteroid.r)}</DataReadout>
        <DataReadout label="Bonus to Mint">+{bonus.toLocaleString()}%</DataReadout>
        <StyledButton
          onClick={() => settleCrew.mutate()}>
          Mint Crew Member
        </StyledButton>
      </CrewInfo>
    </CrewMember>
  );
};

const OwnedCrew = (props) => {
  const { data: crew } = useOwnedCrew();
  const { data: mintable } = useMintableCrew();

  return (
    <Details title="Owned Crew">
      <StyledCrewDetails>
        <CrewList>
          {(!crew || crew.length === 0) && (
            <CrewMember>
              <CrewInfo>
                <EmptyMessage>No owned crew available</EmptyMessage>
              </CrewInfo>
            </CrewMember>
          )}
          {crew && crew.map(c => <OwnedCrewMember crew={c} key={c.i} />)}
        </CrewList>
        <CrewHeader>Available Crew Members</CrewHeader>
        <CrewList>
          {(!mintable || mintable.length === 0) && (
            <CrewMember>
              <CrewInfo>
                <EmptyMessage>No crew available to mint</EmptyMessage>
              </CrewInfo>
            </CrewMember>
          )}
          {mintable && mintable.map(a => <MintableCrewMember asteroid={a} key={a.i} />)}
        </CrewList>
      </StyledCrewDetails>
    </Details>
  );
};

export default OwnedCrew;
