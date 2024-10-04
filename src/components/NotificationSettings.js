import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { PuffLoader as Loader } from 'react-spinners';

import ButtonPill from '~/components/ButtonPill';
import useUser from '~/hooks/useUser';
import UncontrolledTextInput, { TextInputWrapper } from './TextInputUncontrolled';
import { CheckedIcon, CheckIcon, CloseIcon, DotsIcon, UncheckedIcon } from './Icons';
import theme from '~/theme';
import Button from './ButtonAlt';
import { nativeBool } from '~/lib/utils';
import api from '~/lib/api';
import useStore from '~/hooks/useStore';
import { useQueryClient } from 'react-query';
import useSession from '~/hooks/useSession';

const Checkboxes = styled.div`
  padding: 0 8px;
`;

const Wrapper = styled.div`
  width: 100%;
  ${p => p.standalone && `
    padding: 10px 0;
    ${Checkboxes} {
      margin-bottom: 10px;
      margin-top: 15px;
      &:before {
        content: 'When to notify...';
        display: block;
        margin-bottom: 4px;
      }
    }
  `}
`;

const CheckboxRow = styled.div`
  align-items: center;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  flex: 1;
  padding: 6px 8px;
  & > svg {
    color: ${p => p.theme.colors.main};
    flex: 0 0 20px;
    font-size: 20px;
    margin-right: 12px;
  }
  & > span {
    color: #656565;
  }
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const Details = styled.div`
  align-items: center;
  background: #222;
  display: flex;
  flex-direction: row;
  margin-bottom: 10px;
  padding: 8px 12px;
  position: relative;
  width: 100%;
`;

const EmailStatus = styled.div`
  color: ${p => p.theme.colors[p.emailStatus === 'valid' ? 'success' : 'error']};
  font-size: 20px;
  height: 24px;
  margin-top: ${p => p.emailStatus === 'valid' ? -2 : 2}px;
  opacity: ${p => p.emailStatus === 'saving' ? 0.33 : 1};
  position: absolute;
  right: 24px;
  width: ${p => p.emailStatus === 'saving' ? '24px' : 'auto'};
`;

const NotificationSettings = ({ onLoading, onValid, ...props }) => {
  const queryClient = useQueryClient();
  const { token } = useSession();
  const { data: user, isLoading } = useUser();

  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [focused, setFocused] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [hideEmail, setHideEmail] = useState(false);
  const [notifStatus, setNotifStatus] = useState('');
  const [subscriptions, setSubscriptions] = useState({
    crew: true,
    lease: true,
    task: true,
  });

  useEffect(() => {
    if (user) {
      setEmailAddress(user.emailAddress || '');
      setSubscriptions(user.notificationSubscriptions || {
        crew: true,
        lease: true,
        task: true,
      });
      setHideEmail(user.emailAddress && props.standalone);
    }
  }, [user]);

  useEffect(() => {
    if (onLoading) onLoading(isLoading);
  }, [isLoading]);

  const emailIsValid = useMemo(
    () => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailAddress),
    [emailAddress]
  );

  useEffect(() => {
    if (!onValid) return;
    onValid((!emailAddress || emailIsValid) && !(emailStatus === 'saving' || notifStatus === 'saving'))
  }, [emailStatus, notifStatus, user?.emailAddress, onValid]);

  useEffect(() => {
    if (!focused) {
      if (emailAddress) {
        if (emailIsValid) {
          if (emailAddress !== user?.emailAddress) {
            setEmailStatus('saving');
            api.updateUser({ emailAddress })
              .then(() => queryClient.setQueryData(['user', token], (u) => ({ ...u, emailAddress })) )
              .catch((e) => {
                setEmailStatus('error');
                createAlert({
                  type: 'GenericAlert',
                  level: 'warning',
                  data: { content: 'User update failed. Please try again.' },
                  duration: 5000
                });
              });
          } else {
            setEmailStatus('valid');
          }
        } else {
          setEmailStatus('error');
        }
      } else if (props.standalone) {
        setEmailStatus('error');
      }
    } else {
      setEmailStatus('');
    }
  }, [focused, user?.emailAddress]);

  useEffect(() => {
    if (user && (
      subscriptions.crew !== user.notificationSubscriptions?.crew
      || subscriptions.lease !== user.notificationSubscriptions?.lease
      || subscriptions.task !== user.notificationSubscriptions?.task
    )) {
      setNotifStatus('saving');
      api.updateUser({ notificationSubscriptions: subscriptions })
        .then(() => queryClient.setQueryData(['user', token], (u) => ({ ...u, notificationSubscriptions: subscriptions })) )
        .catch((e) => {
          setNotifStatus('');
          createAlert({
            type: 'GenericAlert',
            level: 'warning',
            data: { content: 'User update failed. Please try again.' },
            duration: 5000
          });
        });
    } else {
      setNotifStatus('');
    }
  }, [subscriptions]);

  const handleChange = useCallback((e) => {
    setEmailAddress(e.currentTarget.value || '');
  }, []);

  // TODO: if standalone, hide email if already set
  return (
    <Wrapper {...props}>
      {!hideEmail && (
        <Details>
          <EmailStatus emailStatus={emailStatus}>
            {emailStatus === 'saving' && <Loader size="24" color="white" />}
            {emailStatus === 'valid' && <CheckIcon />}
            {emailStatus === 'error' && <CloseIcon />}
          </EmailStatus>
          <UncontrolledTextInput
            autoFocus={props.standalone}
            onBlur={() => setFocused(false)}
            onFocus={() => setFocused(true)}
            onChange={handleChange}
            placeholder="Email Address..."
            style={{
              borderColor: emailStatus === 'error' ? theme.colors.error : undefined,
              height: 40,
              marginRight: 0,
              width: '100%'
            }}
            value={emailAddress} />
        </Details>      
      )}
      <Checkboxes>
        <CheckboxRow onClick={() => setSubscriptions((n) => ({ ...n, crew: !n.crew }))}>
          {subscriptions.crew ? <CheckedIcon /> : <UncheckedIcon />}
          <span>
            Crew Alerts
          </span>
        </CheckboxRow>
        <CheckboxRow onClick={() => setSubscriptions((n) => ({ ...n, task: !n.task }))}>
          {subscriptions.task ? <CheckedIcon /> : <UncheckedIcon />}
          <span>
            Task Alerts
          </span>
        </CheckboxRow>
        <CheckboxRow onClick={() => setSubscriptions((n) => ({ ...n, lease: !n.lease }))}>
          {subscriptions.lease ? <CheckedIcon /> : <UncheckedIcon />}
          <span>
            Lease is Expiring (3 days)
          </span>
        </CheckboxRow>
      </Checkboxes>
    </Wrapper>
  );
};

export default NotificationSettings;
