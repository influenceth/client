import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { toCrewClass, toCrewCollection } from 'influence-utils';
import LoadingAnimation from 'react-spinners/PuffLoader';

import useOwnedCrew from '~/hooks/useOwnedCrew';
import useMintableCrew from '~/hooks/useMintableCrew';
import useSettleCrew from '~/hooks/useSettleCrew';
import useOwnedAsteroidsCount from '~/hooks/useOwnedAsteroidsCount';
import Details from '~/components/Details';
import AsteroidLink from '~/components/AsteroidLink';
import Button from '~/components/Button';
import DataReadout from '~/components/DataReadout';
import { CrewMemberIcon, WarningIcon } from '~/components/Icons';
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
  padding: 0 15px;
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

const WarningMessage = styled.div`
  align-items: center;
  display: flex;
  font-size: ${p => p.theme.fontSizes.detailText};
  line-height: 20px;
  margin: auto auto;
  z-index: 1;

  & svg {
    flex: 1 0 auto;
    margin-right: 10px;
  }
`;

const ClassBadge = styled.span`
  color: ${p => p.theme.colors.classes[p.crewClass]};
`;

const loadingCss = css`
  left: 50%;
  top: 50%;
`;

const OwnedCrewMember = (props) => {
  const { crew } = props;
  const [ imageLoaded, setImageLoaded ] = useState(false);
  const history = useHistory();
  const imageUrl = crew.crewCollection ?
    `${process.env.REACT_APP_IMAGES_URL}/v1/crew/${crew.i}/image.svg?bustOnly=true` :
    silhouette;

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
  const { asteroid, canMint, ...restProps } = props;
  const { settleCrew, settling } = useSettleCrew(Number(asteroid.i));
  const collection = asteroid.purchaseOrder <= 1859 ? 1 : 2;
  const bonus = (collection === 1 ? 25 : 0) + Math.pow(250000 - asteroid.i, 2) / 2500000000;

  return (
    <CrewMember {...restProps}>
      <CrewAvatar visible={true} src={silhouette} />
      <CrewInfo>
        <CrewName><AsteroidLink initialName={asteroid.name} id={asteroid.i} /></CrewName>
        <DataReadout label="Crew Type">{toCrewCollection(collection)}</DataReadout>
        <DataReadout label="Attribute Roll Bonus">
          +{bonus.toLocaleString({}, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
        </DataReadout>
        {!canMint && (
          <WarningMessage>
            <WarningIcon />
            <span>Arvad Citizens are mintable at completion of sale</span>
          </WarningMessage>
        )}
        <span data-tip="(not yet supported)" data-for="global" style={{ marginTop: 'auto' }}>
          <StyledButton disabled>
            <CrewMemberIcon /> Mint Crew
          </StyledButton>
        </span>
        {/* TODO: 
        <StyledButton
          data-tip={canMint ? 'Mint new crew member' : 'Not available until sale is complete'}
          data-for="global"
          onClick={() => settleCrew()}
          loading={settling}
          disabled={!canMint || settling}>
          <CrewMemberIcon /> Mint Crew
        </StyledButton>
        */}
      </CrewInfo>
    </CrewMember>
  );
};

const OwnedCrew = (props) => {
  const { data: crew } = useOwnedCrew();
  const { data: mintable } = useMintableCrew();
  const { data: ownedCount } = useOwnedAsteroidsCount();

  return (
    <Details title="Owned Crew">
      <StyledCrewDetails>
        <CrewList>
          {(!crew || crew.length === 0) && (
            <CrewMember>
              <CrewInfo>
                <WarningMessage>
                  <WarningIcon />
                  <span>No owned crew available</span>
                </WarningMessage>
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
                <WarningMessage>
                  <WarningIcon />
                  <span>No crew available to mint</span>
                </WarningMessage>
              </CrewInfo>
            </CrewMember>
          )}
          {mintable && mintable.map(a => {
            const canMint = a.purchaseOrder <= 1859 || ownedCount >= 11100;
            return <MintableCrewMember asteroid={a} key={a.i} canMint={canMint} />;
          })}
        </CrewList>
      </StyledCrewDetails>
    </Details>
  );
};

export default OwnedCrew;
