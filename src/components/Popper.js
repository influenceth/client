import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { VscListUnordered as PopperIcon } from 'react-icons/vsc';

import Button from '~/components/ButtonRounded';

const Wrapper = styled.div`
  position: relative;
`;

const ClickAwayListener = styled.div`
  background: transparent;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
`;

const defaultWidth = 540;
const Content = styled.div`
  background: black;
  margin-left: -${p => (p.contentWidth || defaultWidth) * 0.2}px;
  position: fixed;
  max-width: 100vw;
  width: ${p => p.contentWidth || defaultWidth}px;
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
  height: ${p => `${p.contentHeight || 400}px`};
`;

const Poppable = ({ children, closeOnChange, closeOnClickAway = true, disabled, label, title, ...styleProps }) => {
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
        buttonWidth="135px"
        {...styleProps}>
        <PopperIcon /> <span>{label}</span>
      </Button>
      {open && (
        <>
          {closeOnClickAway && <ClickAwayListener onClick={() => setOpen(false)} />}
          <Content {...styleProps}>
            <Title>{title}</Title>
            <Body {...styleProps}>
              {children}
            </Body>
          </Content>
        </>
      )}
    </Wrapper>
  );
};

export default Poppable;