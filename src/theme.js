import cursor from '~/assets/images/cursor.png';
import cursorActive from '~/assets/images/cursor-active.png';

const gray = '#bbbbbb';
const teal = '#69ebf4';
const blue = '#4f90ff';
const purple = '#884fff';
const orange = '#ff984f';
const yellow = '#ffd94f';
const red = '#df4300';

const theme = {
  colors: {
    main: '#36a7cd',
    mainRGB: '0, 191, 255', // NOTE: this should be rgb of `main`
    mainBorder: 'rgba(255, 255, 255, 0.25)',
    mobileBackground: '#181818',
    contentBorder: '#666666',
    contentBackdrop: 'rgba(0, 0, 0, 0.5)',
    contentHighlight: 'rgba(40, 40, 40, 0.5)',
    contentDark: 'rgb(40, 40, 40)',
    mainText: '#cccccc',
    secondaryText: '#999999',
    disabledText: '#666666',
    success: '#54de94',
    successRGB: '84, 222, 148', // NOTE: this should be rgb of `success`
    error: red,
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
    classes: {
      Pilot: purple,
      Engineer: red,
      Miner: orange,
      Merchant: yellow,
      Scientist: blue
    }
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
  }
};

export default theme;
