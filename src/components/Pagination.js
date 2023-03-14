import { useCallback } from 'react';
import styled from 'styled-components';

import { PreviousIcon, NextIcon, BeginningIcon } from '~/components/Icons';
import theme from '~/theme';
import Button from '~/components/ButtonAlt';

const StyledPagination = styled.div`
  display: flex;
  justify-content: flex-end;
  & > button {
    margin-left: 6px;
  }
`;

const Pagination = (props) => {
  const { currentPage, rowsPerPage, rowCount, onChangePage } = props;
  const handlePrevious = useCallback(() => onChangePage(currentPage - 1), [ currentPage, onChangePage ]);
  const handleNext = useCallback(() => onChangePage(currentPage + 1), [ currentPage, onChangePage ]);
  const handleFirst = useCallback(() => onChangePage(1), [ onChangePage ]);

  return (
    <StyledPagination>
      <Button
        flip
        disabled={currentPage === 1}
        onClick={handleFirst}
        size="icon"
        background="transparent"
        color={theme.colors.main}>
        <BeginningIcon />
      </Button>

      <Button
        flip
        disabled={currentPage === 1}
        onClick={handlePrevious}
        size="icon"
        background="transparent"
        color={theme.colors.main}>
        <PreviousIcon />
      </Button>

      <Button
        disabled={rowCount <= currentPage * rowsPerPage}
        flipCorner
        onClick={handleNext}
        size="icon"
        background="transparent"
        color={theme.colors.main}>
        <NextIcon />
      </Button>
    </StyledPagination>
  );
};

export default Pagination;
