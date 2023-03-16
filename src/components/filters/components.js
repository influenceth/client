import { useCallback, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { RiPaintFill as HighlightIcon } from 'react-icons/ri';

import IconButton from '~/components/IconButton';
import { CloseIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import { HudMenuCollapsibleSection } from '../../game/interface/hud/hudMenus/components';

const HighlightToggle = styled(IconButton)`
  color: ${p => p.enabled ? 'white' : '#444'};
  font-size: 14px;
  height: 1.6em;
  margin: 0;
  padding: 0;
  width: 1.6em;
`;

const Resetter = styled(IconButton)`
  background: rgba(${p => p.theme.colors.mainRGB}, 0.1);
  font-size: 14px;
  height: 1.6em;
  margin: 0 0 0 8px;
  padding: unset;
  width: 1.6em;
`;

export const InputBlock = styled.div`
  padding-bottom: 12px;
  padding-right: 2px;
  &:last-child {
    padding-bottom: 0;
  }

  label {
    font-size: 13px;
    margin-bottom: 4px;
    opacity: 0.5;
  }
  & > div {
    align-items: center;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    ${p => p.singleField ? '' : 'padding-top: 6px;'}
    width: 100%;

    & > span {
      flex: 1;
      font-size: 90%;
      opacity: 0.5;
      padding-left: 8px;
      transition: opacity 250ms ease;
    }

    ${p => p.singleField ? 'input { width: 100%; }' : ''}

    input:focus + span {
      opacity: 1;
    }
  }
`;

export const CheckboxButton = styled.button`
  background: transparent;
  border: 0;
  color: white;
  display: inline-block;
  font-family: inherit;
  font-size: 18px;
  height: 1em;
  margin-right: 6px;
  opacity: ${p => p.checked ? '1' : '0.3'};
  outline: 0;
  padding: 0;
  &:focus {
    opacity: 0.8;
  }
`;

export const CheckboxRow = styled.div`
  align-items: center;
  color: #999;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  padding: 4px 0;
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  & > svg {
    font-size: 18px;
    margin-right: 6px;
  }
  & > span {
    flex: 1;
  }
`;


const Highlighter = (props) => {
  const { active, onClick } = props;

  return (
    <HighlightToggle
      data-tip={active ? 'Disable highlighting' : 'Enable highlighting'}
      data-for="global"
      borderless
      enabled={active}
      onClick={onClick}>
      <HighlightIcon />
    </HighlightToggle>
  );
};

export const SearchMenu = ({
  assetType,
  children,
  fieldName,
  highlightColorMap,
  highlightColorRange,
  highlightFieldName,
  highlightMetadata,
  title,
  ...props
}) => {
  const highlight = useStore(s => s.assetSearch[assetType].highlight);
  const filters = useStore(s => s.assetSearch[assetType].filters);
  const updateHighlight = useStore(s => s.dispatchHighlightUpdated(assetType));
  const updateFilters = useStore(s => s.dispatchFiltersUpdated(assetType));

  const fieldHighlight = useMemo(() => highlight && highlight.field === highlightFieldName, [highlight, highlightFieldName]);

  useEffect(() => {
    // console.log('highlight', highlight)
  }, [highlight])

  const filterIsOn = useMemo(() => {
    return Array.isArray(fieldName)
      ? fieldName.reduce((acc, n) => acc || Object.keys(filters).includes(n), false)
      : filters[fieldName];
  }, [fieldName, filters]);

  const toggleHighlight = useCallback((e) => {
    e.stopPropagation();
    if (fieldHighlight) {
      updateHighlight();
    } else if (highlightColorMap) {
      updateHighlight({ field: highlightFieldName, colorMap: highlightColorMap, ...(highlightMetadata || {}) });
    } else if (highlightColorRange) {
      updateHighlight({ field: highlightFieldName, ...highlightColorRange, ...(highlightMetadata || {}) });
    }
  }, [highlightFieldName, fieldHighlight, highlightColorMap, highlightColorRange, highlightMetadata]);

  const resetFilter = useCallback((e) => {
    e.stopPropagation();
    const updated = { ...filters };
    const filterOut = Array.isArray(fieldName) ? fieldName : [fieldName];
    filterOut.forEach((n) => delete updated[n]);
    updateFilters(updated);
  }, [fieldName, filters]);

  useEffect(() => {
    if (fieldHighlight) {
      if (highlightColorMap) {
        updateHighlight({ field: highlightFieldName, colorMap: highlightColorMap, ...(highlightMetadata || {}) });
      } else if (highlightColorRange) {
        updateHighlight({ field: highlightFieldName, ...highlightColorRange, ...(highlightMetadata || {}) });
      }
    }
  }, [highlightColorMap, highlightColorRange, highlightMetadata]);

  return (
    <HudMenuCollapsibleSection
      titleText={title}
      titleAction={(isOpen) => (
        <div style={{ display: 'flex' }}>
          {highlightFieldName && (isOpen || fieldHighlight) && (
            <Highlighter
              active={!!fieldHighlight}
              onClick={toggleHighlight} />
          )}
          {filterIsOn && (
            <Resetter
              data-tip="Reset Filter"
              data-place="left"
              onClick={resetFilter}>
              <CloseIcon />
            </Resetter>
          )}
        </div>
      )}
      {...props}>
      {children}
    </HudMenuCollapsibleSection>
  );
}

