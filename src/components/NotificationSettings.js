import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import ButtonPill from '~/components/ButtonPill';
import useUser from '~/hooks/useUser';
import UncontrolledTextInput from './TextInputUncontrolled';
import { CheckedIcon, UncheckedIcon } from './Icons';
import { usePushNotificationSetup } from '~/hooks/usePushNotificationSetup';
import theme from '~/theme';
import Button from './ButtonAlt';
import { nativeBool } from '~/lib/utils';
import api from '~/lib/api';

const Buttons = styled.div`
  align-items: center;
  display: flex;
  margin-bottom: 10px;
  width: 100%;
  & button {
    flex: 1;
    justify-content: center;
    margin-right: 10px;
    white-space: nowrap;
    width: auto;
    &:last-child {
      margin-right: 0;
    }
  }
`;

const Checkboxes = styled.div``;

const Wrapper = styled.div`
  width: 100%;
  ${p => p.standalone && `
    padding: 10px 0;
    ${Buttons} {
      & button {
        height: 40px;
      }
    }
    ${Checkboxes} {
      margin-bottom: 10px;
      margin-top: 20px;
      &:before {
        content: 'When to notify...';
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
  padding: 8px 0;
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
`;

const NotificationSettings = ({ onLoading, onValid, ...props }) => {
  const { data: user, isLoading } = useUser();
  const pushNotif = usePushNotificationSetup();

  const [blurred, setBlurred] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [channel, setChannel] = useState('');
  const [subscriptions, setSubscriptions] = useState({
    crew: true,
    lease: true,
    task: true,
  });

  useEffect(() => {
    if (user) {
      setEmailAddress(user.emailAddress || '');
      setChannel(user.notificationChannel || '');
      setSubscriptions(user.notificationSubscriptions || {
        crew: true,
        lease: true,
        task: true,
      });
    }
  }, [user]);

  useEffect(() => {
    if (onLoading) onLoading(isLoading);
  }, [isLoading]);

  const handleUserChange = useCallback((kvp) => {
    api.updateUser(kvp)
      .catch((e) => {
        createAlert({
          type: 'GenericAlert',
          level: 'warning',
          data: { content: 'User update failed.' },
          duration: 5000
        });
        setChannel(user?.notificationChannel)
    });
  }, [user]);

  const handleChannelChange = useCallback((c) => {
    api.updateUser({ notificationChannel: c })
      .catch((e) => {
        createAlert({
          type: 'GenericAlert',
          level: 'warning',
          data: { content: 'User update failed.' },
          duration: 5000
        });
        setChannel(user?.notificationChannel)
      });
  }, [user?.notificationChannel]);






  const handleChange = useCallback((e) => {
    setEmailAddress(e.currentTarget.value || '');
  }, []);

  // TODO: if 'push' is set on user, but cannot get subscription,
  //  then set to '' to prompt them to reconnect subscription

  const handleConnectPush = useCallback(async () => {
    return (pushNotif.permission || await pushNotif.requestPermission())
      && (pushNotif.isSubscribed || await pushNotif.subscribe());
  }, [pushNotif]);

  const emailIsInvalid = useMemo(
    () => !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailAddress),
    [emailAddress]
  );

  const emailIsUnchanged = user?.emailAddress === emailAddress;

  useEffect(() => {
    if (!onValid) return;
    onValid(
      !channel
      || (channel === 'email' && !!user.emailAddress)
      || (channel === 'push' && !!user?.pushAddress)
    )
  }, [channel, user?.emailAddress, user?.pushAddress, onValid]);

  const handleSaveUser = useCallback(() => {
    const update = {};
    if (channel !== user.notificationChannel) {
      update.notificationChannel = channel;
    }
    if (emailAddress && emailAddress !== user.emailAddress) {
      update.emailAddress = emailAddress;
    }
    
  }, [channel, emailAddress, pushNotif.subscription, subscriptions]);

  return (
    <Wrapper {...props}>
      <Buttons>
        <ButtonPill
          active={!channel}
          activeColor={theme.colors.error}
          onClick={handleChannelChange('')}>
          None
        </ButtonPill>
        {/* 
        <ButtonPill
          active={channel === 'push'}
          onClick={handleChannelChange('push')}>
          Browser Notification
        </ButtonPill>
        */}
        <ButtonPill
          active={channel === 'email'}
          onClick={handleChannelChange('email')}>
          Email
        </ButtonPill>
        {/* 
        <ButtonPill
          active={channel === 'sms'}
          onClick={handleChannelChange('sms')}>
          SMS
        </ButtonPill>
        */}
      </Buttons>
      {channel === 'email' && (
        <Details>
          <UncontrolledTextInput
            onBlur={() => setBlurred(true)}
            onChange={handleChange}
            placeholder="Email Address..."
            style={{ borderColor: blurred && emailIsInvalid ? theme.colors.error : undefined, height: 40, width: '100%' }}
            value={emailAddress} />
          <Button
            disabled={nativeBool(emailIsInvalid || emailIsUnchanged)}
            onClick={handleSaveUser}
            style={{ marginLeft: -1 }}
            width={100}>
            Save
          </Button>
        </Details>
      )}
      {channel === 'push' && (
        <Details>
          <div style={{ flex: 1 }}>
            <label>Status: </label>
            <span style={{ color: pushNotif.subscription ? theme.colors.success : theme.colors.error }}>
              {!pushNotif.isSupported && 'Not Supported'}
              {pushNotif.isSupported && !pushNotif.permission && 'Permission Needed'}
              {pushNotif.isSupported && pushNotif.permission && !pushNotif.subscription && 'Disconnected'}
              {pushNotif.isSupported && pushNotif.permission && pushNotif.subscription && 'Connected'}
            </span>
          </div>
          <Button onClick={handleConnectPush} disabled={!pushNotif.isSupported || !!pushNotif.subscription}>
            Connect
          </Button>
        </Details>
      )}
      {!!channel && (
        <Checkboxes>
          <CheckboxRow onClick={() => setSubscriptions((n) => ({ ...n, crew: !n.crew }))}>
            {subscriptions.crew ? <CheckedIcon /> : <UncheckedIcon />}
            <span>
              Crew is Ready
            </span>
          </CheckboxRow>
          <CheckboxRow onClick={() => setSubscriptions((n) => ({ ...n, task: !n.task }))}>
            {subscriptions.task ? <CheckedIcon /> : <UncheckedIcon />}
            <span>
              Task is Complete / Ready to Complete
            </span>
          </CheckboxRow>
          <CheckboxRow onClick={() => setSubscriptions((n) => ({ ...n, lease: !n.lease }))}>
            {subscriptions.lease ? <CheckedIcon /> : <UncheckedIcon />}
            <span>
              Lease is Expiring (3 days)
            </span>
          </CheckboxRow>
        </Checkboxes>
      )}
    </Wrapper>
  );
};

export default NotificationSettings;
