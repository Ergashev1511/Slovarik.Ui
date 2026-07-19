export interface WordDto {
  id: string;
  wordUz: string;
  wordRu: string;
  createdAt: string;
}

export interface WordPairDto {
  wordUz: string;
  wordRu: string;
}

export interface UploadResultDto {
  success: boolean;
  message: string;
  words: WordPairDto[];
}
