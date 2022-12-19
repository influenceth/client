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
import CrewCard from '~/components/CrewCard';
import Dialog from '~/components/Dialog';
import Dropdown from '~/components/Dropdown';
import IconButton from '~/components/IconButton';
import {
  CancelBlueprintIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  ConstructIcon,
  CoreSampleIcon,
  CrewIcon,
  DeconstructIcon,
  ExtractionIcon,
  ImproveCoreSampleIcon,
  LayBlueprintIcon,
  LocationPinIcon,
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
import useCrew from '~/hooks/useCrew';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import useConstructionManager from '~/hooks/useConstructionManager';
import useInterval from '~/hooks/useInterval';
import { getAdjustedNow, getCrewAbilityBonus } from '~/lib/utils';

import {
  LiveTimer,
  BlueprintSelection,
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
  ActionDialogStats,
  ActionDialogTimers,

  formatTimer,
  getBonusDirection,
} from './components';

const ImproveCoreSample = (props) => {
  return null;
  // const { asteroid, onClose, plot } = props;
  // const buildings = useBuildingAssets();
  // const resources = useResourceAssets();
  // const { constructionStatus, startConstruction, finishConstruction } = useConstructionManager(asteroid?.i, plot?.i);
  // const { crew, crewMemberMap } = useCrew();
  
  // const crewMembers = crew.crewMembers.map((i) => crewMemberMap[i]);
  // const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
  // const constructionBonus = getCrewAbilityBonus(5, crewMembers);

  // const crewTravelTime = Asteroid.getLotTravelTime(asteroid.i, 1, plot.i, crewTravelBonus.totalBonus);
  // const constructionTime = Construction.getConstructionTime(plot.building.assetId, constructionBonus.totalBonus);
  // console.log([plot.building.assetId, constructionBonus, constructionTime]);

  // const stats = [
  //   { label: 'Discovery Minimum', value: '0 tonnes', direction: -1 },
  //   { label: 'Discovery Maximum', value: '10,000 tonnes', direction: 1 },
  //   { label: 'Crew Travel', value: '4m 0s', direction: 1 },
  //   { label: 'Sample Time', value: '47m 30s', direction: 1 },
  // ];

  // const status = useMemo(() => {
  //   if (constructionStatus === 'PLANNED') {
  //     return 'BEFORE';
  //   } else if (constructionStatus === 'UNDER_CONSTRUCTION') {
  //     return 'DURING';
  //   }
  //   return 'AFTER';
  // }, [constructionStatus]);

  // useEffect(() => {
  //   if (constructionStatus === 'FINISHING' || constructionStatus === 'OPERATIONAL') {
  //     onClose();
  //   }
  // }, [constructionStatus]);

  // return (
  //   <>
  //     <ActionDialogHeader
  //       {...props}
  //       action={{
  //         actionIcon: <ImproveCoreSampleIcon />,
  //         headerBackground: coreSampleBackground,
  //         label: 'Improve Core Sample',
  //         completeLabel: 'Sample',
  //         completeStatus: 'Improved',
  //         crewRequirement: 'duration',
  //       }}
  //       status={status}
  //       startTime={plot?.building?.startTime}
  //       targetTime={plot?.building?.committedTime} />

  //     <ExistingSampleSection
  //       sampleTally={plot.coreSamplesExist}
  //       resources={resources}
  //       resource={resource || resources[8]}
  //       status={status}
  //       tonnage={2345}
  //       overrideTonnage={complete && 3456} />

  //     {status === 'BEFORE' && (
  //       <ToolSection resource={resources[2]} sourcePlot={destinationPlot} />
  //     )}

  //     <ActionDialogStats stats={stats} status={status} />

  //     {status === 'BEFORE' && (
  //       <ActionDialogTimers
  //         crewAvailableIn={2 * crewTravelTime}
  //         actionReadyIn={crewTravelTime + constructionTime} />
  //     )}

  //     <ActionDialogFooter
  //       {...props}
  //       disabled={false}
  //       finalizeLabel="Complete"
  //       goLabel="Improve Sample"
  //       onFinalize={finishConstruction}
  //       onGo={startConstruction}
  //       status={status} />
  //   </>
  // );
};

export default ImproveCoreSample;