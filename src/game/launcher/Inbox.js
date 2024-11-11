import { Fragment, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import PageLoader from '~/components/PageLoader';
import useWalletInbox from '~/hooks/useWalletInbox';

import LauncherDialog from './components/LauncherDialog';
import moment from 'moment';
import useWalletCrews from '~/hooks/useWalletCrews';
import EntityLink from '~/components/EntityLink';
import formatters from '~/lib/formatters';
import AddressLink from '~/components/AddressLink';
import useStore from '~/hooks/useStore';
import Button from '~/components/ButtonAlt';
import { useQuery } from 'react-query';
import useSession from '~/hooks/useSession';
import useAccountFormatted from '~/hooks/useAccountFormatted';
import { decryptContent, generatePrivateKeyFromSeed, generateSeed, getPublicKeyFromPrivateKey } from '~/lib/encrypt';
import api from '~/lib/api';
import useUser from '~/hooks/useUser';
import ChainTransactionContext from '~/contexts/ChainTransactionContext';


const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 100%;
  overflow: hidden;
  padding: 30px 20px;
  width: 100%;
`;

const Title = styled.h3`
  border-bottom: 1px solid ${p => p.theme.colors.contentBorder};
  color: white;
  font-size: 18px;
  height: 30px;
  margin: 0 0 8px;
  padding-bottom: 8px;
  text-transform: uppercase;
`;
const Body = styled.div`
  display: flex;
  flex: 1 0 calc(100% - 30px);
  flex-direction: column;
  overflow: hidden;
`;
const RecoveryBody = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
  text-align: center;
  & > p {
    font-size: 110%;
    margin: 0 0 20px;
    opacity: 0.6;
    width: 500px;
  }
  & > button {
    display: inline-block;
    margin-top: 10px;
    width: 350px;
  }
`;
const Meta = styled.div`
  background: #222;
  display: flex;
  flex-direction: row;
  padding: 10px 10px;
  & > div:first-child {
    flex: 1;
    font-size: 16px;
    padding-right: 20px;
    & > label {
      font-weight: bold;
      &:before {
        content: "From: ";
        font-weight: normal;
      }

      & > span {
        text-decoration: none;
        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
`;
const Empty = styled(RecoveryBody)``;
const Content = styled.div`
  flex: 1;
  overflow: auto;
  padding: 20px 10px;
  white-space: pre-line;
`;

const StyledLink = styled(Link)`
  color: ${p => p.theme.colors.main};
  opacity: 0.8;
  transition: opacity 150ms ease;
  white-space: nowrap;
  &:hover {
    opacity: 1;
  }
`;

const Actions = styled.div`
  border-top: 1px solid #222;
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
`;

const Message = ({ message }) => {
  const { data: crews } = useWalletCrews(message.from);

  const dmPrivateKey = useStore(s => s.dmPrivateKey);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);

  const dismissLauncher = useCallback(() => {
    dispatchLauncherPage();
  }, []);

  const handleReply = useCallback(() => {
    // TODO: ...

    // TODO: investigate starknet.id for vanity names
    // TODO: compose dialog

    // {composing && (
    //   <DirectMessageDialog onClose={() => setComposing()} recipient={crew?.Crew?.delegatedTo} />
    // )}
  }, []);

  useEffect(() => {
    if (!message?.read) {
      // TODO: mark as read... (maybe after timeout? probably not worth waiting)
    }
  }, [message?.read]);

  const [decryptedContent, setDecryptedContent] = useState('');
  useEffect(() => {
    if (!message?.content || !dmPrivateKey) return;
    decryptContent(dmPrivateKey, message?.content)
      .then((content) => setDecryptedContent(content))
      .catch((e) => {
        console.error(e);
        setDecryptedContent();
      });
  }, [dmPrivateKey, message?.content]);

  return (
    <Wrapper>
      <Title>
        Direct Message
      </Title>
      <Body>
        <Meta>
          <div>
            <label><AddressLink address={message.from} doNotReplaceYou /></label>
            <div style={{ paddingLeft: 44, fontSize: '14px' }}>
              {crews?.map((c, i) => (
                <Fragment key={c.id}>
                  {i > 0 && ', '}
                  <StyledLink onClick={dismissLauncher} to={`/crew/${c.id}`}>{formatters.crewName(c)}</StyledLink>
                </Fragment>
              ))}
            </div>
          </div>
          <div>
            {moment(message.timestamp).format('MMM Do YYYY, h:mma')}
          </div>
        </Meta>
        <Content>
          {decryptedContent}
        </Content>
        <Actions>
          <Button onClick={handleReply}>Reply</Button>
        </Actions>
      </Body>
    </Wrapper>
  );
};

const EnableInbox = () => {
  const { chainId, walletAccount } = useSession();
  const { data: user, isLoading } = useUser();
  const { execute, getStatus } = useContext(ChainTransactionContext);

  const dispatchDmPrivateKey = useStore(s => s.dispatchDmPrivateKey);

  const getPrivateKeyFromSeed = useCallback(async (seed) => {
    const signature = await walletAccount.signMessage({
      domain: { name: 'Influence', chainId, version: '1.1.0' },
      message: { message: 'Messaging Hash', nonce: seed.substr(0, 24) },
      primaryType: 'Message',
      types: {
        Message: [
          { name: 'message', type: 'string' },
          { name: 'nonce', type: 'string' }
        ],
        StarkNetDomain: [
          { name: 'name', type: 'felt' },
          { name: 'chainId', type: 'felt' },
          { name: 'version', type: 'felt' }
        ]
      }
    });
    if (signature) {
      const signedSeed = `${seed}${BigInt(`${signature.join('')}`).toString(16)}`;
      return await generatePrivateKeyFromSeed(signedSeed);
    }
    return null;
  }, [chainId, walletAccount]);

  // TODO (later):
  // - add button to connected-inbox to change encryption key (or settings)
  //  - when this happens, unpin all messages (OR re-encrypt with new key?)
  const rekeyInbox = useCallback(async () => {
    const seed = generateSeed();
    const privateKey = await getPrivateKeyFromSeed(seed);
    if (privateKey) {
      const publicKeyBytes = getPublicKeyFromPrivateKey(privateKey);
      const publicKey = Buffer.from(publicKeyBytes).toString('hex');
      await execute('RekeyInbox', { publicKey });
      
      // TODO: if successful...
      dispatchDmPrivateKey(privateKey); // (update local private key)
      await api.updateUser({ directMessageSeed: seed }); // (update recovery seed)
    }
  }, []);

  const isRekeying = useMemo(() => {
    return getStatus('RekeyInbox') === 'pending';
  }, [getStatus]);

  const [isRecovering, setIsRecovering] = useState();
  const recoverKey = useCallback(async () => {
    setIsRecovering(true);
    const seed = await api.getInboxSeed();
    if (seed) {
      const privateKey = await getPrivateKeyFromSeed(seed);
      if (privateKey) {
        dispatchDmPrivateKey(privateKey);
      }
    }
    setIsRecovering(false);
  }, []);

  if (isLoading) return <PageLoader />;

  if (user?.directMessagePublicKey) {
    return (
      <Wrapper>
        <Title>Connect to Your Inbox</Title>
        <RecoveryBody>
          <p>
            By signing your recovery seed, you can regenerate your private key
            to gain access to your inbox.
          </p>
          <Button
            disabled={isRecovering}
            isTransaction
            loading={isRecovering}
            onClick={recoverKey}
            size="large">Login</Button>
        </RecoveryBody>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <Title>Inbox Setup</Title>
      <RecoveryBody>
        <p>
          To enable decentralized direct messaging, you must first create an encryption
          keypair for your messages.
        </p>
        <p>
          The public key will be published on-chain so that anyone sending you a message
          can encrypt the message such that it can only be decrypted by you (with the 
          private key).
        </p>
        <Button
          disabled={isRekeying}
          isTransaction
          loading={isRekeying}
          onClick={rekeyInbox}
          size="large">Enable Direct Messaging</Button>
      </RecoveryBody>
    </Wrapper>
  );
}

const EmptyInbox = () => {
  return (
    <Wrapper>
      <Title>Inbox</Title>
      <Empty><p>Your inbox is empty.</p></Empty>
    </Wrapper>
  );
};

const AccountLabel = ({ address }) => {
  const label = useAccountFormatted({ address, doNotReplaceYou: true, truncate: true });
  return label || '';
};

const InboxWrapper = () => {
  const { data: user, isLoading: userIsLoading } = useUser();
  const { messages, isLoading } = useWalletInbox();

  const dmPrivateKey = useStore(s => s.dmPrivateKey);

  const messagePanes = useMemo(() => {
    return messages?.map((m) => ({
      key: m.id,
      label: <AccountLabel address={m.from} />,
      sublabel: moment(m.timestamp).format('MMM Do YYYY, h:mma'),
      attention: !m.read,
      pane: <Message message={m} />
    }));
  }, [messages]);

  if (isLoading || userIsLoading) {
    return <PageLoader />;
  }

  if (!user?.directMessagePublicKey || !dmPrivateKey) {
    return <LauncherDialog singlePane={<EnableInbox />} />
  }

  if (messages?.length === 0) {
    return <LauncherDialog singlePane={<EmptyInbox />} />
  }

  return <LauncherDialog panes={messagePanes} />;
};

export default InboxWrapper;
