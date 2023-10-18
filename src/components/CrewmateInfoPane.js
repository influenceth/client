import styled from 'styled-components';
import { Crewmate } from '@influenceth/sdk';

import CrewClassIcon from '~/components/CrewClassIcon';
import CrewTraitIcon from '~/components/CrewTraitIcon';
import DataReadout from '~/components/DataReadout';
import MouseoverInfoPane from './MouseoverInfoPane';
import { useMemo } from 'react';
import formatters from '~/lib/formatters';
import AddressLink from './AddressLink';

const TooltipContents = styled.div`
  & > h3 {
    align-items: flex-end;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin: 0 0 7px;
  }
  & > article {
    border: solid #333;
    border-width: 1px 0;
    padding: 7px 0;
    display: flex;
    flex-direction: row;
    font-size: 12px;
    & > div:first-child {
      font-size: 25px;
      width: 41px;
      text-align: center;
    }
    & label {
      color: #676767;
    }
    &:last-child {
      border-bottom: 0;
    }
  }
  & > div {
    display: flex;
    flex-wrap: wrap;
    padding: 7px 0;
  }
`;

const Trait = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  font-size: 36px;
  padding-right: 7px;
  width: 50%;
  & h6 {
    color: #676767;
    font-size: 12px;
    margin: 0 0 0 6px;
  }
`;

const NotMine = styled.span`
  color: ${p => p.theme.colors.error};
  font-size: 12px;
  span {
    color: ${p => p.theme.colors.error} !important;
  }
`;

const CrewmateInfoPane = ({ crewmate, cssWhenVisible, referenceEl, showOwner, visible, ...props }) => {
  const traits = useMemo(() => Crewmate.getCombinedTraits(crewmate.Crewmate), [crewmate]);

  if (!crewmate) return null;
  return (
    <MouseoverInfoPane cssWhenVisible={cssWhenVisible} referenceEl={referenceEl} visible={visible} {...props}>
      <TooltipContents>
        <h3>
          {formatters.crewmateName(crewmate)}
          {showOwner && <NotMine>Owned by <AddressLink address={crewmate?.Nft?.owner} truncate /></NotMine>}
        </h3>
        <article>
          <div>
            <CrewClassIcon crewClass={crewmate.Crewmate.class} />
          </div>
          <div style={{ lineHeight: '1.6em' }}>
            <DataReadout label="Class" slim inheritFontSize>{Crewmate.Entity.getClass(crewmate)?.name}</DataReadout>
            {crewmate.Crewmate.title > 0 && <DataReadout label="Title" slim inheritFontSize>{Crewmate.Entity.getTitle(crewmate)?.name}</DataReadout>}
            <DataReadout label="Collection" slim inheritFontSize>{Crewmate.Entity.getCollection(crewmate)?.name}</DataReadout>
          </div>
        </article>
        {(traits || []).length > 0 && (
          <div>
            {traits.map((trait) => {
              const { name } = Crewmate.getTrait(trait) || {};
              if (name) {
                return (
                  <Trait key={trait}>
                    <CrewTraitIcon trait={trait} hideHexagon />
                    <h6>{name}</h6>
                  </Trait>
                );
              }
              return null;
            })}
          </div>
        )}
      </TooltipContents>
    </MouseoverInfoPane>
  );
}

export default CrewmateInfoPane;