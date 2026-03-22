declare module "jszip" {
  class JSZip {
    file(name: string, data: Blob | string | ArrayBuffer | Uint8Array): this;
    generateAsync(options: {
      type: "blob" | "arraybuffer" | "string";
    }): Promise<Blob>;
  }
  export default JSZip;
}

declare module "pdf-lib" {
  export class PDFDocument {
    static create(): Promise<PDFDocument>;
    static load(data: ArrayBuffer | Uint8Array): Promise<PDFDocument>;
    addPage(size?: [number, number] | PDFPage): PDFPage;
    getPage(index: number): PDFPage;
    getPageCount(): number;
    getPageIndices(): number[];
    copyPages(src: PDFDocument, indices: number[]): Promise<PDFPage[]>;
    save(options?: { useObjectStreams?: boolean }): Promise<Uint8Array>;
    embedPng(bytes: Uint8Array): Promise<PDFImage>;
    embedJpg(bytes: Uint8Array): Promise<PDFImage>;
  }
  export interface PDFPage {
    drawImage(
      image: PDFImage,
      options: { x: number; y: number; width: number; height: number },
    ): void;
    getRotation(): { angle: number };
    setRotation(rotation: { type: string; angle: number }): void;
  }
  export interface PDFImage {
    width: number;
    height: number;
  }
  export function degrees(angle: number): { type: string; angle: number };
}

declare module "pdfjs-dist" {
  export const version: string;
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(source: { data: ArrayBuffer }): {
    promise: Promise<PDFDocumentProxy>;
  };
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }
  export interface PDFPageProxy {
    getViewport(options: { scale: number }): PDFPageViewport;
    render(options: {
      canvasContext: CanvasRenderingContext2D;
      viewport: PDFPageViewport;
      canvas?: HTMLCanvasElement;
    }): { promise: Promise<void> };
  }
  export interface PDFPageViewport {
    width: number;
    height: number;
  }
}
