import { useCallback } from 'react';
import styled from 'styled-components';

import { PreviousIcon, NextIcon, BeginningIcon } from '~/components/Icons';
import Button from '~/components/ButtonAlt';

const StyledPagination = styled.div`
  display: flex;
  justify-content: flex-end;
  & > button {
    margin-right: 6px;
  }
`;

const Pagination = (props) => {
  const { currentPage, rowsPerPage, rowCount, onChangePage } = props;
  const handlePrevious = useCallback(() => onChangePage(currentPage - 1), [ currentPage, onChangePage ]);
  const handleNext = useCallback(() => onChangePage(currentPage + 1), [ currentPage, onChangePage ]);
  const handleFirst = useCallback(() => onChangePage(1), [ onChangePage ]);

  return (
    <StyledPagination className={props.className}>
      <Button
        flip
        disabled={currentPage === 1}
        onClick={handleFirst}
        size="wideicon">
        <BeginningIcon />
      </Button>

      <Button
        flip
        disabled={currentPage === 1}
        onClick={handlePrevious}
        size="wideicon">
        <PreviousIcon />
      </Button>

      <Button
        disabled={rowCount <= currentPage * rowsPerPage}
        flipCorner
        onClick={handleNext}
        size="wideicon">
        <NextIcon />
      </Button>
    </StyledPagination>
  );
};

export default Pagination;
