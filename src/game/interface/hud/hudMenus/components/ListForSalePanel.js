import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Building, Entity, Permission } from '@influenceth/sdk';

import { CloseIcon, FormAgreementIcon, LotControlIcon, PermissionIcon, RadioCheckedIcon, RadioUncheckedIcon, SwayIcon, WarningIcon } from '~/components/Icons';
import CollapsibleBlock from '~/components/CollapsibleBlock';
import Button from '~/components/ButtonAlt';
import Autocomplete from '~/components/Autocomplete';
import formatters from '~/lib/formatters';
import IconButton from '~/components/IconButton';
import { CheckboxButton, CheckboxRow, InputBlock } from '~/components/filters/components';
import { formatFixed, nativeBool, reactBool } from '~/lib/utils';
import UncontrolledTextInput from '~/components/TextInputUncontrolled';
import UncontrolledTextArea from '~/components/TextAreaUncontrolled';
import usePolicyManager from '~/hooks/actionManagers/usePolicyManager';
import EntityName from '~/components/EntityName';
import actionButtons from '../../actionButtons';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import LiveTimer from '~/components/LiveTimer';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import useCrew from '~/hooks/useCrew';
import EntityLink from '~/components/EntityLink';
import useNftSaleManager from '~/hooks/actionManagers/useNftSaleManager';

const borderColor = `rgba(255, 255, 255, 0.15)`;

const Section = styled.div`
  border-top: 1px solid ${borderColor};
  padding: 10px 0;
`;

const Warning = styled.div`
  align-items: center;
  display: flex;
  font-size: 85%;
  margin-top: 10px;
  & svg {
    color: ${p => p.theme.colors.red};
    flex: 0 0 30px;
    font-size: 20px;
    margin-right: 4px;
  }
  & span {
    color: ${p => p.theme.colors.main};
    display: inline-block;
  }
`;

const ListForSalePanel = ({ entity }) => {
  const { updateListing, isPendingUpdate } = useNftSaleManager(entity);

  const originalPrice = useMemo(() => (entity?.Nft?.price || 0) / 1e6, [entity?.Nft?.price]);

  const [forSale, setForSale] = useState(originalPrice > 0);
  const [price, setPrice] = useState(originalPrice || 0);

  const isDirty = useMemo(() => (originalPrice !== (forSale ? price : 0)), [forSale, originalPrice, price]);

  const isIncomplete = useMemo(() => (forSale && !(price > 0)), [forSale, price]);

  const onUpdatePrice = useCallback((e) => {
    setPrice((e.currentTarget.value ? parseInt(e.currentTarget.value) : '') || '');
  }, []);

  const cancelForSale = useCallback(() => {
    setForSale(originalPrice > 0);
    setPrice(originalPrice);
  }, [originalPrice]);

  const saveForSale = useCallback(() => {
    updateListing(forSale ? price : 0);
  }, [forSale, price]);

  const config = useMemo(() => {
    return {
      color: originalPrice ? '#363d65' : '#7e2b2a'
    };
  }, [originalPrice]);

  return (
    <CollapsibleBlock
      uncollapsibleProps={{ headerColor: config.color }}
      title={`List for Sale`}
      titleAction={(isOpen) => !isOpen && (<span style={{ color: config.color }}>{originalPrice > 0 ? '' : 'Not '} For Sale</span>)}
      initiallyClosed>

      <Section>
        <CheckboxRow disabled={nativeBool(isPendingUpdate)} onClick={() => setForSale(false)}>
          <CheckboxButton checked={!forSale}>
            {!forSale ? <RadioCheckedIcon /> : <RadioUncheckedIcon />}
          </CheckboxButton>
          <span>Not for Sale</span>
        </CheckboxRow>
        <CheckboxRow disabled={nativeBool(isPendingUpdate)} onClick={() => setForSale(true)}>
          <CheckboxButton checked={forSale}>
            {forSale ? <RadioCheckedIcon /> : <RadioUncheckedIcon />}
          </CheckboxButton>
          <UncontrolledTextInput
            disabled={nativeBool(isPendingUpdate)}
            onChange={onUpdatePrice}
            value={price}
            style={{ marginRight: 6 }} />
          <span style={{ marginRight: 40 }}>SWAY</span>
        </CheckboxRow>
        {forSale > 0 && (
          <Warning>
            <WarningIcon />
            <span>Note: Control of the ship's manifest and inventories will transfer with any sale.</span>
          </Warning>
        )}
      </Section>

      <Section style={{ paddingBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            disabled={nativeBool(isPendingUpdate)}
            onClick={() => cancelForSale()}
            size="small"
            subtle>Cancel</Button>
          <Button
            disabled={nativeBool(!isDirty || isIncomplete || isPendingUpdate)}
            loading={isPendingUpdate}
            isTransaction
            onClick={() => saveForSale()}
            size="small"
            style={{ marginLeft: 6 }}
            subtle>Update</Button>
        </div>
      </Section>
    </CollapsibleBlock>
  );
};

export default ListForSalePanel;