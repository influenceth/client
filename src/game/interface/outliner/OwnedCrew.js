import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { BiTransfer as TradeIcon } from 'react-icons/bi';

import useCrew from '~/hooks/useCrew';
import useMintableCrew from '~/hooks/useMintableCrew';
import CrewMemberItem from '~/components/CrewMemberItem';
import IconButton from '~/components/IconButton';
import MarketplaceLink from '~/components/MarketplaceLink';
import { CrewIcon, DetailIcon } from '~/components/Icons';
import ListEmptyMessage from '~/components/ListEmptyMessage';
import Section from '~/components/Section';

const Controls = styled.div`
  display: flex;
  flex: 0 0 auto;
  padding-bottom: 15px;
`;

const CrewList = styled.ul`
  border-top: 1px solid ${p => p.theme.colors.contentBorder};
  box-shadow: inset 0 5px 7px -8px #000;
  flex: 0 1 auto;
  list-style-type: none;
  margin: 0;
  overflow-y: auto;
  padding: 0;
  scrollbar-width: thin;
`;

const OwnedCrew = (props) => {
  const history = useHistory();
  const { crew, crewMemberMap } = useCrew();
  const { data: mintable } = useMintableCrew();

  console.log({
    crew: { ...crew },
    crewMemberMap: { ...crewMemberMap },
  });

  return (
    <Section
      name="ownedCrew"
      title="Owned Crew"
      icon={<CrewIcon />}>
      <Controls>
        <IconButton
          data-tip="Crew Details"
          onClick={() => history.push('/owned-crew')}>
          <DetailIcon />
        </IconButton>
        <MarketplaceLink
          chain="STARKNET"
          assetType="crewmate">
          {(onClick, setRefEl) => (
            <IconButton
              data-tip="Trade Crew Members"
              onClick={onClick}
              setRef={setRefEl}>
              <TradeIcon />
            </IconButton>
          )}
        </MarketplaceLink>
      </Controls>
      <CrewList>
        {crew?.crewMembers?.length === 0 && mintable?.length === 0 && (
          <ListEmptyMessage><span>No owned crew</span></ListEmptyMessage>
        )}
        {crew?.crewMembers?.length === 0 && mintable?.length > 0 && (
            <ListEmptyMessage>
              <span>No owned crew. {mintable.length} crew members available to be minted.</span>
            </ListEmptyMessage>
        )}
        {crew?.crewMembers?.length > 0 && crew.crewMembers.map((i) => <CrewMemberItem key={i} crew={crewMemberMap[i]} />)}
      </CrewList>
    </Section>
  );
};

export default OwnedCrew;
