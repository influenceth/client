import styled from 'styled-components';
import { useHistory } from 'react-router-dom';

import ChoicesDialog from '~/components/ChoicesDialog';
import CrewCard from '~/components/CrewCard';
import { GenesisIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import { getCloudfrontUrl } from '~/lib/assetUtils';

const coverImage = getCloudfrontUrl('influence/production/images/stories/earth-and-the-void/1.jpg', { w: 1500 });

const Flourish = styled.div`
  align-items: center;
  color: ${p => p.theme.colors.main};
  display: flex;
  font-size: 175px;
  height: 100%;
  opacity: 0.5;
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
  & > div {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.15);
    border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.3);
    cursor: ${p => p.theme.cursors.active};
    display: inline-block;
    margin-left: 15px;
    opacity: 0.7;
    padding: 10px;
    transition: background 250ms ease, border 250ms ease, opacity 250ms ease;;
    width: ${cardWidth}px;

    &:first-child { margin-left: 0; }

    &:hover {
      background: rgba(${p => p.theme.colors.mainRGB}, 0.3);
      border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.6);
      opacity: 1;
    }

    @media (max-height: 875px) {
      margin-left: 1vh;
      width: 22vh;
    }
  }
`;

const SelectUninitializedCrewmateDialog = () => {
  const history = useHistory();
  
  const { adalianRecruits, arvadianRecruits } = useCrewContext();

  return (
    <ChoicesDialog
      dialogTitle="Crewmate Creation"
      onCloseDestination={''/* TODO: */}
      coverImage={coverImage}
      coverImageCenter="35% 75%"
      contentOverride={(
        <Wrapper>
          <CardWrapper>
            {arvadianRecruits.map((crewmate) => (
              <div>
                <CrewCard
                  key={crewmate.id}
                  crewmate={crewmate}
                  hasOverlay
                  hideCollectionInHeader
                  showClassInHeader
                  hideFooter
                  noWrapName
                  onClick={() => { history.push(`/crew-assignment/arvadian/${crewmate.id}/`); }} />
              </div>
            ))}
          </CardWrapper>
        </Wrapper>
      )}
      flourish={<Flourish><GenesisIcon /></Flourish>}
      flourishWidth={cardWidth}
      leftButton={{
        // TODO: should we put a badge if they have adalianRecruits available?
        label: 'Create a New Adalian',
        onClick: () => { history.push('/crew-assignment/adalian/0/'); },
        props: { style: { width: cardWidth } }
      }}
      rightButton={{
        label: 'Next',
        onClick: () => {/* noop */},
        props: { disabled: 'true' }
      }}
      title="Arvad Crewmates"
      subtitle={<Subtitle>Account has <b>Arvad Crewmates</b> that can be recruited</Subtitle>}
    />
  );
};

export default SelectUninitializedCrewmateDialog;