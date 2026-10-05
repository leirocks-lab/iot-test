export interface ThemeTokens {
  readonly colors: {
    readonly background: string;
    readonly surface: string;
    readonly text: string;
    readonly mutedText: string;
    readonly primary: string;
    readonly success: string;
    readonly warning: string;
    readonly danger: string;
  };
}

export const rowanTheme: ThemeTokens = Object.freeze({
  colors: Object.freeze({
    background: '#F4F7F8',
    surface: '#FFFFFF',
    text: '#172126',
    mutedText: '#637079',
    primary: '#147A78',
    success: '#25875A',
    warning: '#B76E00',
    danger: '#C43D4B',
  }),
});
