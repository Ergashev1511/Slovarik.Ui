export enum QuizDirection {
  UzToRu = 'UzToRu',
  RuToUz = 'RuToUz'
}

export enum QuizOrder {
  Recent = 'Recent',
  Random = 'Random'
}

export interface QuizStartRequestDto {
  userId: string;
  questionCount: number;
  direction: QuizDirection;
  selectFromEnd: boolean;
}

export interface QuizStartResponseDto {
  quizId: string;
  userId: string;
  direction: QuizDirection;
  questions: QuizQuestionDto[];
}

export interface QuizQuestionDto {
  questionId: string;
  questionNumber: number;
  totalQuestions: number;
  question: string;
  options: QuizOptionDto[];
  correctAnswerHash: string;
}

export interface QuizOptionDto {
  id: number;
  text: string;
}

export interface QuizResult {
  score: number;
  total: number;
}

export interface QuizSessionState {
  quizId: string;
  userId: string;
  direction: QuizDirection;
  questions: QuizQuestionDto[];
  currentQuestionIndex: number;
  score: number;
  answers: { questionId: string; selectedOptionId: number; correct: boolean }[];
}
