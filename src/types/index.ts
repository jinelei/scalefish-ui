export interface GenericResult<T> {
  code: number;
  message: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  totalDistinctCategories?: number;
  totalDistinctTags?: number;
}

export interface BatchBookmarkRequest {
  ids: number[]
  categoryId?: number | null
  clearCategory?: boolean
  addTagIds?: number[]
  removeTagIds?: number[]
}

export interface BookmarkRequest {
  title: string;
  url: string;
  description?: string;
  categoryId?: number;
  tagIds?: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BookmarkResponse {
  id: number;
  title: string;
  url: string;
  description: string | null;
  faviconUrl: string | null;
  pinned: boolean;
  archived: boolean;
  clickCount: number;
  category: CategoryBrief | null;
  tags: TagResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRequest {
  name: string;
  parentId?: number;
  sortOrder?: number;
  color?: string;
}

export interface CategoryResponse {
  id: number;
  name: string;
  sortOrder: number;
  color?: string | null;
  children: CategoryResponse[];
}

export interface CategoryBrief {
  id: number;
  name: string;
  color?: string | null;
}

export interface TagRequest {
  name: string;
}

export interface TagResponse {
  id: number;
  name: string;
  source?: string;
}

export interface TagStatsResponse {
  id: number;
  name: string;
  count: number;
}

export interface CategoryStatsResponse {
  id: number;
  name: string;
  count: number;
}

export interface BookmarkSearchParams {
  keyword?: string;
  categoryIds?: number[];
  tagIds?: number[];
  pinned?: boolean;
  archived?: boolean;
  page?: number;
  size?: number;
}

export interface ArchiveBookmarkRequest {
  ids?: number[];
  categoryIds?: number[];
  tagIds?: number[];
  archived: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserInfo;
  totpRequired?: boolean;
  totpToken?: string;
}

export interface RegistrationStatus {
  allowRegistration: boolean;
}

export type UserRole = 'ROLE_ADMIN' | 'ROLE_USER'

export interface UserInfo {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  totpEnabled?: boolean;
  role?: UserRole | string;
  enabled?: boolean;
}

export interface AdminUserResponse {
  id: number
  username: string
  name: string | null
  email: string | null
  role: string
  enabled: boolean
  totpEnabled: boolean
  createdAt: string | null
  lastLoginAt: string | null
}

export interface CreateUserRequest {
  username: string
  password: string
  name?: string
  email?: string
  role?: string
}

export interface UpdateUserRequest {
  username: string
  name?: string
  email?: string
  role: string
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface CalendarEvent {
  uid: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: string;
  end: string;
  allDay: boolean;
}

export interface MomentRequest {
  content: string;
  contentType?: string;
  terminalType?: string;
  isLocked?: boolean;
  displayContent?: string;
}

export interface MomentResponse {
  id: number;
  content: string;
  contentType: string;
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  terminalType: string;
  isLocked: boolean;
  displayContent: string | null;
  createdAt: string;
  updatedAt: string;
}


