import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import Loader from 'react-spinners/PuffLoader';

import { ChevronDoubleRightIcon, InfluenceIcon, PlayIcon } from '~/components/Icons';
import LauncherDialog from './components/LauncherDialog';
import ClipCorner from '~/components/ClipCorner';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 20px 20px 0;
`;
const PlaylistTitle = styled.div`
  border-bottom: 1px solid #222;
  color: #888;
  padding: 5px 0 15px;
  text-align: center;
  text-transform: uppercase;
`;
const PlaylistWrapperOuter = styled.div`
  flex: 1;
  overflow: hidden auto;
  padding: 25px 5px;
`;
const PlaylistWrapper = styled.div`
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  width: 100%;
`;
const VideoWrapper = styled.div`
  width: 100%;
`;
const VideoThumbnail = styled.div`
  background: url(${p => p.src});
  background-position: left center;
  background-size: cover;
  border: 1px solid ${p => p.theme.colors.darkMain};
  cursor: ${p => p.theme.cursors.active};
  padding-top: 56.25%;
  position: relative;
  width: 100%;
  transition: border-color 150ms ease;
  & > div {
    align-items: center;
    background: rgba(${p => p.theme.colors.mainRGB}, 0.15);
    bottom: 0;
    display: flex;
    left: 0;
    justify-content: center;
    opacity: 0;
    position: absolute;
    right: 0;
    top: 0;
    transition: opacity 150ms ease;
    & > div {
      align-items: center;
      background: ${p => p.theme.colors.main};
      border-radius: 60px;
      color: white;
      font-size: 40px;
      display: flex;
      height: 60px;
      justify-content: center;
      width: 60px;
    }
  }
  &:hover {
    border-color: ${p => p.theme.colors.main};
    & > div {
      opacity: 1;
    }
  }
`;
const VideoInfo = styled.div`
  padding: 5px 0 10px;
  & > label {
    color: white;
    cursor: ${p => p.theme.cursors.active};
    display: block;
    margin: 10px 0;
    &:hover {
      text-decoration: underline;
    }
  }
  & > div {
    color: #888;
    display: block;
    font-size: 13px;
    & > span {
      color: #AAA;
      cursor: ${p => p.theme.cursors.active};
      opacity: 0.8;
      text-decoration: underline;
      transition: opacity 150ms ease;
      &:hover {
        opacity: 1;
      }
    }
  }
`;

const LoadingWrapper = styled.div`
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: center;
  width: 100%;
`;

const ErrorWrapper = styled(LoadingWrapper)``;

const supportMenuCornerSize = 18;
const SupportWrapper = styled.div`
  background: rgba(${p => p.theme.colors.mainRGB}, 0.1);
  border: 1px solid ${p => p.theme.colors.darkMain};
  ${p => p.theme.clipCorner(supportMenuCornerSize)};
  cursor: ${p => p.theme.cursors.active};
  margin: 0 16px;
  padding: 8px 8px 0;
  position: relative;
  transition: background 150ms ease, border-color 150ms ease;

  & > h3 {
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: row;
    font-size: 14px;
    justify-content: space-between;
    margin: 0;
    padding: 2px 0 10px;
    text-transform: uppercase;
    width: 100%;
    & > svg {
      color: ${p => p.theme.colors.main};
      font-size: 10px;
    }
  }
  & > div {
    align-items: center;
    display: flex;
    flex-direction: row;
    padding: 20px 0 24px;
    & > span {
      align-items: center;
      background: black;
      border-radius: 60px;
      display: flex;
      flex: 0 0 60px;
      height: 60px;
      justify-content: center;
      & > svg {
        height: 50px;
        width: 50px;
      }
    }
    & > div {
      color: #AAA;
      font-size: 12px;
      padding-left: 10px;
      b {
        color: white;
        font-weight: normal;
      }
    }
  }

  & > svg:last-child {
    transition: color 150ms ease;
    color: ${p => p.theme.colors.darkMain};
  }

  &:hover {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.25);
    border-color: ${p => p.theme.colors.main};
    & > svg:last-child {
      color: ${p => p.theme.colors.main};
    }
  }
`;

const SupportMenu = () => {
  const goToDiscord = useCallback(() => {
    window.open(process.env.REACT_APP_HELP_URL);
  }, []);
  return (
    <SupportWrapper onClick={goToDiscord}>
      <h3>
        <label>Support in Discord</label>
        <ChevronDoubleRightIcon />
      </h3>
      <div>
        <span><InfluenceIcon /></span>
        <div>
          Have a question, encounter an issue, or require specific support?
          Enquire in the game's <b>Official Discord Server</b>.
        </div>
      </div>
      <ClipCorner dimension={supportMenuCornerSize} />
    </SupportWrapper>
  );
};

const YoutubeFeed = ({ playlistId, title }) => {
  const [comingSoon, setComingSoon] = useState();
  const [error, setError] = useState();
  const [loading, setLoading] = useState();
  const [videos, setVideos] = useState();

  useEffect(() => {
    if (playlistId) {
      setLoading(true);
      try {
        fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${process.env.REACT_APP_GOOGLE_API_KEY}`).then(async (response) => {
          const data = await response.json();
          setVideos(data.items);
          setLoading(false);
        });
      } catch (e) {
        console.error('Error fetching playlist videos:', e);
        setError(true);
        setLoading(false);
      }
    } else {
      setComingSoon(true);
    }
  }, [playlistId]);

  const onClickOwner = useCallback((v) => {
    if (v.snippet?.videoOwnerChannelId) {
      window.open(`https://www.youtube.com/channel/${v.snippet?.videoOwnerChannelId}`);
    }
  }, []);

  const onClickVideo = useCallback((v) => {
    if (v.snippet?.resourceId?.videoId) {
      window.open(`http://youtube.com/watch?v=${v.snippet?.resourceId?.videoId}&list=${playlistId}`)
    }
  }, [playlistId]);

  return (
    <Wrapper>
      <PlaylistTitle>{title}</PlaylistTitle>
      <PlaylistWrapperOuter>
        {comingSoon && <ErrorWrapper>Coming soon.</ErrorWrapper>}
        {error && !loading && <ErrorWrapper>Something went wrong. Please try again.</ErrorWrapper>}
        {!error && loading && <LoadingWrapper><Loader color="white" size="60px" /></LoadingWrapper>}
        {!error && !loading && (
          <PlaylistWrapper>
            {(videos || []).map((v) => (
              <VideoWrapper key={v.id} onClick={() => onClickVideo(v)}>
                <VideoThumbnail src={v.snippet.thumbnails?.medium?.url}>
                  <div><div><PlayIcon /></div></div>
                </VideoThumbnail>
                <VideoInfo>
                  <label onClick={() => onClickVideo(v)}>{(v.snippet?.title || '').replace(' - Official Guide', '')}</label>
                  <div>by <span onClick={() => onClickOwner(v)}>{v.snippet?.videoOwnerChannelTitle}</span></div>
                </VideoInfo>
              </VideoWrapper>
            ))}
          </PlaylistWrapper>
        )}
      </PlaylistWrapperOuter>
    </Wrapper>
  );
};

const panes = [
  {
    label: 'Tutorials',
    pane: <YoutubeFeed title="Official Tutorial Videos" playlistId="PLEu_4bnIEcK7dt9r_JHReo8n2JdLPpby_" />
  },
  {
    label: 'Community Content',
    pane: <YoutubeFeed title="Unofficial Tutorial Videos" />
  },
  {
    label: 'Non-English Content',
    pane: <YoutubeFeed title="Unofficial Tutorial Videos (Non-English)" />
  },
  {
    label: 'Game Wiki',
    link: 'https://wiki.influenceth.io/'
  }
];

const Help = () => (
  <LauncherDialog
    bottomLeftMenu={<SupportMenu />}
    panes={panes} />
);

export default Help;