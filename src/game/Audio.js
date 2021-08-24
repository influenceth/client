import { useEffect, useState } from 'react';
import { Howler, Howl } from 'howler';

import useStore from '~/hooks/useStore';
import ambient1 from '~/assets/sounds/ambient1.mp3';
import ambient2 from '~/assets/sounds/ambient2.mp3';
import ambient3 from '~/assets/sounds/ambient3.mp3';
import ambient4 from '~/assets/sounds/ambient4.mp3';
import click from '~/assets/sounds/click.wav';
import failure from '~/assets/sounds/failure.wav';
import success from '~/assets/sounds/success.wav';

class Sound extends Howl {
  constructor(args) {
    super(args);
    const { volume } = args;
    this._baseVolume = volume || 1.0;
  }
}

const sounds = {
  effects: {
    click: { src: [ click ], html5: true, preload: false, volume: 0.25 },
    failure: { src: [ failure ], html5: true, preload: false, volume: 1.0 },
    success: { src: [ success ], html5: true, preload: false, volume: 1.0 }
  },
  music: {
    ambient1: { src: [ ambient1 ], html5: true, preload: false, volume: 1.0 },
    ambient2: { src: [ ambient2 ], html5: true, preload: false, volume: 1.0 },
    ambient3: { src: [ ambient3 ], html5: true, preload: false, volume: 1.0 },
    ambient4: { src: [ ambient4 ], html5: true, preload: false, volume: 1.0 },
  }
};

const Audio = (props) => {
  const toPlay = useStore(s => s.sounds.toPlay);
  const musicVolume = useStore(s => s.sounds.music);
  const effectsVolume = useStore(s => s.sounds.effects);
  const endSound = useStore(s => s.dispatchSoundPlayed);
  const [ soundEnabled, setSoundEnabled ] = useState(null);
  const [ lastTrack, setLastTrack ] = useState(null);
  const [ currentTrack, setCurrentTrack ] = useState(null);

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

  // Play random ambient music with a gap between them
  useEffect(() => {
    if (!soundEnabled) return;

    const tracks = Object.values(sounds.music);
    let index = Math.floor(Math.random() * tracks.length);
    if (index === lastTrack) index++;

    if (musicVolume === 0 || !tracks[index]) {
      setTimeout(() => setLastTrack(index), Math.random() * 60000 * 3);
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
        setTimeout(() => setLastTrack(index), Math.random() * 60000 * 3);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [ lastTrack, soundEnabled ]);

  // Adjust volume of music tracks
  useEffect(() => {
    if (currentTrack) currentTrack.volume(currentTrack._baseVolume * musicVolume / 100);
  }, [ musicVolume, currentTrack ]);

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
