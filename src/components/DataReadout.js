import styled from 'styled-components';
import Clipboard from 'react-clipboard.js';

import useStore from '~/hooks/useStore';
import { CopyIcon } from '~/components/Icons';

const StyledDataReadout = styled.div`
  align-items: center;
  display: flex;
  font-size: ${p => p.theme.fontSizes.mainText};
  padding: 5px 0;
`;

const Label = styled.label`
  color: ${p => p.theme.colors.secondaryText};
  display: flex;
  flex: 0 1 auto;
  padding-right: 10px;
  white-space: nowrap;

  &:after {
    content: ':';
  }
`;

const Data = styled.span`
  color: ${p => p.theme.colors.mainText};
  display: flex;
  flex: 1 1 0;
  overflow: hidden;
  position: relative;
  text-overflow: ellipsis;
`;

const StyledClipboard = styled(Clipboard)`
  background-color: transparent;
  border: 0;
  color: ${p => p.theme.colors.mainText};
  visibility: hidden;

  &:hover {
    color: ${p => p.theme.colors.main};
  }

  &:active {
    color: ${p => p.theme.colors.mainText};
  }

  ${Data}:hover & {
    visibility: visible;
  }
`;

const DataReadout = (props) => {
  const { copyable, ...restProps } = props;
  const playSound = useStore(s => s.dispatchSoundRequested);

  return (
    <StyledDataReadout {...restProps}>
      <Label>{props.label || ''}</Label>
      <Data>
        {props.children}
        {copyable && (
          <StyledClipboard
            data-clipboard-text={copyable}
            onClick={() => playSound('effects.click')}>
            <CopyIcon />
          </StyledClipboard>
        )}
      </Data>
    </StyledDataReadout>
  );
};

export default DataReadout;
