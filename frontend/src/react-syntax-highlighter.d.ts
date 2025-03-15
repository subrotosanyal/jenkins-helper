// Declare the main module
declare module 'react-syntax-highlighter' {
    import * as React from 'react';
    export interface SyntaxHighlighterProps {
      language?: string;
      style?: any;
      children?: React.ReactNode;
    }
    export class SyntaxHighlighter extends React.Component<SyntaxHighlighterProps> {}
    export const Prism: typeof SyntaxHighlighter;
  }
  
  // Declare the styles module
  declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
    const okaidia: any;
    export { okaidia };
  }
  