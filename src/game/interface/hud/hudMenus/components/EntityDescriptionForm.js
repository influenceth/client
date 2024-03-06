import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import Button from '~/components/ButtonAlt';
import UncontrolledTextArea from '~/components/TextAreaUncontrolled';
import { InputBlock } from '~/components/filters/components';
import { nativeBool } from '~/lib/utils';
import useNameAvailability from '~/hooks/useNameAvailability';
import useChangeName from '~/hooks/actionManagers/useChangeName';

const ErrorContainer = styled.div`
  color: ${p => p.theme.colors.error};
  min-height: 25px;
`;

// TODO: create validity functions for annotaions
// TODO: connect to annotations
const EntityDescriptionForm = ({ entity, label, originalDesc, ...props }) => {
  const isNameValid = useNameAvailability(entity?.label);

  const { changeName, changingName } = useChangeName(entity);

  const [error, setError] = useState();
  const [name, setDesc] = useState();
  useEffect(() => {
    if (!name) setDesc(originalDesc)
  }, [originalDesc])

  const handleDescChange = useCallback(async (e) => {
    const val = e.currentTarget.value || '';
    setDesc(val);
    const err = await isNameValid(val, entity.id, true, 'string');
    setError(typeof err === 'string' ? err : false);
  }, [entity?.id]);

  const saveDescChange = useCallback(async () => {
    if (await isNameValid(name, entity?.id)) {
      changeName(name);

      // TODO: building names only have to be unique per asteroid, not globally
    }
  }, [entity?.id, name]);

  return (
    <InputBlock>
      <label>{label}</label>
      <div>
        <UncontrolledTextArea
          disabled={nativeBool(!entity || changingName)}
          onChange={handleDescChange}
          placeholder="Type a custom description..."
          value={name === undefined ? originalDesc : name} />
      </div>
      <ErrorContainer>{error}</ErrorContainer>
      <div style={{ borderTop: '1px solid #333' }}>
        <div style={{ flex: 1 }} />
        <Button
          disabled={nativeBool(!entity || changingName || !name || error || (name === originalDesc))}
          size="small"
          highContrast
          onClick={() => setDesc(originalDesc)}
          style={{ marginRight: 6 }}>Cancel</Button>
        <Button
          disabled={nativeBool(!entity || changingName || !name || error || (name === originalDesc))}
          loading={changingName}
          size="small"
          highContrast
          isTransaction
          onClick={saveDescChange}>Update</Button>
      </div>
    </InputBlock>
  );
};

export default EntityDescriptionForm;