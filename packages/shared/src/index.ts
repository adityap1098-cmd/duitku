// Types
export type {
  User,
  UserProfile,
  UserTier,
  AuthTokenPayload,
  AuthTokens,
  CreateUserInput,
} from './types/user';

export type {
  ApiResponse,
  ApiError,
  PaginationMeta,
  PaginatedResponse,
  ApiResult,
} from './types/api';

export type {
  TransactionType,
  TransactionSource,
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilter,
  TransactionSummary,
} from './types/transaction';

export type {
  SyncStatus,
  SyncLog,
  SyncTriggerResponse,
  EmailInput,
  ParsedTransaction,
} from './types/sync';

export type {
  BudgetPeriod,
  Budget,
  CreateBudgetInput,
  UpdateBudgetInput,
  BudgetWithSpending,
  BudgetStatus,
} from './types/budget';

export type {
  CategoryBreakdown,
  SpendingTrend,
  CategoryChange,
  MonthComparison,
  RecurringCandidate,
  RecurringTransaction,
  ConfirmRecurringInput,
} from './types/insights';

// Constants
export type { CategoryHint, Category } from './constants/categories';
export { DEFAULT_CATEGORIES } from './constants/categories';
