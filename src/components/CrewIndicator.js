import styled from 'styled-components';

import useCrewContext from '~/hooks/useCrewContext';
import useCrewmate from '~/hooks/useCrewmate';
import theme from '~/theme';
import CrewCardFramed from './CrewCardFramed';

const CrewLabel = styled.div`
  align-self: center;
  margin-top: -10px;
  & h3 {
    color: white;
    margin: 4px 0;
    & label {
      color: ${p => p.theme.colors.main};
    }
  }
`;

const CrewCards = styled.div`
  display: flex;
  ${p => p.flip
    ? `
      flex-direction: row-reverse;
      & > div {
        margin-left: 5px;
        &:last-child {
          margin-left: 0;
        }
      }

      ${CrewLabel} {
        margin-right: 5px;
        text-align: right;
      }
    `
    : `
      flex-direction: row;
      & > div {
        margin-right: 5px;
        &:last-child {
          margin-right: 0;
        }
      }

      ${CrewLabel} {
        margin-left: 5px;
      }
    `
  }
`;

const CrewIndicator = ({ cardWidth = 60, crew, noCrewText, flip, label = 'Owned by' }) => {
  const { crew: myCrew } = useCrewContext();
  const { data: captain } = useCrewmate((crew?.Crew?.roster || [])[0]);
  return (
    <CrewCards flip={flip}>
      <CrewCardFramed
        borderColor={`rgba(${theme.colors.mainRGB}, 0.7)`}
        crewmate={captain}
        isCaptain
        lessPadding
        noAnimation
        width={cardWidth} />
      <CrewLabel>
        <div>{label}</div>
        <h3>
          {crew
            ? (
              <>
                {crew?.Name?.name || noCrewText || `Crew #${crew?.id}`}
                {myCrew?.id === crew?.id ? <label> (Me)</label> : null}
              </>
            )
            : (noCrewText || 'N/A')}
        </h3>
      </CrewLabel>
    </CrewCards>
  );
};

export default CrewIndicator;