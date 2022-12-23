import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { VscListUnordered as PopperIcon } from 'react-icons/vsc';

import Button from '~/components/ButtonRounded';

const Wrapper = styled.div`
  position: relative;
`;

const Content = styled.div`
  background: black;
  margin-left: -100px;
  position: fixed;
  width: 540px;
  z-index: 31;
`;

const Title = styled.div`
  border-left: 3px solid ${p => p.theme.colors.main};
  color: white;
  font-size: 20px;
  padding: 10px 15px;
  text-transform: uppercase;
`;
const Body = styled.div`
  height: 300px;
`;

const Poppable = ({ children, closeOnChange, disabled, label, title, ...styleProps }) => {
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => {
    if (!disabled)
    setOpen((o) => !o);
  }, [disabled]);

  useEffect(() => {
    setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (open) setOpen(false);
  }, [closeOnChange]);

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
          <Title>{title}</Title>
          <Body>
            {children}
          </Body>
        </Content>
      )}
    </Wrapper>
  );
};

export default Poppable;