import styled from 'styled-components';

import useCrewContext from '~/hooks/useCrewContext';
import useCrewMember from '~/hooks/useCrewMember';
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

const CrewIndicator = ({ crew, flip, label = 'Owned by' }) => {
  const { crew: myCrew } = useCrewContext();
  const { data: captain } = useCrewMember((crew?.crewMembers || [])[0]);
  return (
    <CrewCards flip>
      <CrewCardFramed
        borderColor={`rgba(${theme.colors.mainRGB}, 0.7)`}
        crewmate={captain}
        isCaptain
        lessPadding
        width={60} />
      <CrewLabel>
        <div>{label}</div>
        <h3>
          {crew?.name || `Crew #${crew?.i}`}
          {myCrew?.i === crew?.i ? <label> (Me)</label> : null}
        </h3>
      </CrewLabel>
    </CrewCards>
  );
};

export default CrewIndicator;