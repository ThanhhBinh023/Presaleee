export interface IEmbeddingGateway {
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  getDimension(): number;
}

