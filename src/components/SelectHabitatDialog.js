import { useCallback } from 'react';
import styled from 'styled-components';
import { Building } from '@influenceth/sdk'

import { getBuildingIcon, getCloudfrontUrl } from '~/lib/assetUtils';
import ChoicesDialog from './ChoicesDialog';
import { ResourceImage } from './ResourceThumbnail';
import ClipCorner from './ClipCorner';

const coverImage = getCloudfrontUrl('influence/production/images/stories/adalian-recruitment/3.jpg', { w: 1500 });

const BuildingThumbnailWrapper = styled.div`
  border: 1px solid #333;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 10px),
    calc(100% - 10px) 100%,
    0 100%
  );
  color: #333;
  position: relative;
  height: 140px;
  width: 225px;
`;

const Flourish = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  & h3 {
    border-bottom: 1px solid #333;
    color: #999;
    font-size: 16px;
    font-weight: normal;
    margin: 0 0 10px;
    padding-bottom: 5px;
    text-transform: uppercase;
  }
`;
const HabCard = styled.div`
  background: rgba(${p => p.theme.colors.mainRGB}, 0.2);
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 10px),
    calc(100% - 10px) 100%,
    0 100%
  );
  flex: 1;
  padding: 15px;

  & > div:last-child {
    margin-top: 15px;
    div {
      color: white;
      font-size: 110%;
      margin-bottom: 4px;
    }
    label {
      color: #777;
      span {
        color: white;
        font-weight: normal;
      }
    }
  }
`;

const SelectHabitatDialog = () => {

  const onSelectHabitat = useCallback((choice) => () => {

  }, []);

  return (
    <ChoicesDialog
      dialogTitle="Crewmate Creation"
      onCloseDestination={''/* TODO: */}
      coverImage={coverImage}
      coverImageCenter="35% 75%"
      content="All new crewmates begin their lives at a Habitat, a purpose-made life support structure from where they may venture out to perform tasks."
      choices={[
        { id: 1, text: 'Pick for me. Automatically select one of the starting Habitats on Adalia Prime; a reasonable starting location for new Adalians.' },
        { id: null, text: <>Pick for myself. Search the current asteroid for potential starting Habitats built by others. NOTE: Once you've found a suitable Habitat, select the <b>Recruit Crewmate</b> option to continue.</> },
      ]}
      onSelect={onSelectHabitat}
      prompt="Where would you like to create this crewmate?"
      flourish={(
        <Flourish>
          <h3>Starting Location</h3>
          <HabCard>
            <BuildingThumbnailWrapper>
              <ResourceImage src={getBuildingIcon(Building.IDS.HABITAT, 'w150')} />
              <ClipCorner dimension={10} />
            </BuildingThumbnailWrapper>
            <div>
              <div>TODO: Building Name</div>
              <label>Asteroid Name &gt; <span>Lot id</span></label>
            </div>
          </HabCard>
        </Flourish>
      )}
      title="Crew Starting Habitat"
    />
  );
};

export default SelectHabitatDialog;