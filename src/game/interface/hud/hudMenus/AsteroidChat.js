import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Entity } from '@influenceth/sdk';

import Button from '~/components/ButtonAlt';
import { CrewCaptainCardFramed } from '~/components/CrewmateCardFramed';
import EntityLink from '~/components/EntityLink';
import { InputBlock } from '~/components/filters/components';
import UncontrolledTextArea, { resizeOnKeydown } from '~/components/TextAreaUncontrolled';
import useStore from '~/hooks/useStore';
import { nativeBool } from '~/lib/utils';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-bottom: 15px;
`;

const ChatsWrapper = styled.div`
  display: flex;
  flex-direction: column-reverse;
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  width: 100%;
`;

const Chats = styled.div`
  border-bottom: 1px solid #333;
  display: flex;
  flex-direction: column;
  margin-bottom: 2px;
  width: 100%;
`;

const on = 12;
const off = 3;
const Break = styled.div`
  background: repeating-linear-gradient(
    45deg,
    #333 0,
    #333 ${on}px,
    #191919 ${on + 1}px,
    #191919 ${on + off}px
  );
  bottom: -1px;
  height: 8px;
  position: relative;
  width: 100%;
  z-index: 1;
`;

const Chat = styled.div`
  color: #AAA;
  display: flex;
  flex-direction: row;
  font-size: 15px;
  padding: 10px 0;

  a {
    color: white;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
    &:after {
      content: ":";
    }
  }
  &:not(:first-child) {
    border-top: 1px solid #333;
  }

  & > div:first-child {
    flex: 0 0 60px;
  }
  & > div:last-child {
    flex: 1;
    padding-top: 2px;
  }

`;

const RemainingChars = styled.div`
  color: ${p => p.remaining < 0
    ? p.theme.colors.error
    : (p.remaining < 50 ? p.theme.colors.orange : '#777')
  };
`;

const maxChatMessageLength = 280;

const isValidChatMessage = (content) => {
  return true;
}

const fakeChats = [
  {
    asteroidId: 1,
    crewId: 1,
    content: 'Here is a message.'
  },
  {
    asteroidId: 1,
    crewId: 2,
    content: 'Here is a message.'
  },
  {
    asteroidId: 1,
    crewId: 3,
    content: 'Here is a message. And here is something else I feel like I need to say. Take it or leave it. Also, I\'m having a pretty good time here, so that\'s cool.'
  },
  {
    asteroidId: 1,
    crewId: 4,
    content: 'Here is a message.'
  },
  {
    asteroidId: 1,
    crewId: 5,
    content: 'Here is a message.'
  },
  {
    asteroidId: 1,
    crewId: 6,
    content: 'Here is a message.'
  },
  {
    asteroidId: 1,
    crewId: 6,
    content: 'Here is a message.'
  },
  {
    isConnectionBreak: true
  },
  {
    asteroidId: 1,
    crewId: 6,
    content: 'Here is a message.'
  },
  {
    asteroidId: 1,
    crewId: 6,
    content: 'Here is a message.'
  },
];

const maxChatInputHeight = 95;

const AsteroidChat = () => {
  const asteroidId = useStore(s => s.asteroids.origin);
  const chatHistory = useStore(s => fakeChats || s.chatHistory);

  const chatInputRef = useRef();
  const chatScrollRef = useRef();

  const [newChat, setNewChat] = useState();

  const scrollToBottom = useCallback(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, []);

  const handleNewChatChange = useCallback(async (e) => {
    setNewChat(e.currentTarget.value || '');
    resizeOnKeydown(maxChatInputHeight)(e);
    scrollToBottom();
  }, [scrollToBottom]);

  const submitNewChat = useCallback(async () => {
    if (isValidChatMessage(newChat)) {
      // TODO: send on websocket connection
      // send({
      //   crewId,
      //   asteroidId,
      //   body: newChat
      // });
      // TODO: if ack
      setNewChat('');
      resizeOnKeydown(maxChatInputHeight)(chatInputRef);
      scrollToBottom();
    }
  }, [newChat]);

  const remaining = useMemo(() => maxChatMessageLength - (newChat?.length || 0), [newChat?.length]);

  const asteroidChats = useMemo(
    () => (chatHistory || []).filter((c) => c.isConnectionBreak || c.asteroidId === asteroidId),
    [asteroidId, chatHistory]
  );

  useEffect(() => {
    scrollToBottom();
  }, [asteroidChats, scrollToBottom]);

  return (
    <Wrapper>
      <ChatsWrapper ref={chatScrollRef}>
        <Chats>
          {asteroidChats.map((chat, i) => {
            return chat.isConnectionBreak
              ? <Break key={i} />
              : (
                <Chat key={chat?.timestamp}>
                  <div>
                    <CrewCaptainCardFramed crewId={chat.crewId} noArrow width={50} />
                  </div>
                  <div>
                    <EntityLink id={chat.crewId} label={Entity.IDS.CREW} />
                    {' '}<span>{chat.content}</span>
                  </div>
                </Chat>
              );
          })}
        </Chats>
      </ChatsWrapper>
      <InputBlock>
        <div>
          <UncontrolledTextArea
            onChange={handleNewChatChange}
            placeholder="Add message..."
            ref={chatInputRef}
            style={{ height: 36 }}
            value={newChat} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <RemainingChars remaining={remaining}>{remaining.toLocaleString()} Remaining</RemainingChars>
          <Button
            disabled={nativeBool(!newChat || remaining < 0)}
            size="small"
            onClick={submitNewChat}>
            Send
          </Button>
        </div>
      </InputBlock>
    </Wrapper>
  );
};

export default AsteroidChat;