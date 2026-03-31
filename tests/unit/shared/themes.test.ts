import { describe, it, expect } from 'vitest';
import { THEMES, getTheme, themeIds, type ThemeId } from '@shared/themes';

describe('themes', () => {
  it('exports exactly 4 themes', () => {
    expect(themeIds).toHaveLength(4);
  });

  it('every theme has all required color keys', () => {
    const requiredKeys = [
      'bg',
      'bgSecondary',
      'navBg',
      'navText',
      'navActiveText',
      'navActiveBorder',
      'text',
      'textMuted',
      'border',
      'inputBg',
      'inputBorder',
      'accent',
      'accentText',
      'statusBarBg',
      'statusBarBorder',
    ];
    for (const id of themeIds) {
      const theme = THEMES[id];
      for (const key of requiredKeys) {
        expect(theme.colors, `${id} missing ${key}`).toHaveProperty(key);
      }
    }
  });

  it('every theme has a human-readable label', () => {
    for (const id of themeIds) {
      expect(THEMES[id].label).toBeTruthy();
      expect(typeof THEMES[id].label).toBe('string');
    }
  });

  it('getTheme returns the requested theme', () => {
    const theme = getTheme('midnight');
    expect(theme.label).toBe('Midnight');
  });

  it('getTheme falls back to midnight for unknown id', () => {
    const theme = getTheme('nonexistent' as ThemeId);
    expect(theme.label).toBe('Midnight');
  });

  it('each theme id is a valid string', () => {
    for (const id of themeIds) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it('themes include midnight, carbon, nord, and sakura', () => {
    expect(themeIds).toContain('midnight');
    expect(themeIds).toContain('carbon');
    expect(themeIds).toContain('nord');
    expect(themeIds).toContain('sakura');
  });
});
