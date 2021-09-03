import { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import IconButton from '~components/IconButton';
import { PreviousIcon, NextIcon, BeginningIcon } from '~/components/Icons';

const StyledPagination = styled.div`
  display: flex;
  margin-top: 10px;
  position: absolute;
  right: 0;
`;

const Pagination = (props) => {
  const { currentPage, rowsPerPage, rowCount, onChangePage } = props;
  const handlePrevious = useCallback(() => onChangePage(currentPage - 1), [ currentPage, onChangePage ]);
  const handleNext = useCallback(() => onChangePage(currentPage + 1), [ currentPage, onChangePage ]);
  const handleFirst = useCallback(() => onChangePage(1), [ onChangePage ]);
  const startCount = useMemo(() => (currentPage - 1) * rowsPerPage + 1, [ currentPage, rowsPerPage ]);
  const endCount = useMemo(() => (currentPage - 1) * rowsPerPage + rowCount, [ currentPage, rowsPerPage, rowCount ]);

  console.log(props);
  return (
    <StyledPagination>
      <IconButton
        onClick={handleFirst}
        disabled={currentPage === 1}>
        <BeginningIcon />
      </IconButton>
      <IconButton
        onClick={handlePrevious}
        disabled={currentPage === 1}>
        <PreviousIcon />
      </IconButton>
      <IconButton
        onClick={handleNext}
        disabled={rowCount < rowsPerPage}>
        <NextIcon />
      </IconButton>
    </StyledPagination>
  );
};

export default Pagination;
