import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePopper } from 'react-popper';
import { PuffLoader } from 'react-spinners';
import styled from 'styled-components';
import useAutocomplete from '~/hooks/useAutocomplete';
import theme from '~/theme';
import TextInput from './TextInputUncontrolled';

const Wrapper = styled.div`
  position: relative;
  & > span {
    display: inline-block;
    height: 32px;
  }
`;

const Options = styled.div`
  background: #111;
  font-size: 15px;
  max-height: 200px;
  min-width: ${p => p.width ? `${p.width}px` : 'auto'};
  overflow: auto;
  position: absolute;
  ${p => p.dropUp && `
    bottom: 32px;
  `}
`;
const Option = styled.div`
  background-color: transparent;
  cursor: ${p => p.theme.cursors.active};
  padding: 8px;
  transition: background-color 200ms ease;
  width: 100%;
  &${p => p.isHighlighted ? '' : ':hover'} {
    background-color: rgba(${p => p.theme.colors.mainRGB}, 0.3);
  }
`;
const Footnote = styled.div`
  font-size: 10px;
  opacity: 0.6;
`;
const Loading = styled.div`
  display: ${p => p.isLoading ? 'block' : 'none'};
  pointer-events: none;
  position: absolute;
  right: 22px;
  top: 8px;
`;

const Autocomplete = ({
  assetType,
  dropdownProps = {},
  onSelect,
  selected,
  width,
  ...inputProps
}) => {
  const {
    formatFootnote,
    formatLabel,
    options,
    isLoading,
    searchTerm,
    setSearchTerm,
    valueKey
  } = useAutocomplete(assetType);

  const textInputEl = useRef();

  const [focused, setFocused] = useState();
  const [highlighted, setHighlighted] = useState(0);
  const [open, setOpen] = useState(false);
  const [popperEl, setPopperEl] = useState();
  const [referenceEl, setReferenceEl] = useState();

  const { styles, attributes } = usePopper(referenceEl, popperEl, {
    placement: 'bottom-start',
    modifiers: [
      {
        name: 'flip',
        options: {
          fallbackPlacements: ['top-start', 'top-end', 'right', 'left'],
        },
      },
    ],
  });

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      if (options[highlighted]) {
        handleSelection(options[highlighted]);
      }
    } else if (e.key === 'ArrowUp') {
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'ArrowDown') {
      setHighlighted((h) => Math.min(h + 1, options.length - 1));
    }
  }, [highlighted, options]);

  useEffect(() => {
    if (focused) setOpen(true);
    else if (!open) setSearchTerm('');
  }, [focused, open]);

  useEffect(() => {
    setHighlighted(0);
    if (searchTerm) setOpen(true);
  }, [searchTerm]);

  const handleSelection = useCallback((s) => {
    onSelect(s);
    setOpen(false);
    textInputEl.current.blur();
  }, []);

  return (
    <Wrapper onKeyDown={handleKeyDown}>
      <span ref={setReferenceEl}>
        <TextInput
          ref={textInputEl}
          onBlur={() => setFocused(false)}
          onInput={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setFocused(true)}
          value={(selected && !focused) ? formatLabel(selected) : searchTerm}
          width={width}
          {...inputProps}
        />
        <Loading isLoading={isLoading}>
          <PuffLoader color={theme.colors.main} size="16" />
        </Loading>
      </span>

      {(focused || open) && createPortal(
        <div ref={setPopperEl} style={{ ...styles.popper, zIndex: 1000 }} {...attributes.popper}>
          <Options width={width} {...dropdownProps}>
            {options.map((o, i) => (
              <Option key={o[valueKey]} isHighlighted={i === highlighted} onClick={() => handleSelection(o)}>
                <label>{formatLabel(o)}</label>
                {formatFootnote && <Footnote>{formatFootnote(o)}</Footnote>}
              </Option>
            ))}
          </Options>
        </div>,
        document.body
      )}
    </Wrapper>
  );
};

export default Autocomplete;