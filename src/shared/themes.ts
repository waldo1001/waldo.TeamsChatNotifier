export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  navBg: string;
  navText: string;
  navActiveText: string;
  navActiveBorder: string;
  text: string;
  textMuted: string;
  border: string;
  inputBg: string;
  inputBorder: string;
  accent: string;
  accentText: string;
  statusBarBg: string;
  statusBarBorder: string;
}

export interface Theme {
  label: string;
  colors: ThemeColors;
}

export const themeIds = ['midnight', 'carbon', 'nord', 'sakura'] as const;
export type ThemeId = (typeof themeIds)[number];

export const THEMES: Record<ThemeId, Theme> = {
  midnight: {
    label: 'Midnight',
    colors: {
      bg: '#121220',
      bgSecondary: '#16213e',
      navBg: '#0e0e1c',
      navText: '#7070a0',
      navActiveText: '#7ca2d4',
      navActiveBorder: '#7ca2d4',
      text: '#d0d8f0',
      textMuted: '#606080',
      border: '#1c1c38',
      inputBg: '#0a0a18',
      inputBorder: '#242448',
      accent: '#2a4a8e',
      accentText: '#e0e8ff',
      statusBarBg: '#0c0c1e',
      statusBarBorder: '#181830',
    },
  },
  carbon: {
    label: 'Carbon',
    colors: {
      bg: '#0e0e0e',
      bgSecondary: '#181818',
      navBg: '#0a0a0a',
      navText: '#666666',
      navActiveText: '#e0e0e0',
      navActiveBorder: '#e0e0e0',
      text: '#d4d4d4',
      textMuted: '#555555',
      border: '#1e1e1e',
      inputBg: '#080808',
      inputBorder: '#2a2a2a',
      accent: '#333333',
      accentText: '#f0f0f0',
      statusBarBg: '#080808',
      statusBarBorder: '#1a1a1a',
    },
  },
  nord: {
    label: 'Nord',
    colors: {
      bg: '#2e3440',
      bgSecondary: '#3b4252',
      navBg: '#272c38',
      navText: '#7b88a1',
      navActiveText: '#88c0d0',
      navActiveBorder: '#88c0d0',
      text: '#d8dee9',
      textMuted: '#616e88',
      border: '#3b4252',
      inputBg: '#242933',
      inputBorder: '#434c5e',
      accent: '#5e81ac',
      accentText: '#eceff4',
      statusBarBg: '#242933',
      statusBarBorder: '#3b4252',
    },
  },
  sakura: {
    label: 'Sakura',
    colors: {
      bg: '#1a1020',
      bgSecondary: '#221530',
      navBg: '#140c1a',
      navText: '#7a5e8a',
      navActiveText: '#d4a0c0',
      navActiveBorder: '#d4a0c0',
      text: '#e0d0e8',
      textMuted: '#665878',
      border: '#2a1838',
      inputBg: '#100a16',
      inputBorder: '#362448',
      accent: '#6e3a6e',
      accentText: '#f0e0f4',
      statusBarBg: '#12081a',
      statusBarBorder: '#241838',
    },
  },
};

export function getTheme(id: ThemeId): Theme {
  return THEMES[id] ?? THEMES.midnight;
}
