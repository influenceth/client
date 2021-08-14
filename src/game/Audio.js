import { useEffect, useState } from 'react';
import { Howl } from 'howler';

import useStore from '~/hooks/useStore';
import ambient1 from '~/assets/ambient1.mp3';
import ambient2 from '~/assets/ambient2.mp3';
import ambient3 from '~/assets/ambient3.mp3';
import click from '~/assets/click.wav';
import failure from '~/assets/failure.wav';
import success from '~/assets/success.wav';

class Sound extends Howl {
  constructor(args) {
    super(args);
    const { volume } = args;
    this._baseVolume = volume || 1.0;
  }
}

const sounds = {
  effects: {
    click: new Sound({ src: [ click ], volume: 0.25 }),
    failure: new Sound({ src: [ failure ], volume: 1.0 }),
    success: new Sound({ src: [ success ], volume: 1.0 })
  },
  music: {
    ambient1: new Sound({ src: [ ambient1 ], volume: 1.0 }),
    ambient2: new Sound({ src: [ ambient2 ], volume: 1.0 }),
    ambient3: new Sound({ src: [ ambient3 ], volume: 1.0 }),
  }
};

const Audio = (props) => {
  const toPlay = useStore(s => s.sounds.toPlay);
  const musicVolume = useStore(s => s.sounds.music);
  const effectsVolume = useStore(s => s.sounds.effects);
  const endSound = useStore(s => s.dispatchSoundPlayed);
  const [ lastTrack, setLastTrack ] = useState(null);

  // Play random ambient music with a gap between them
  useEffect(() => {
    const tracks = Object.values(sounds.music);
    let index = Math.floor(Math.random() * (tracks.length - 1));
    if (index === lastTrack) index++;
    const track = tracks[index];
    track.play();
    track.fade(0, track._baseVolume * musicVolume / 100, 5000);
    track.on('end', () => {
      setTimeout(() => setLastTrack(index), Math.random() * 60000 * 3);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ lastTrack ]);

  // Adjust volume of music tracks
  useEffect(() => {
    Object.values(sounds.music).forEach(s => s.volume(s._baseVolume * musicVolume / 100));
  }, [ musicVolume ]);

  // Adjust volume of music tracks
  useEffect(() => {
    Object.values(sounds.effects).forEach(s => s.volume(s._baseVolume * effectsVolume / 100));
  }, [ effectsVolume ]);

  // Listen for new sound request and play it
  useEffect(() => {
    if (!toPlay) return;

    try {
      const [ type, name ] = toPlay.split('.');
      sounds[type][name].play();
    } catch (e) {
      console.error(e);
    } finally {
      endSound();
    }
  }, [ toPlay, endSound ]);

  return null;
};

export default Audio;
