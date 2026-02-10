declare module 'htmldiff-js' {
  function execute(oldHtml: string, newHtml: string): string
  export default { execute }
}

declare module 'html-to-docx' {
  interface Options {
    table?: { row?: { cantSplit?: boolean } }
    footer?: boolean
    pageNumber?: boolean
    [key: string]: unknown
  }
  export default function HTMLtoDOCX(
    html: string,
    headerHtml: string | null,
    options?: Options
  ): Promise<Buffer>
}

declare module 'react-signature-canvas' {
  import React from 'react'

  interface SignatureCanvasProps {
    penColor?: string
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement> & { style?: React.CSSProperties }
    onEnd?: () => void
    onBegin?: () => void
    clearOnResize?: boolean
    backgroundColor?: string
    dotSize?: number
    minWidth?: number
    maxWidth?: number
    velocityFilterWeight?: number
  }

  class SignatureCanvas extends React.Component<SignatureCanvasProps> {
    clear(): void
    isEmpty(): boolean
    getTrimmedCanvas(): HTMLCanvasElement
    toDataURL(type?: string, encoderOptions?: number): string
    fromDataURL(dataUrl: string): void
    toData(): Array<Array<{ x: number; y: number; time: number }>>;
    fromData(data: Array<Array<{ x: number; y: number; time: number }>>): void
  }

  export default SignatureCanvas
}
