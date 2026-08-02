declare module "svg-to-pdfkit" {
  import type PDFDocument from "pdfkit";
  function SVGtoPDF(
    doc: PDFDocument,
    svg: string,
    x: number,
    y: number,
    options?: Record<string, unknown>
  ): void;
  export = SVGtoPDF;
}
