import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { BiTransfer as TradeIcon } from 'react-icons/bi';

import useOwnedCrew from '~/hooks/useOwnedCrew';
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
  const { data: crew } = useOwnedCrew();
  const { data: mintable } = useMintableCrew();

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
        {crew?.length === 0 && mintable?.length === 0 && (
          <ListEmptyMessage><span>No owned crew</span></ListEmptyMessage>
        )}
        {crew?.length === 0 && mintable?.length > 0 && (
            <ListEmptyMessage>
              <span>No owned crew. {mintable.length} crew members available to be minted.</span>
            </ListEmptyMessage>
        )}
        {crew?.length > 0 && crew.map(c => <CrewMemberItem key={c.i} crew={c} />)}
      </CrewList>
    </Section>
  );
};

export default OwnedCrew;
