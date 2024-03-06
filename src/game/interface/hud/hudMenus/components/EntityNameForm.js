import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import UncontrolledTextInput from '~/components/TextInputUncontrolled';
import { InputBlock } from '~/components/filters/components';
import { nativeBool } from '~/lib/utils';
import useNameAvailability from '~/hooks/useNameAvailability';
import useChangeName from '~/hooks/actionManagers/useChangeName';
import Button from '~/components/ButtonAlt';

const ErrorContainer = styled.div`
  color: ${p => p.theme.colors.error};
  min-height: 25px;
`;

const EntityNameForm = ({ entity, label, originalName, ...props }) => {
  const isNameValid = useNameAvailability(entity?.label);

  const { changeName, changingName } = useChangeName(entity);

  const [error, setError] = useState();
  const [name, setName] = useState();
  useEffect(() => {
    if (!name) setName(originalName)
  }, [originalName])

  const handleNameChange = useCallback(async (e) => {
    const val = e.currentTarget.value || '';
    setName(val);
    const err = await isNameValid(val, entity.id, true, 'string');
    setError(typeof err === 'string' ? err : false);
  }, [entity?.id]);

  const saveNameChange = useCallback(async () => {
    if (await isNameValid(name, entity?.id)) {
      changeName(name);

      // TODO: building names only have to be unique per asteroid, not globally
    }
  }, [entity?.id, name]);

  return (
    <InputBlock>
      <label>{label}</label>
      <div>
        <UncontrolledTextInput
          disabled={nativeBool(!entity || changingName)}
          onChange={handleNameChange}
          placeholder="Type a custom name..."
          value={name === undefined ? originalName : name} />
      </div>
      <ErrorContainer>{error}</ErrorContainer>
      <div style={{ borderTop: '1px solid #333' }}>
        <div style={{ flex: 1 }} />
        <Button
          disabled={nativeBool(!entity || changingName || !name || error || (name === originalName))}
          size="small"
          highContrast
          onClick={() => setName(originalName)}
          style={{ marginRight: 6 }}>Cancel</Button>
        <Button
          disabled={nativeBool(!entity || changingName || !name || error || (name === originalName))}
          loading={changingName}
          size="small"
          highContrast
          isTransaction
          onClick={saveNameChange}>Update</Button>
      </div>
    </InputBlock>
  );
};

export default EntityNameForm;