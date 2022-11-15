import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { VscListUnordered as PopperIcon } from 'react-icons/vsc';

import Button from '~/components/ButtonRounded';

const Wrapper = styled.div`
  position: relative;
`;

const Content = styled.div``;

const Poppable = ({ children, disabled, label, ...styleProps }) => {
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => {
    if (!disabled)
    setOpen((o) => !o);
  }, [disabled]);

  useEffect(() => {
    setOpen(false);
  }, [disabled]);

  return (
    <Wrapper>
      <Button
        disabled={disabled}
        onClick={handleToggle}
        {...styleProps}>
        <PopperIcon /> <span>{label}</span>
      </Button>
      {open && (
        <Content {...styleProps}>
          {children}
        </Content>
      )}
    </Wrapper>
  );
};

export default Poppable;