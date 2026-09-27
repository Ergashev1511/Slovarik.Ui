export interface WordDto {
  id: string;
  wordUz: string;
  wordRu: string;
  createdAt: string;
}

export interface BatchWordDto {
  wordUz: string;
  wordRu: string;
}

export interface BatchInsertRequestDto {
  userId: string;
  categoryId: string | null;
  words: BatchWordDto[];
}

export interface BatchInsertResultDto {
  success: boolean;
  message: string;
  count: number;
}

export interface JsonEditorContent {
  words: BatchWordDto[];
}

// Legacy: AI-based upload DTOs — kept for future reactivation
// export interface WordPairDto {
//   wordUz: string;
//   wordRu: string;
// }
// export interface UploadResultDto {
//   success: boolean;
//   message: string;
//   words: WordPairDto[];
// }
