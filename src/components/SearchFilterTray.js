import { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import Button from '~/components/ButtonAlt';
import { CloseIcon, FilterIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';

const FilterTally = styled.div`
  align-items: center;
  color: ${p => p.theme.colors.main};
  ${p => p.clickable && `cursor: ${p.theme.cursors.active};`}
  display: flex;
  flex-direction: row;
  font-size: 90%;
  margin-left: 12px;
  & > svg {
    font-size: 135%;
    margin-right: 2px;
  }
`;

const SearchFilterTray = ({ handleClickFilters, filters, updateFilters }) => {
  const onClear = useCallback(() => {
    updateFilters({});
  }, []);

  const onClickFilters = useCallback((e) => {
    if (handleClickFilters) handleClickFilters(e);
  }, [handleClickFilters]);

  const activeFilters = useMemo(() => Object.values(filters).filter((v) => v !== undefined).length, [filters]);
  if (activeFilters === 0) return null;
  return (
    <>
      <Button onClick={onClear} size="medium" padding="0 15px 0 10px" width="auto" subtle>
        <CloseIcon style={{ marginRight: 5 }} /> <span>Clear</span>
      </Button>
      <FilterTally clickable={!!handleClickFilters} onClick={onClickFilters}>
        <FilterIcon />
        {activeFilters} Active Filter{activeFilters === 1 ? '' : 's'}
      </FilterTally>
    </>
  );
}

export default SearchFilterTray;
