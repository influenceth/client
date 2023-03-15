import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  FiCrosshair as TargetIcon,
  FiSquare as UncheckedIcon,
  FiCheckSquare as CheckedIcon
} from 'react-icons/fi';
import { RingLoader } from 'react-spinners';
import DataTable, { createTheme } from 'react-data-table-component';
import { Crew, Asteroid, Construction, Lot } from '@influenceth/sdk';

import constructionBackground from '~/assets/images/modal_headers/Construction.png';
import coreSampleBackground from '~/assets/images/modal_headers/CoreSample.png';
import extractionBackground from '~/assets/images/modal_headers/Extraction.png';
import surfaceTransferBackground from '~/assets/images/modal_headers/SurfaceTransfer.png';
import Button from '~/components/ButtonAlt';
import ButtonRounded from '~/components/ButtonRounded';
import Dialog from '~/components/Dialog';
import Dropdown from '~/components/Dropdown';
import IconButton from '~/components/IconButton';
import {
  UnplanBuildingIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  ConstructIcon,
  NewCoreSampleIcon,
  CrewIcon,
  DeconstructIcon,
  ExtractionIcon,
  ImproveCoreSampleIcon,
  PlanBuildingIcon,
  LocationIcon,
  PlusIcon,
  ResourceIcon,
  SurfaceTransferIcon,
  TimerIcon,
  WarningOutlineIcon
} from '~/components/Icons';
import Poppable from '~/components/Popper';
import SliderInput from '~/components/SliderInput';
import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import { useBuildingAssets, useResourceAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import useConstructionManager from '~/hooks/useConstructionManager';
import useInterval from '~/hooks/useInterval';
import { formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import {
  CoreSampleSelection,
  DestinationSelection,

  BuildingPlanSection,
  BuildingRequirementsSection,
  DeconstructionMaterialsSection,
  DestinationPlotSection,
  ExistingSampleSection,
  ExtractionAmountSection,
  ExtractSampleSection,
  ItemSelectionSection,
  RawMaterialSection,
  ToolSection,

  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogLoader,
  ActionDialogStats,
  ActionDialogTimers,

  getBonusDirection,
} from './components';
import useAsteroid from '~/hooks/useAsteroid';

const PlanBuilding = ({ asteroid, plot, ...props }) => {
  const buildings = useBuildingAssets();
  const resources = useResourceAssets();
  const { currentConstruction, constructionStatus, planConstruction } = useConstructionManager(asteroid?.i, plot?.i);
  const { captain } = useCrewContext();

  const [capableType, setCapableType] = useState();

  const stats = useMemo(() => [
    {
      label: 'Abandonment Timer',
      value: formatTimer(Lot.GRACE_PERIOD),
      isTimeStat: true,
      warning: (
        <>
          Building sites become <b>Abandoned</b> if they have not started construction by the time the <b>Abandonment Timer</b> expires.
          <br/><br/>
          Any items left on an <b>Abandoned Site</b> may be claimed by other players!
        </>
      )
    },
  ], []);

  useEffect(() => {
    if (constructionStatus === 'PLANNING' && !capableType) {
      if (currentConstruction?.capableType) setCapableType(currentConstruction.capableType)
    }
  }, [currentConstruction?.capableType]);

  // stay in this window until PLANNED, then swap to CONSTRUCT
  useEffect(() => {
    if (!['READY_TO_PLAN', 'PLANNING'].includes(constructionStatus)) {
      props.onSetAction('CONSTRUCT');
    }
  }, [constructionStatus]);

  return (
    <>
      <ActionDialogHeader
        asteroid={asteroid}
        captain={captain}
        plot={plot}
        action={{
          actionIcon: <PlanBuildingIcon />,
          headerBackground: constructionBackground,
          label: 'Plan Building Site',
          completeLabel: 'Building Site',
        }}
        status="BEFORE"
        {...props} />

      <BuildingPlanSection building={buildings[capableType]} onBuildingSelected={setCapableType} status={constructionStatus === 'PLANNING' ? 'DURING' : 'BEFORE'} />
      <BuildingRequirementsSection
        building={buildings[capableType]}
        label="Required for Construction"
        resources={resources} />

      <ActionDialogStats stats={stats} status="BEFORE" />
      <ActionDialogTimers crewAvailableIn={0} actionReadyIn={0} />
      <ActionDialogFooter
        buttonsLoading={constructionStatus === 'PLANNING'}
        goDisabled={!capableType}
        goLabel="Plan Site"
        onGo={() => planConstruction(capableType)}
        status={constructionStatus === 'PLANNING' ? 'DURING' : 'BEFORE'}
        {...props} />
    </>
  );
};

export default PlanBuilding;