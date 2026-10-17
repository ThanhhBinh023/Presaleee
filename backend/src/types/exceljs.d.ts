declare module 'exceljs' {
  namespace ExcelJS {
    interface Fill {
      type: string;
      pattern?: string;
      fgColor?: { argb: string };
      bgColor?: { argb: string };
    }

    interface Border {
      style?: string;
      color?: { argb: string };
    }

    interface Borders {
      top?: Border;
      left?: Border;
      bottom?: Border;
      right?: Border;
    }

    interface Cell {
      value: any;
      fill?: Fill;
      font?: Record<string, any>;
      alignment?: Record<string, any>;
      border?: Partial<Borders>;
      numFmt?: string;
    }

    interface Row {
      number: number;
      height: number;
      font?: Record<string, any>;
      getCell(indexOrKey: number | string): Cell;
      eachCell(callback: (cell: Cell, colNumber: number) => void): void;
      eachCell(opt: { includeEmpty?: boolean }, callback: (cell: Cell, colNumber: number) => void): void;
    }

    interface Column {
      width?: number;
      eachCell?(opt: { includeEmpty?: boolean }, callback: (cell: Cell, rowNumber: number) => void): void;
    }

    interface Worksheet {
      views: Array<Record<string, any>>;
      columns: Column[];
      lastRow?: Row;
      addRow(values: any[]): Row;
      mergeCells(range: string): void;
    }

    class Workbook {
      creator: string;
      lastModifiedBy: string;
      created: Date;
      modified: Date;
      xlsx: {
        writeBuffer(): Promise<ArrayBuffer>;
      };
      addWorksheet(name: string): Worksheet;
    }
  }

  export = ExcelJS;
}
