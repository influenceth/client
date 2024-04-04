import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import Button from '~/components/ButtonAlt';
import UncontrolledTextArea from '~/components/TextAreaUncontrolled';
import { InputBlock } from '~/components/filters/components';
import { nativeBool } from '~/lib/utils';
import useAnnotationManager, { isValidAnnotation } from '~/hooks/actionManagers/useAnnotationManager';
import useDescriptionAnnotation from '~/hooks/useDescriptionAnnotation';
import useAnnotationContent from '~/hooks/useAnnotationContent';

const ErrorContainer = styled.div`
  color: ${p => p.theme.colors.error};
  min-height: 25px;
`;

// TODO: create validity functions for annotaions
const EntityDescriptionForm = ({ buttonSize = 'small', buttonText = 'Update', entity, label, minTextareaHeight = '200px', onCancel, onSave }) => {
  const { saveAnnotation, savingAnnotation, txPending } = useAnnotationManager(entity);
  const { data: annotation, isLoading: annotationLoading } = useDescriptionAnnotation(entity);
  const { data: originalDesc, isLoading: contentLoading } = useAnnotationContent(annotation);
  const isLoading = annotationLoading || contentLoading;

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

  const handleCancel = useCallback(async () => {
    setDesc(originalDesc);
    if (onCancel) onCancel();
  }, [onCancel, originalDesc]);

  useEffect(() => {
    if (txPending && onSave) {
      onSave();
    }
  }, [txPending]);

  return (
    <InputBlock>
      <label>{label}</label>
      <div>
        <UncontrolledTextArea
          disabled={nativeBool(!entity || savingAnnotation)}
          onChange={handleDescChange}
          placeholder="Type a custom description..."
          style={{ minHeight: minTextareaHeight }}
          value={desc === undefined ? originalDesc : desc} />
      </div>
      <ErrorContainer>{error}</ErrorContainer>
      <div style={{ borderTop: '1px solid #333' }}>
        <div style={{ flex: 1 }} />
        <Button
          disabled={nativeBool(!entity || savingAnnotation || !desc || error)}
          size={buttonSize}
          onClick={handleCancel}
          style={{ marginRight: 6 }}>Cancel</Button>
        <Button
          disabled={nativeBool(isLoading || !entity || savingAnnotation || !desc || error || (desc === originalDesc))}
          loading={savingAnnotation}
          size={buttonSize}
          isTransaction
          onClick={saveDescChange}>{buttonText}</Button>
      </div>
    </InputBlock>
  );
};

export default EntityDescriptionForm;