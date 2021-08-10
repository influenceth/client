import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  RiFilter2Fill as FilterIcon,
  RiBubbleChartFill as RadiusIcon,
  RiDonutChartFill as SpectralIcon,
} from 'react-icons/ri';
import { TiSortAlphabetically as NameIcon } from 'react-icons/ti';
import { MdAccountBalanceWallet as OwnerIcon } from 'react-icons/md';
import { BiLoader as InclinationIcon } from 'react-icons/bi';
import { CgShapeCircle as EccentricityIcon } from 'react-icons/cg';
import { AiOutlineArrowsAlt as AxisIcon } from 'react-icons/ai';

import useStore from '~/hooks/useStore';
import Section from '~/components/Section';
import IconButton from '~/components/IconButton';
import NameFilter from './filters/NameFilter';
import RadiusFilter from './filters/RadiusFilter';
import SpectralTypeFilter from './filters/SpectralTypeFilter';
import AxisFilter from './filters/AxisFilter';
import InclinationFilter from './filters/InclinationFilter';
import EccentricityFilter from './filters/EccentricityFilter';
import OwnershipFilter from './filters/OwnershipFilter';

const filterKeys = {
  name: [ 'name' ],
  radius: [ 'radiusMin', 'radiusMax' ],
  spectralType: [ 'spectralType' ],
  axis: [ 'axisMin', 'axisMax' ],
  inclination: [ 'incMin', 'incMax' ],
  eccentricity: [ 'eccMin', 'eccMax' ],
  ownership: [ 'ownedBy' ]
};

const Controls = styled.div`
  flex: 0 0 auto;
  padding-bottom: 10px;
`;

const StyledFilters = styled.div`
  box-shadow: inset 0 5px 7px -8px #000;
  flex: 0 1 auto;
  list-style-type: none;
  margin: 0;
  overflow-y: scroll;
  padding: 0 2px 0 0;
`;

const FilterGroup = styled.div`
  align-items: stretch;
  background-color: ${props => props.theme.colors.contentHighlight};
  border: 1px solid ${props => props.theme.colors.contentBorder};
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  padding: 10px;
  position: relative;
  margin-top: 10px;

  & h3 {
    font-size: ${props => props.theme.fontSizes.detailText};
    margin: 0 0 5px 0;
    padding: 0;
  }
`;

const Filters = (props) => {
  const activeHighlight = useStore(state => state.asteroids.highlight);
  const updateFilters = useStore(state => state.dispatchFiltersUpdated);
  const updateHighlights = useStore(state => state.dispatchHighlightUpdated);

  const [ filters, setFilters ] = useState({});
  const [ activeFilters, setActiveFilters ] = useState({
    name: false,
    radius: true,
    spectralType: false,
    axis: false,
    inclination: false,
    eccentricity: false,
    ownership: false
  });

  useEffect(() => {
    updateFilters(filters);
  }, [ filters, updateFilters ]);

  useEffect(() => {
    return () => {
      updateFilters({});
      updateHighlights(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const turnOnFilter = (name) => {
    setActiveFilters(Object.assign({}, activeFilters, { [name]: true }));
  };

  const turnOffFilter = (name) => {
    const newFilters = Object.assign({}, filters);
    filterKeys[name].forEach(k => delete newFilters[k]);
    setFilters(newFilters);
    setActiveFilters(Object.assign({}, activeFilters, { [name]: false }));
    if (activeHighlight?.field === name) updateHighlights(null);
  };

  const onFiltersChange = (v) => {
    setFilters(Object.assign({}, filters, v));
  };

  return (
    <Section
      name="filters"
      title="Map Filters"
      icon={<FilterIcon />}>
      <Controls>
        <IconButton
          data-tip={'Filter by Name'}
          onClick={() => activeFilters.name ? turnOffFilter('name') : turnOnFilter('name')}
          active={activeFilters.name}>
          <NameIcon />
        </IconButton>
        <IconButton
          data-tip={'Filter by Radius'}
          onClick={() => activeFilters.radius ? turnOffFilter('radius') : turnOnFilter('radius')}
          active={activeFilters.radius}>
          <RadiusIcon />
        </IconButton>
        <IconButton
          data-tip={'Filter by Spectral Type'}
          onClick={() => activeFilters.spectralType ? turnOffFilter('spectralType') : turnOnFilter('spectralType')}
          active={activeFilters.spectralType}>
          <SpectralIcon />
        </IconButton>
        <IconButton
          data-tip={'Filter by Semi-major Axis (Period)'}
          onClick={() => activeFilters.axis ? turnOffFilter('axis') : turnOnFilter('axis')}
          active={activeFilters.axis}>
          <AxisIcon />
        </IconButton>
        <IconButton
          data-tip={'Filter by Inclination'}
          onClick={() => activeFilters.inclination ? turnOffFilter('inclination') : turnOnFilter('inclination')}
          active={activeFilters.inclination}>
          <InclinationIcon />
        </IconButton>
        <IconButton
          data-tip={'Filter by Eccentricity'}
          onClick={() => activeFilters.eccentricity ? turnOffFilter('eccentricity') : turnOnFilter('eccentricity')}
          active={activeFilters.eccentricity}>
          <EccentricityIcon />
        </IconButton>
        <IconButton
          data-tip={'Filter by Ownership'}
          onClick={() => activeFilters.ownership ? turnOffFilter('ownership') : turnOnFilter('ownership')}
          active={activeFilters.ownership}>
          <OwnerIcon />
        </IconButton>
      </Controls>
      <StyledFilters>
        {activeFilters.name && <FilterGroup><NameFilter onChange={onFiltersChange} /></FilterGroup>}
        {activeFilters.radius && <FilterGroup><RadiusFilter onChange={onFiltersChange} /></FilterGroup>}
        {activeFilters.spectralType && <FilterGroup><SpectralTypeFilter onChange={onFiltersChange} /></FilterGroup>}
        {activeFilters.axis && <FilterGroup><AxisFilter onChange={onFiltersChange} /></FilterGroup>}
        {activeFilters.inclination && <FilterGroup><InclinationFilter onChange={onFiltersChange} /></FilterGroup>}
        {activeFilters.eccentricity && <FilterGroup><EccentricityFilter onChange={onFiltersChange} /></FilterGroup>}
        {activeFilters.ownership && <FilterGroup><OwnershipFilter onChange={onFiltersChange} /></FilterGroup>}
      </StyledFilters>
    </Section>
  );
};

export default Filters;
