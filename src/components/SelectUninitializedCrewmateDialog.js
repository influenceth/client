import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import ChoicesDialog from '~/components/ChoicesDialog';
import CrewmateCard from '~/components/CrewmateCard';
import { GenesisIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import { getCloudfrontUrl } from '~/lib/assetUtils';
import { nativeBool } from '~/lib/utils';

const coverImage = getCloudfrontUrl('influence/production/images/stories/earth-and-the-void/1.jpg', { w: 1500 });

const Flourish = styled.div`
  align-items: center;
  color: ${p => p.theme.colors.main};
  display: flex;
  font-size: 175px;
  height: 100%;
  opacity: 0.5;
  padding-left: 30px;
`;

const Subtitle = styled.span`
  color: #AAA;
  font-size: 18px;
  b {
    color: ${p => p.theme.colors.main};
    font-weight: normal;
  }
`;

const Wrapper = styled.div`
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: flex-start;
  width: 100%;
`;
const cardWidth = 220;
const CardWrapper = styled.div`
  overflow-y: hidden;
  overflow-x: auto;
  padding: 10px 0;
  white-space: nowrap;
  width: 100%;
`;
const CardOuter = styled.div`
  background: rgba(${p => p.theme.colors.mainRGB}, 0.15);
  border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.3);
  display: inline-block;
  margin-left: 15px;
  opacity: 0.7;
  padding: 10px;
  transition: background 250ms ease, border 250ms ease, opacity 250ms ease;;
  width: ${cardWidth}px;

  &:first-child { margin-left: 0; }

  ${p => p.selected
    ? `
      background: rgba(${p.theme.colors.mainRGB}, 0.4);
      border: 1px solid rgba(${p.theme.colors.mainRGB}, 0.7);
      opacity: 1;
    `
    : `
      cursor: ${p.theme.cursors.active};
      &:hover {
        background: rgba(${p.theme.colors.mainRGB}, 0.3);
        border: 1px solid rgba(${p.theme.colors.mainRGB}, 0.6);
        opacity: 1;
      }
    `
  }

  @media (max-height: 875px) {
    margin-left: 1vh;
    width: 22vh;
  }
`;

const RecruitTally = styled.div`
  color: ${p => p.theme.colors.main};
  margin-right: 16px;
  & b {
    color: white;
    font-weight: normal;
  }
`;

const SelectUninitializedCrewmateDialog = ({ onSelect }) => {
  const { adalianRecruits, arvadianRecruits, crew, loading } = useCrewContext();

  const [selected, setSelected] = useState();

  const onCloseDestination = useMemo(() => {
    if (crew?.Crew?.roster?.length > 0) {
      return '/crew';
    } else {
      return '/';
    }
  }, [crew]);

  useEffect(() => {
    if (!loading) {
      if (!arvadianRecruits?.length) {
        onSelect(adalianRecruits?.[0]?.id || 0);
      }
    }
  }, [adalianRecruits, arvadianRecruits?.length, loading])

  return (
    <ChoicesDialog
      dialogTitle="Crewmate Creation"
      onCloseDestination={onCloseDestination}
      coverImage={coverImage}
      coverImageCenter="35% 75%"
      contentOverride={(
        <Wrapper>
          <CardWrapper>
            {arvadianRecruits.map((crewmate) => (
              <CardOuter key={crewmate.id} selected={selected === crewmate.id}>
                <CrewmateCard
                  crewmate={crewmate}
                  hasOverlay
                  showClassInHeader
                  hideFooter
                  noWrapName
                  onClick={() => setSelected(crewmate.id)} />
              </CardOuter>
            ))}
          </CardWrapper>
        </Wrapper>
      )}
      flourish={<Flourish><GenesisIcon /></Flourish>}
      flourishWidth={cardWidth}
      leftButton={{
        label: 'Create New Adalian',
        onClick: () => onSelect(adalianRecruits?.[0]?.id || 0),
        props: { badge: adalianRecruits?.length || 0, width: cardWidth }
      }}
      rightButton={{
        label: 'Next',
        onClick: () => selected ? onSelect(selected) : null,
        props: { disabled: nativeBool(!selected) },
        preLabel: <RecruitTally>Unrecruited Arvad Crewmates: <b>{arvadianRecruits.length}</b></RecruitTally>
      }}
      title="Arvad Crewmates"
      subtitle={<Subtitle>Your account has <b>Arvad Crewmates</b> that can be recruited</Subtitle>}
    />
  );
};

export default SelectUninitializedCrewmateDialog;