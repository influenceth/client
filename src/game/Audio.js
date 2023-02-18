import { useEffect, useRef, useState } from 'react';
import { Howler, Howl } from 'howler';

import useStore from '~/hooks/useStore';

class Sound extends Howl {
  constructor(args) {
    super(args);
    const { volume } = args;
    this._baseVolume = volume || 1.0;
  }
}

const basePath = process.env.REACT_APP_CLOUDFRONT_OTHER_URL;
const sounds = {
  effects: {
    click: { src: [ `${basePath}/sounds/click.mp3` ], html5: true, preload: false, volume: 0.25 },
    failure: { src: [ `${basePath}/sounds/failure.mp3` ], html5: true, preload: false, volume: 1.0 },
    success: { src: [ `${basePath}/sounds/success.mp3` ], html5: true, preload: false, volume: 1.0 }
  },
  music: {
    ambient1: { src: [ `${basePath}/music/ambient1.mp3` ], html5: true, preload: false, volume: 1.0 },
    ambient2: { src: [ `${basePath}/music/ambient2.mp3` ], html5: true, preload: false, volume: 1.0 },
    ambient3: { src: [ `${basePath}/music/ambient3.mp3` ], html5: true, preload: false, volume: 1.0 },
    ambient4: { src: [ `${basePath}/music/ambient4.mp3` ], html5: true, preload: false, volume: 1.0 },
    ambient5: { src: [ `${basePath}/music/ambient5.mp3` ], html5: true, preload: false, volume: 1.0 },
    ambient6: { src: [ `${basePath}/music/ambient6.mp3` ], html5: true, preload: false, volume: 1.0 },
    ambient7: { src: [ `${basePath}/music/ambient7.mp3` ], html5: true, preload: false, volume: 1.0 },
    ambient8: { src: [ `${basePath}/music/ambient8.mp3` ], html5: true, preload: false, volume: 1.0 },
    ambient9: { src: [ `${basePath}/music/ambient9.mp3` ], html5: true, preload: false, volume: 1.0 },
    ambient10: { src: [ `${basePath}/music/ambient10.mp3` ], html5: true, preload: false, volume: 1.0 },
    ambient11: { src: [ `${basePath}/music/ambient11.mp3` ], html5: true, preload: false, volume: 1.0 },
    ambient12: { src: [ `${basePath}/music/ambient12.mp3` ], html5: true, preload: false, volume: 0.5 }
  }
};

const Audio = (props) => {
  const toPlay = useStore(s => s.sounds.toPlay);
  const musicVolume = useStore(s => s.sounds.music);
  const effectsVolume = useStore(s => s.sounds.effects);
  const cutscenePlaying = !!useStore(s => s.cutscene);
  const endSound = useStore(s => s.dispatchSoundPlayed);

  const [ soundEnabled, setSoundEnabled ] = useState(null);
  const [ lastTrack, setLastTrack ] = useState(null);
  const [ currentTrack, setCurrentTrack ] = useState(null);

  const cutsceneWasPlaying = useRef();

  useEffect(() => {
    const onClick = () => {
      setTimeout(() => setSoundEnabled(true), 5000);
      document.body.removeEventListener('click', onClick);
    };

    document.body.addEventListener('click', onClick);

    return () => {
      Howler.unload();
      document.body.removeEventListener('click', onClick);
    };
  }, []);

  // Play random ambient music
  useEffect(() => {
    if (!soundEnabled) return;

    const tracks = Object.values(sounds.music);
    let index = Math.floor(Math.random() * tracks.length);
    if (index === lastTrack) index++;

    let to;
    if (musicVolume === 0 || !tracks[index]) {
      to = setTimeout(() => setLastTrack(index), Math.random() * 60000);
    } else {
      const track = new Sound(tracks[index]);
      setCurrentTrack(track);
      track.load();
      track.volume(tracks[index].volume * musicVolume / 100);
      track.play();
      track.fade(0, track._baseVolume * musicVolume / 100, 5000);
      track.once('end', () => {
        track.stop();
        track.unload();
        setCurrentTrack(null);
        to = setTimeout(() => setLastTrack(index), Math.random() * 2500);
      });
    }

    return () => {
      if (to) clearTimeout(to);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ lastTrack, soundEnabled ]);

  // Adjust volume of music tracks
  useEffect(() => {
    let to;
    if (currentTrack) {
      const targetVolume = currentTrack._baseVolume * musicVolume / 100;
      if (cutscenePlaying) {
        currentTrack.volume(0);
        cutsceneWasPlaying.current = true;
      }
      else if (cutsceneWasPlaying.current) {
        currentTrack.volume(0);
        to = setTimeout(() => {
          currentTrack.fade(0, targetVolume, 5000);
        }, 10000);
        cutsceneWasPlaying.current = false;
      }
      else {
        currentTrack.volume(targetVolume);
      }
    }

    return () => {
      if (to) clearTimeout(to);
    }
  }, [ musicVolume, currentTrack, cutscenePlaying ]);

  // Listen for new sound request and play it
  useEffect(() => {
    if (!toPlay) return;

    try {
      const [ type, name ] = toPlay.split('.');
      const sound = new Sound(sounds[type][name]);
      sound.load();
      sound.volume(sounds[type][name].volume * effectsVolume / 100);
      sound.play();
      sound.once('end', () => {
        sound.stop();
        sound.unload();
      });
    } catch (e) {
      console.error(e);
    } finally {
      endSound();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ toPlay, endSound ]);

  return null;
};

export default Audio;
