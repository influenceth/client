import { useEffect, useRef } from 'react';
import styled from 'styled-components';

import constructionBackground from '~/assets/images/modal_headers/Construction.png';
import {
  UnplanBuildingIcon,
  WarningOutlineIcon
} from '~/components/Icons';
import { useBuildingAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useConstructionManager from '~/hooks/useConstructionManager';

import {
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogBody,
  FlexSection,
  FlexSectionInputBlock,
  BuildingImage,
  FlexSectionSpacer,
} from './components';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStage from '~/lib/actionStages';

const UnplanWarning = styled.div`
  align-items: center;
  color: ${p => p.theme.colors.error};
  display: flex;
  flex: 1;
  height: 100%;
  justify-content: flex-end;
  & span:last-child {
    font-size: 175%;
    line-height: 1em;
    margin-left: 8px;
  }
`;

const UnplanBuilding = ({ asteroid, lot, constructionManager, stage, ...props }) => {
  const buildings = useBuildingAssets();
  const { currentConstruction, constructionStatus, unplanConstruction } = useConstructionManager(asteroid?.i, lot?.i);
  const { captain } = useCrewContext();

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (always close if not in planned or canceling state)
    if (!['PLANNED', 'CANCELING'].includes(constructionStatus)) {
      props.onClose();
    }
    // (close on status change from)
    else if (['PLANNED'].includes(lastStatus.current)) {
      if (constructionStatus !== lastStatus.current) {
        props.onClose();
      }
    }
    lastStatus.current = constructionStatus;
  }, [constructionStatus]);

  const capableType = currentConstruction?.capableType || 0;

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <UnplanBuildingIcon />,
          label: 'Remove Building Site',
          status: stage === actionStage.NOT_STARTED ? 'Confirm' : '',
        }}
        captain={captain}
        location={{ asteroid, lot }}
        crewAvailableTime={0}
        onClose={props.onClose}
        taskCompleteTime={0}
        stage={stage} />

      <ActionDialogBody style={{ paddingBottom: 15 }}>
        <FlexSection>
          <FlexSectionInputBlock
            title="Current Plans"
            image={<BuildingImage building={buildings[capableType]} unfinished />}
            label={buildings[capableType].name}
            disabled
            sublabel="Site Plans"
          />
          <FlexSectionSpacer />
          <FlexSectionInputBlock bodyStyle={{ background: 'transparent' }}>
            <UnplanWarning>
              <span>On-site materials<br/>will be abandoned</span>
              <span><WarningOutlineIcon /></span>
            </UnplanWarning>
          </FlexSectionInputBlock>
        </FlexSection>
      </ActionDialogBody>

      <ActionDialogFooter
        goLabel="Remove Site"
        onGo={unplanConstruction}
        stage={stage}
        {...props} />
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  const constructionManager = useConstructionManager(asteroid?.i, lot?.i);
  const { stageByActivity } = constructionManager;

  useEffect(() => {
    if (!asteroid || !lot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  return (
    <ActionDialogInner
      actionImage={constructionBackground}
      isLoading={isLoading}
      stage={stageByActivity.unplan}>
      <UnplanBuilding
        asteroid={asteroid}
        lot={lot}
        constructionManager={constructionManager}
        stage={stageByActivity.unplan}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
