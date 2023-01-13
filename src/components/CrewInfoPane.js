import styled from 'styled-components';
import { Crewmate } from '@influenceth/sdk';

import CrewClassIcon from '~/components/CrewClassIcon';
import CrewTraitIcon from '~/components/CrewTraitIcon';
import DataReadout from '~/components/DataReadout';
import MouseoverInfoPane from './MouseoverInfoPane';

const TooltipContents = styled.div`
  & > h3 {
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

const CrewInfoPane = ({ crew, cssWhenVisible, referenceEl, visible }) => {
  if (!crew) return null;
  return (
    <MouseoverInfoPane cssWhenVisible={cssWhenVisible} referenceEl={referenceEl} visible={visible}>
      <TooltipContents>
        <h3>{crew.name || `Crew Member #${crew.i}`}</h3>
        <article>
          <div>
            <CrewClassIcon crewClass={crew.crewClass} />
          </div>
          <div style={{ lineHeight: '1.6em' }}>
            <DataReadout label="Class" slim inheritFontSize>{Crewmate.getClass(crew.crewClass)?.name}</DataReadout>
            {crew.title > 0 && <DataReadout label="Title" slim inheritFontSize>{Crewmate.getTitle(crew.title)?.name}</DataReadout>}
            <DataReadout label="Collection" slim inheritFontSize>{Crewmate.getCollection(crew.crewCollection)?.name}</DataReadout>
          </div>
        </article>
        {(crew.traits || []).length > 0 && (
          <div>
            {crew.traits.map((trait) => {
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

export default CrewInfoPane;