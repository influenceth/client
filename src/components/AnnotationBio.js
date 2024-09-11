import { useState } from '~/lib/react-debug';
import styled from 'styled-components';
import LoadingAnimation from 'react-spinners/PropagateLoader';

import AdalianFlourish from '~/components/AdalianFlourish';
import Button from '~/components/ButtonAlt';
import EntityName from '~/components/EntityName';
import EntityDescriptionForm from '~/game/interface/hud/hudMenus/components/EntityDescriptionForm';
import useAnnotationContent from '~/hooks/useAnnotationContent';
import useAnnotationManager from '~/hooks/actionManagers/useAnnotationManager';
import useDescriptionAnnotation from '~/hooks/useDescriptionAnnotation';
import useEarliestActivity from '~/hooks/useEarliestActivity';
import { reactPreline } from '~/lib/utils';

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  padding: 20px 0 10px 20px;
`;

const FlourishWrapper = styled.div`
  align-items: center;
  display: flex;
  flex: 0 0 205px;
  flex-direction: column;
  margin-right: 50px;
  overflow: hidden;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 640px;
  padding-right: 40px;
  width: 100%;
  & > h4 {
    color: white;
    font-size: 15px;
    margin-top: 0;
    margin-bottom: 10px;
    text-transform: uppercase;
  }
  & > p {
    color: ${p => p.theme.colors.main};
    flex: 1;
    font-size: 14px;
    line-height: 20px;
    margin: 0;
    overflow: auto;
    padding-right: 20px;
    ${p => p.empty && `
      &:before {
        content: "No bio has been created yet.";
        color: #777;
      }
    `}
  }
  & > div {
    flex: 1;
    & > div {
      height: calc(100% - 62px);
      & > div:first-of-type {
        height: 100%;
      }
    }
  }
`;

const Loading = styled.span`
  align-items: center;
  display: flex;
  flex: 1;
  justify-content: center;
  opacity: 0.3;
  & > span {
    margin-top: -30px;
  }
`;

const Footer = styled.span`
  border-top: 1px solid #333;
  display: flex;
  justify-content: flex-end;
  margin-bottom: -10px;
  padding-top: 10px;
`;

const AnnotationBio = ({ entity, isEditable }) => {
  const { data: earliest } = useEarliestActivity(entity);
  const { data: annotation, isLoading: annotationLoading } = useDescriptionAnnotation(entity);
  const { data: content, isLoading: contentLoading } = useAnnotationContent(annotation);
  const { savingAnnotation } = useAnnotationManager(earliest, entity);

  const [editing, setEditing] = useState();

  const isLoading = annotationLoading || contentLoading || savingAnnotation;
  return (
    <Wrapper>
      <FlourishWrapper>
        <AdalianFlourish style={{ minHeight: '150px' }} />
      </FlourishWrapper>
      <Content empty={!annotation}>
        <h4><EntityName id={entity?.id} label={entity?.label} /> Public Bio</h4>
        {!editing && (
          <>
            {isLoading
              ? <Loading><LoadingAnimation color="white" loading /></Loading>
              : <p>{reactPreline(content)}</p>
            }
            {isEditable && (
              <Footer>
                <Button
                  disabled={isLoading}
                  loading={isLoading}
                  onClick={() => setEditing(true)} size="medium">Edit Bio</Button>
              </Footer>
            )}
          </>
        )}
        {editing && (
          <div>
            <EntityDescriptionForm
              buttonSize="medium"
              buttonText="Update Bio"
              entity={entity}
              minTextareaHeight={0}
              onCancel={() => setEditing(false)}
              onSave={() => setEditing(false)} />
          </div>
        )}
      </Content>
    </Wrapper>
  );
};

export default AnnotationBio;