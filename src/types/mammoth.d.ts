declare module 'mammoth' {
  export interface MammothResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export interface MammothOptions {
    buffer?: Buffer;
    path?: string;
    arrayBuffer?: ArrayBuffer;
    includeDefaultStyleMap?: boolean;
    styleMap?: string | string[];
  }

  export function convertToHtml(
    input: MammothOptions,
    options?: Record<string, unknown>
  ): Promise<MammothResult>;

  export function extractRawText(
    input: MammothOptions,
    options?: Record<string, unknown>
  ): Promise<MammothResult>;
}
