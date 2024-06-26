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
const sounds = {
  ambient: [
    new Sound({ src: [ `${basePath}/music/ambient1.mp3` ], html5: true, preload: false, volume: 1.0 }),
    new Sound({ src: [ `${basePath}/music/ambient2.mp3` ], html5: true, preload: false, volume: 1.0 }),
    new Sound({ src: [ `${basePath}/music/ambient3.mp3` ], html5: true, preload: false, volume: 1.0 }),
    new Sound({ src: [ `${basePath}/music/ambient4.mp3` ], html5: true, preload: false, volume: 1.0 }),
    new Sound({ src: [ `${basePath}/music/ambient5.mp3` ], html5: true, preload: false, volume: 1.0 }),
    new Sound({ src: [ `${basePath}/music/ambient6.mp3` ], html5: true, preload: false, volume: 1.0 }),
    new Sound({ src: [ `${basePath}/music/ambient7.mp3` ], html5: true, preload: false, volume: 1.0 }),
    new Sound({ src: [ `${basePath}/music/ambient8.mp3` ], html5: true, preload: false, volume: 1.0 }),
    new Sound({ src: [ `${basePath}/music/ambient9.mp3` ], html5: true, preload: false, volume: 1.0 }),
    new Sound({ src: [ `${basePath}/music/ambient10.mp3` ], html5: true, preload: false, volume: 1.0 }),
    new Sound({ src: [ `${basePath}/music/ambient11.mp3` ], html5: true, preload: false, volume: 1.0 }),
    new Sound({ src: [ `${basePath}/music/ambient12.mp3` ], html5: true, preload: false, volume: 0.5 })
  ],
  click: new Sound({ src: [ `${basePath}/sounds/click.mp3` ], html5: true, preload: false, volume: 0.25 }),
  failure: new Sound({ src: [ `${basePath}/sounds/failure.mp3` ], html5: true, preload: false, volume: 1.0 }),
  success: new Sound({ src: [ `${basePath}/sounds/success.mp3` ], html5: true, preload: false, volume: 1.0 }),
  ship: new Sound({ src: [ `${basePath}/sounds/ship-flight-loop.m4a` ], html5: true, preload: false, volume: 1.0 }),

  // Buildings
  bioreactor: new Sound({ src: [ `${basePath}/sounds/bioreactor-short.m4a` ], html5: true, preload: false, volume: 0.5 }),
  extractor: new Sound({ src: [ `${basePath}/sounds/extractor-short.m4a` ], html5: true, preload: false, volume: 0.2 }),
  factory: new Sound({ src: [ `${basePath}/sounds/factory-short.m4a` ], html5: true, preload: false, volume: 0.5 }),
  habitat: new Sound({ src: [ `${basePath}/sounds/habitat-short.m4a` ], html5: true, preload: false, volume: 0.5 }),
  marketplace: new Sound({ src: [ `${basePath}/sounds/marketplace-short.m4a` ], html5: true, preload: false, volume: 0.4 }),
  refinery: new Sound({ src: [ `${basePath}/sounds/refinery-short.m4a` ], html5: true, preload: false, volume: 0.7 }),
  shipyard: new Sound({ src: [ `${basePath}/sounds/shipyard-short.m4a` ], html5: true, preload: false, volume: 0.9 }),
  spaceport: new Sound({ src: [ `${basePath}/sounds/spaceport-short.m4a` ], html5: true, preload: false, volume: 0.4 }),
  warehouse: new Sound({ src: [ `${basePath}/sounds/warehouse-short.m4a` ], html5: true, preload: false, volume: 0.7 }),
  'buildingChatter.1': [
    new Sound({ src: [ `${basePath}/sounds/chatter/warehouse_1.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/warehouse_2.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/warehouse_3.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/warehouse_4.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/warehouse_5.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/warehouse_6.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/warehouse_7.mp3` ], html5: true, preload: false, volume: 0.8 })
  ],
  'buildingChatter.2': [
    new Sound({ src: [ `${basePath}/sounds/chatter/extractor_1.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/extractor_2.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/extractor_3.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/extractor_4.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/extractor_5.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/extractor_6.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/extractor_7.mp3` ], html5: true, preload: false, volume: 0.8 })
  ],
  'buildingChatter.3': [
    new Sound({ src: [ `${basePath}/sounds/chatter/refinery_1.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/refinery_2.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/refinery_3.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/refinery_4.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/refinery_5.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/refinery_6.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/refinery_7.mp3` ], html5: true, preload: false, volume: 0.8 })
  ],
  'buildingChatter.4': [
    new Sound({ src: [ `${basePath}/sounds/chatter/bioreactor_1.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/bioreactor_2.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/bioreactor_3.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/bioreactor_4.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/bioreactor_5.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/bioreactor_6.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/bioreactor_7.mp3` ], html5: true, preload: false, volume: 0.8 })
  ],
  'buildingChatter.5': [
    new Sound({ src: [ `${basePath}/sounds/chatter/factory_1.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/factory_2.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/factory_3.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/factory_4.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/factory_5.mp3` ], html5: true, preload: false, volume: 0.8 })
  ],
  'buildingChatter.6': [
    new Sound({ src: [ `${basePath}/sounds/chatter/shipyard_1.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/shipyard_2.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/shipyard_3.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/shipyard_4.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/shipyard_5.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/shipyard_6.mp3` ], html5: true, preload: false, volume: 0.8 })
  ],
  'buildingChatter.7': [
    new Sound({ src: [ `${basePath}/sounds/chatter/spaceport_1.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/spaceport_2.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/spaceport_3.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/spaceport_4.mp3` ], html5: true, preload: false, volume: 0.8 })
  ],
  'buildingChatter.8': [
    new Sound({ src: [ `${basePath}/sounds/chatter/marketplace_1.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/marketplace_2.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/marketplace_3.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/marketplace_4.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/marketplace_5.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/marketplace_6.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/marketplace_7.mp3` ], html5: true, preload: false, volume: 0.8 })
  ],
  'buildingChatter.9': [
    new Sound({ src: [ `${basePath}/sounds/chatter/habitat_1.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/habitat_2.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/habitat_3.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/habitat_4.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/habitat_5.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/habitat_6.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/habitat_7.mp3` ], html5: true, preload: false, volume: 0.8 }),
    new Sound({ src: [ `${basePath}/sounds/chatter/habitat_8.mp3` ], html5: true, preload: false, volume: 0.8 })
  ],
};

// If array return a random sound otherwise return the sound
const getSound = (name, { index, excludeIndex } = {}) => {
  const sound = sounds[name];
  if (!sound) throw new Error(`Sound ${name} not found`);
  if (!sound.length) return { sound, index: 0 };
  if (index) return { sound: sound[index], index };

  let indexes = Object.keys(sound);
  if (excludeIndex) indexes = indexes.splice(excludeIndex, 1);

  index = indexes[Math.floor(Math.random() * indexes.length)];
  return { sound: sound[index], index };
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
      const { sound } = getSound(toStop);
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
    if (!toPlay || !soundEnabled) return;

    try {
      const { sound } = getSound(toPlay);
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
  }, [effectsVolume, effectEnded, stopEffect, soundEnabled]);

  useEffect(() => {
    const onClick = () => {
      setSoundEnabled(true);
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

    const excludeIndex = lastTrack || null;
    const { sound: track, index } = getSound('ambient', { excludeIndex });

    let to;
    if (musicVolume === 0 || !track) {
      to = setTimeout(() => setLastTrack(index), Math.random() * 60000);
    } else {
      setCurrentTrack(track);
      to = setTimeout(() => {
        track.load();
        track.play();
        track.fade(0, track.baseVolume * musicVolume / 100, 5000);
  
        track.once('end', () => {
          track.stop();
          track.unload();
          setCurrentTrack(null);
          to = setTimeout(() => setLastTrack(index), Math.random() * 2500);
        });
      }, 5000);
    }

    return () => {
      if (to) clearTimeout(to);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ lastTrack, soundEnabled ]);

  // Adjust volume of music tracks
  useEffect(() => {
    if (!soundEnabled) return;

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
  }, [ musicVolume, currentTrack, cutscenePlaying, soundEnabled ]);

  useEffect(() => {
    if (!soundEnabled) return;

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
  }, [currentEffects, effectStarted, effectEnded, playEffect, soundEnabled, stopEffect]);

  return null;
};

export default Audio;
