import { useEffect } from 'react';

import useSession from '~/hooks/useSession'
import { useControlledAlert } from '~/game/interface/Alerts';
import { InfluenceIcon } from '~/components/Icons';
import styled from 'styled-components';
import useCrewContext from '~/hooks/useCrewContext';
import formatters from '~/lib/formatters';
import CrewmateCardFramed, { CrewCaptainCardFramed, EmptyCrewmateCardFramed } from '~/components/CrewmateCardFramed';
import theme from '~/theme';
import LiveFoodStatus from '~/components/LiveFoodStatus';
import CrewLocationCompactLabel from '~/components/CrewLocationCompactLabel';

const captainWidth = 232;
const crewmateWidth = 72;
const clipCorner = 12;
const Wrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow: auto;
  & > h2 {
    font-size: 35px;
    font-weight: normal;
    margin-top: 0;
    margin-bottom: 15px;
  }
`;
const StatusRow = styled.div`
  align-items: center;
  background: rgba(0, 0, 0, 0.7);
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - ${clipCorner}px),
    calc(100% - ${clipCorner}px) 100%,
    ${clipCorner}px 100%,
    0 calc(100% - ${clipCorner}px)
  );
  display: flex;
  flex-direction: row;
  font-size: 90%;
  height: 40px;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 15px;
  width: 360px;
`;
const CaptainWrapper = styled.div``;
const CrewmatesWrapper = styled.div`
  display: flex;
  flex-direction: row;
  & > *:not(:first-child) {
    margin-left: 8px;
  }
  margin-bottom: 15px;
  padding: 12px 12px 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
`;

const Play = () => {
  const { crew } = useCrewContext();
  
  if (!crew) return null;
  return (
    <Wrapper>
      <h2>{formatters.crewName(crew)}</h2>
      <StatusRow>
        <CrewLocationCompactLabel crew={crew} alignLeft fontSize="inherit" noClick />
        <LiveFoodStatus crew={crew} fontSize="inherit" />
      </StatusRow>
      <CaptainWrapper>
        <CrewCaptainCardFramed borderColor={theme.colors.darkMain} crewId={crew.id} width={captainWidth} />
      </CaptainWrapper>
      <CrewmatesWrapper>
        {[1,2,3,4].map((i) => {
          if (crew._crewmates[i]) {
            return (
              <CrewmateCardFramed
                key={i}
                borderColor={theme.colors.darkMain}
                crewmate={crew._crewmates[i]}
                noAnimation
                noArrow
                width={crewmateWidth} />
            );
          }
          return <EmptyCrewmateCardFramed width={crewmateWidth} hideHeader />
        })}
      </CrewmatesWrapper>
    </Wrapper>
  );
}

export default Play;