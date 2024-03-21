import { useCallback, useEffect, useRef, useState } from 'react';
import { Howler, Howl } from 'howler';

import useStore from '~/hooks/useStore';

class Sound extends Howl {
  constructor(args) {
    super(args);
    const { volume } = args;
    this._baseVolume = volume || 1.0;
  }

  get baseVolume() {
    return this._baseVolume;
  }
}

const basePath = process.env.REACT_APP_CLOUDFRONT_OTHER_URL;
const effects = {
  click: new Sound({ src: [ `${basePath}/sounds/click.mp3` ], html5: true, preload: false, volume: 0.25 }),
  failure: new Sound({ src: [ `${basePath}/sounds/failure.mp3` ], html5: true, preload: false, volume: 1.0 }),
  success: new Sound({ src: [ `${basePath}/sounds/success.mp3` ], html5: true, preload: false, volume: 1.0 }),
  ship: new Sound({ src: [ `${basePath}/sounds/ship-flight-loop.m4a` ], html5: true, preload: false, volume: 0.5 }),
  habitat: new Sound({ src: [ `${basePath}/sounds/habitat-short.m4a` ], html5: true, preload: false, volume: 0.5 }),
  factory: new Sound({ src: [ `${basePath}/sounds/factory-short.m4a` ], html5: true, preload: false, volume: 0.5 }),
  marketplace: new Sound({ src: [ `${basePath}/sounds/marketplace-short.m4a` ], html5: true, preload: false, volume: 0.5 }),
  extractor: new Sound({ src: [ `${basePath}/sounds/extractor-short.m4a` ], html5: true, preload: false, volume: 0.4 }),
  bioreactor: new Sound({ src: [ `${basePath}/sounds/bioreactor-short.m4a` ], html5: true, preload: false, volume: 0.5 }),
  spaceport: new Sound({ src: [ `${basePath}/sounds/spaceport-short.m4a` ], html5: true, preload: false, volume: 0.4 }),
  shipyard: new Sound({ src: [ `${basePath}/sounds/shipyard-short.m4a` ], html5: true, preload: false, volume: 0.8 }),
  warehouse: new Sound({ src: [ `${basePath}/sounds/warehouse-short.m4a` ], html5: true, preload: false, volume: 0.7 }),
  refinery: new Sound({ src: [ `${basePath}/sounds/refinery-short.m4a` ], html5: true, preload: false, volume: 0.5 })
};

const music = {
  ambient1: new Sound({ src: [ `${basePath}/music/ambient1.mp3` ], html5: true, preload: false, volume: 1.0 }),
  ambient2: new Sound({ src: [ `${basePath}/music/ambient2.mp3` ], html5: true, preload: false, volume: 1.0 }),
  ambient3: new Sound({ src: [ `${basePath}/music/ambient3.mp3` ], html5: true, preload: false, volume: 1.0 }),
  ambient4: new Sound({ src: [ `${basePath}/music/ambient4.mp3` ], html5: true, preload: false, volume: 1.0 }),
  ambient5: new Sound({ src: [ `${basePath}/music/ambient5.mp3` ], html5: true, preload: false, volume: 1.0 }),
  ambient6: new Sound({ src: [ `${basePath}/music/ambient6.mp3` ], html5: true, preload: false, volume: 1.0 }),
  ambient7: new Sound({ src: [ `${basePath}/music/ambient7.mp3` ], html5: true, preload: false, volume: 1.0 }),
  ambient8: new Sound({ src: [ `${basePath}/music/ambient8.mp3` ], html5: true, preload: false, volume: 1.0 }),
  ambient9: new Sound({ src: [ `${basePath}/music/ambient9.mp3` ], html5: true, preload: false, volume: 1.0 }),
  ambient10: new Sound({ src: [ `${basePath}/music/ambient10.mp3` ], html5: true, preload: false, volume: 1.0 }),
  ambient11: new Sound({ src: [ `${basePath}/music/ambient11.mp3` ], html5: true, preload: false, volume: 1.0 }),
  ambient12: new Sound({ src: [ `${basePath}/music/ambient12.mp3` ], html5: true, preload: false, volume: 0.5 }),
};

const Audio = () => {
  const currentEffects = useStore(s => s.effects);
  const musicVolume = useStore(s => s.sounds.music);
  const effectsVolume = useStore(s => s.sounds.effects);
  const cutscenePlaying = !!useStore(s => s.cutscene);

  const effectStarted = useStore(s => s.dispatchEffectStarted);
  const effectEnded = useStore(s => s.dispatchEffectStopped);

  const [ soundEnabled, setSoundEnabled ] = useState(null);
  const [ lastTrack, setLastTrack ] = useState(null);
  const [ currentTrack, setCurrentTrack ] = useState(null);

  const cutsceneWasPlaying = useRef();

  const stopEffect = useCallback((toStop, { fadeOut }) => {
    if (!toStop) return;

    try {
      const sound = effects[toStop];
      if (sound.state() !== 'loaded' || !sound.playing()) return;
      sound.off();
      const volume = sound.volume();

      if (fadeOut) {
        sound.fade(volume, 0, fadeOut);
        sound.once('fade', (e) => sound.stop());
      } else {
        sound.stop();
      }
    } catch (e) {
      console.error(e);
    }
  }, [effectsVolume, effectEnded]);

  const playEffect = useCallback((toPlay, { loop, duration }) => {
    if (!toPlay) return;

    try {
      const sound = effects[toPlay];
      if (sound.state() !== 'loaded') sound.load();
      sound.off();
      sound.stop();
      sound.volume(sound.baseVolume * effectsVolume / 100);

      sound.loop(loop);
      sound.play();

      if (duration) setTimeout(() => stopEffect(toPlay, { fadeOut: 1000 }), duration);

      sound.once('end', () => {
        sound.stop();
        effectEnded(toPlay);
      });
    } catch (e) {
      console.error(e);
    }
  }, [effectsVolume, effectEnded, stopEffect]);

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

    const tracks = Object.values(music);
    let index = Math.floor(Math.random() * tracks.length);
    if (index === lastTrack) index++;

    let to;
    if (musicVolume === 0 || !tracks[index]) {
      to = setTimeout(() => setLastTrack(index), Math.random() * 60000);
    } else {
      const track = tracks[index];
      setCurrentTrack(track);
      track.load();
      track.play();
      track.fade(0, track.baseVolume * musicVolume / 100, 5000);

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
      const targetVolume = currentTrack.baseVolume * musicVolume / 100;
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

  useEffect(() => {
    Object.entries(currentEffects).forEach(([ sound, settings ]) => {
      if (settings.status === 'play') {
        playEffect(sound, settings);
        effectStarted(sound);
      }

      if (settings.status === 'stop') {
        stopEffect(sound, settings);
        effectEnded(sound);
      }
    });
  }, [currentEffects, effectStarted, effectEnded, playEffect, stopEffect]);

  return null;
};

export default Audio;
