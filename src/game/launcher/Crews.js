import { useMemo } from 'react';
import styled from 'styled-components';

import CrewmateCardFramed, { EmptyCrewmateCardFramed } from '~/components/CrewmateCardFramed';
import CrewLocationLabel from '~/components/CrewLocationLabel';
import LiveFoodStatus from '~/components/LiveFoodStatus';
import useCrewContext from '~/hooks/useCrewContext';
import useHydratedLocation from '~/hooks/useHydratedLocation';
import useScreenSize from '~/hooks/useScreenSize';
import formatters from '~/lib/formatters';
import theme from '~/theme';

const CrewTitle = styled.div`
  font-size: 32px;
  margin-bottom: 15px;
  padding-left: 15px;
`;

const CrewWrapper = styled.div`
  display: flex;
  flex-direction: row;
  padding-left: 15px;
`;

const CrewInfoContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  & > div {
    margin-left: 3px;

    & > svg {
      font-size: 24px;
    }
  }
`;

const TitleBar = styled.div`
  ${CrewInfoContainer} & {
    align-items: center;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    display: flex;
    flex-direction: row;
    font-size: 20px;
    justify-content: space-between;
    margin-left: 7px;
    pointer-events: auto;
    padding: 4px 12px;

    & svg {
      font-size: 18px;
    }
  }
`;

const BaseLocation = styled.div`
  color: white;
  cursor: ${p => p.theme.cursors.active};
  font-size: 14.5px;
  span {
    color: #AAA;
    &:before {
      content: " > ";
    }
  }
  svg {
    color: ${p => p.theme.colors.main};
    margin-right: 2px;
    vertical-align: middle;
  }
`;


const Crewmates = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: row;
  margin-bottom: 10px;
  padding-left: 5px;
  & > * {
    margin-left: 10px;
    &:first-child {
      margin-left: 0;
    }
  }
`;


const Crews = () => {
  const { crew, loading } = useCrewContext();
  const hydratedLocation = useHydratedLocation(crew?._location);
  const screenSize = useScreenSize();

  const [captainWidth, crewmateWidth] = useMemo(() => {
    const containerWidth = (
      screenSize?.width
        - 300 // play button
        - 2 * 50  // outer margin
      ) / 2 // (half)
      - 50 // padding in bottom left
      - 100 // margin with button;
    const split = containerWidth * 0.2;
    return [
      1.178 * split,
      0.955 * split,
    ]
  }, [screenSize?.width])

  if (loading || !screenSize?.width) return null;
  return (
    <>
      <CrewTitle>{formatters.crewName(crew)}</CrewTitle>
      <CrewWrapper>
        {crew?._crewmates?.[0] && (
          <CrewmateCardFramed
            borderColor={`rgba(${theme.colors.mainRGB}, 0.6)`}
            CrewmateCardProps={{ hideHeader: true}}
            crewmate={crew?._crewmates?.[0]}
            isCaptain
            warnIfNotOwnedBy={crew?.Nft?.owner}
            width={captainWidth} />
        )}
        {!crew?._crewmates?.[0] && <EmptyCrewmateCardFramed hideHeader width={captainWidth} />}

        <CrewInfoContainer>
          <Crewmates>
            {Array.from(Array(4)).map((_, i) => {
              const crewmate = crew?._crewmates?.[i + 1];
              if (!crewmate) {
                return <EmptyCrewmateCardFramed key={i} hideHeader width={crewmateWidth} />;
              }
              return (
                <CrewmateCardFramed
                  key={i}
                  borderColor={`rgba(${theme.colors.mainRGB}, 0.6)`}
                  CrewmateCardProps={{ hideHeader: true }}
                  crewmate={crewmate}
                  warnIfNotOwnedBy={crew?.Nft?.owner}
                  width={crewmateWidth}
                  noArrow />
              );
            })}
          </Crewmates>

          {/* NOTE: this info is null in practice for empty crew (even if set) */}
          {crew?._crewmates?.[0] && (
            <TitleBar>
              <BaseLocation>
                <CrewLocationLabel hydratedLocation={hydratedLocation} />
              </BaseLocation>

              <LiveFoodStatus crew={crew} />
            </TitleBar>
          )}
        </CrewInfoContainer>

      </CrewWrapper>
    </>
  );
}

export default Crews;