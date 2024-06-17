import cursor from '~/assets/images/cursor.png';
import cursorActive from '~/assets/images/cursor-active.png';

export const hexToRGB = (hex) => {
  try {
    const hexParts = hex.toLowerCase().replace(/[^a-z0-9]/g, '').match(/.{1,2}/g);
    return [
      parseInt(hexParts[0], 16),
      parseInt(hexParts[1], 16),
      parseInt(hexParts[2], 16)
    ].join(',');
  } catch (e) {
    console.error(e);
    return '255,0,0';
  }
};

export const getContrastText = (rgb) => {
  if (typeof rgb === 'string') rgb = hexToRGB(rgb);
  rgb = rgb.split(',');
  return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000 > 125 ? 'black' : 'white';
}

export const clipCorner = (size) => `
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - ${size}px),
    calc(100% - ${size}px) 100%,
    0 100%
  );
`;

export const clipCornerLeft = (size) => `
  clip-path: polygon(
    0 0,
    100% 0,
    100% 100%,
    calc(${size}px) 100%,
    0 calc(100% - ${size}px)
  );
`;

const main = '#36a7cd';
const brightMain = '#57d5ff';
const darkMain = '#1c5063';
const success = '#00fff0';

const green = '#88e675';
const darkGreen = '#59b366';
const gray = '#bbbbbb';
const teal = '#69ebf4';
const blue = '#4f90ff';
const lightPurple = '#8181ff';
const purple = '#884fff';
const lightOrange = '#faaf42';
const orange = '#ff984f';
const yellow = '#ffd94f';
const red = '#ff564d';
const darkRed = '#ee4036';

const theme = {
  colors: {
    main,
    mainRGB: hexToRGB(main),
    brightMain,
    brightMainRGB: hexToRGB(brightMain),
    darkMain,
    darkMainRGB: hexToRGB(darkMain),
    backgroundMain: '#0e2933',

    badge: '#287d97',
    mobileBackground: '#181818',
    disabledBackground: '#666666',
    inputBackground: '#0d2933',
    contentBackdrop: 'rgba(0, 0, 0, 0.5)',
    contentHighlight: 'rgba(40, 40, 40, 0.5)',
    contentDark: 'rgb(40, 40, 40)',
    hudMenuBackground: 'rgba(15, 15, 15, 0.85)',

    mainBorder: 'rgba(255, 255, 255, 0.25)',
    contentBorder: '#666666',
    borderBottom: '#555555',
    borderBottomAlt: 'rgba(85, 85, 85, 0.5)',

    mainText: '#cccccc',
    secondaryText: '#a0a0a0',
    disabledText: 'rgba(255,255,255,0.4)',

    success,
    successRGB: hexToRGB(success),
    inFlight: lightOrange,
    sell: '#57d5ff',
    buy: '#88e675',
    sequence: '#2f85dc',
    sequenceLight: '#98c4ec',
    sequenceDark: '#1e558c',
    
    warning: orange,
    error: red,
    expired: red,

    teal, 
    blue, 

    yellow, 
    backgroundYellow: '#80592c',

    purple,
    lightPurple,  
    backgroundPurple: '#10103d',

    red, 
    darkRed, 
    backgroundRed: '#471411',

    orange, 
    lightOrange, 
    backgroundOrange: '#853217',

    green, 
    darkGreen,
    backgroundGreen: '#002624',

    bonus: {
      level0: '#999999',
      level1: 'rgb(105, 235, 244)',
      level2: 'rgb(79, 144, 255)',
      level3: 'rgb(136, 79, 255)'
    },
    rarity: {
      Common: gray,
      Uncommon: teal,
      Rare: blue,
      Superior: purple,
      Exceptional: orange,
      Incomparable: yellow
    },
    depositSize: '#a97c4f',
    resources: {
      Fissile: '#8a1aff',
      Metal: '#f8852c',
      Organic: '#68d346',
      RareEarth: '#f63637',
      Volatile: '#5bc0f5',
    },
    classes: {
      Pilot: purple,
      Engineer: red,
      Miner: orange,
      Merchant: yellow,
      Scientist: blue,
      rgb: {
        Pilot: hexToRGB(purple),
        Engineer: hexToRGB(red),
        Miner: hexToRGB(orange),
        Merchant: hexToRGB(yellow),
        Scientist: hexToRGB(blue),
      }
    },
    disabledButton: '#676767',
    txButton: '#6c6adc',
  },
  fontSizes: {
    smallText: '12px',
    mainText: '14px',
    detailText: '16px',
    featureText: '20px'
  },
  cursors: {
    default: `url(${cursor}) 5 5, auto`,
    active: `url(${cursorActive}) 5 5, auto`
  },
  breakpoints: {
    mobile: 1023,
    xl: 1599
  },
  clipCorner,
  clipCornerLeft,
  hexToRGB
};

export default theme;
