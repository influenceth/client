import { useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { toCrewClass, toCrewCollection, toCrewTitle, toCrewTrait } from 'influence-utils';

import { usePopper } from 'react-popper';

import CrewClassIcon from '~/components/CrewClassIcon';
import CrewTraitIcon from '~/components/CrewTraitIcon';
import DataReadout from '~/components/DataReadout';

const InfoTooltip = styled.div`
  background: rgba(16,16,16,0.95);
  border: 1px solid #333;
  padding: 13px 13px 0;
  pointer-events: none;
  margin-bottom: 6px;
  opacity: 0;
  transform: translateY(0);
  transition: opacity 250ms ease, transform 250ms ease;
  width: 360px;
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

  ${p => p.visible && `
    opacity: 1;
    ${p.cssWhenVisible}
  `}
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
  const [popperEl, setPopperEl] = useState();
  const { styles, attributes } = usePopper(referenceEl, popperEl, {
    placement: 'top',
    modifiers: [
      {
        name: 'flip',
        options: {
          fallbackPlacements: ['top-start', 'top-end', 'right', 'left'],
        },
      },
    ],
  });
  
  if (!crew) return null;
  return createPortal(
    <div ref={setPopperEl} style={{ ...styles.popper, zIndex: 1000, pointerEvents: 'none' }} {...attributes.popper}>
      <InfoTooltip visible={visible} cssWhenVisible={cssWhenVisible}>
        <h3>{crew.name || `Crew Member #${crew.i}`}</h3>
        <article>
          <div>
            <CrewClassIcon crewClass={crew.crewClass} />
          </div>
          <div style={{ lineHeight: '1.6em' }}>
            <DataReadout label="Class" slim inheritFontSize>{toCrewClass(crew.crewClass)}</DataReadout>
            {crew.title > 0 && <DataReadout label="Title" slim inheritFontSize>{toCrewTitle(crew.title)}</DataReadout>}
            <DataReadout label="Collection" slim inheritFontSize>{toCrewCollection(crew.crewCollection)}</DataReadout>
          </div>
        </article>
        {crew.traits.length > 0 && (
          <div>
            {crew.traits.map((trait) => {
              const { name } = toCrewTrait(trait) || {};
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
      </InfoTooltip>
    </div>,
    document.body
  );
}

export default CrewInfoPane;