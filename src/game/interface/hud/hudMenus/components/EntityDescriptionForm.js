import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import Button from '~/components/ButtonAlt';
import UncontrolledTextArea from '~/components/TextAreaUncontrolled';
import { InputBlock } from '~/components/filters/components';
import { nativeBool } from '~/lib/utils';
import useAnnotationManager, { isValidAnnotation } from '~/hooks/actionManagers/useAnnotationManager';

const ErrorContainer = styled.div`
  color: ${p => p.theme.colors.error};
  min-height: 25px;
`;

// TODO: create validity functions for annotaions
const EntityDescriptionForm = ({ entity, label, originalDesc, ...props }) => {
  const { saveAnnotation, savingAnnotation } = useAnnotationManager(entity);

  const [error, setError] = useState();
  const [desc, setDesc] = useState();
  useEffect(() => {
    if (!desc) setDesc(originalDesc)
  }, [originalDesc])

  const handleDescChange = useCallback(async (e) => {
    const val = e.currentTarget.value || '';
    setDesc(val);
    const err = !isValidAnnotation(val, entity.id, true, 'string'); // TODO: ...
    setError(typeof err === 'string' ? err : false); // TODO: ...
  }, [entity?.id]);

  const saveDescChange = useCallback(async () => {
    if (isValidAnnotation(desc)) {
      saveAnnotation(desc);
    }
  }, [entity?.id, desc]);

  return (
    <InputBlock>
      <label>{label}</label>
      <div>
        <UncontrolledTextArea
          disabled={nativeBool(!entity || savingAnnotation)}
          onChange={handleDescChange}
          placeholder="Type a custom description..."
          value={desc === undefined ? originalDesc : desc} />
      </div>
      <ErrorContainer>{error}</ErrorContainer>
      <div style={{ borderTop: '1px solid #333' }}>
        <div style={{ flex: 1 }} />
        <Button
          disabled={nativeBool(!entity || savingAnnotation || !desc || error || (desc === originalDesc))}
          size="small"
          onClick={() => setDesc(originalDesc)}
          style={{ marginRight: 6 }}>Cancel</Button>
        <Button
          disabled={nativeBool(!entity || savingAnnotation || !desc || error || (desc === originalDesc))}
          loading={savingAnnotation}
          size="small"
          isTransaction
          onClick={saveDescChange}>Update</Button>
      </div>
    </InputBlock>
  );
};

export default EntityDescriptionForm;