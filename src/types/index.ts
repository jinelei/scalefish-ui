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
}

export interface CategoryResponse {
  id: number;
  name: string;
  sortOrder: number;
  children: CategoryResponse[];
}

export interface CategoryBrief {
  id: number;
  name: string;
}

export interface TagRequest {
  name: string;
}

export interface TagResponse {
  id: number;
  name: string;
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
  page?: number;
  size?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserInfo;
}

export interface RegistrationStatus {
  allowRegistration: boolean;
}

export interface UserInfo {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
}

export interface CreateApiTokenRequest {
  name: string;
  expiresIn?: string;
}

export interface ApiTokenResponse {
  id: number;
  name: string;
  token?: string;
  tokenPrefix: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CalendarResponse {
  id: number;
  name: string;
  description: string | null;
  displayColor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventRequest {
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  rrule?: string;
  status?: string;
  priority?: number;
  categories?: string;
  url?: string;
}

export interface CalendarEventResponse {
  id: number;
  calendarId: number;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  rrule: string | null;
  status: string;
  priority: number;
  categories: string | null;
  url: string | null;
  sequence: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddressBookResponse {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactRequest {
  name: string;
  email?: string;
  phone?: string;
  organization?: string;
  notes?: string;
}

export interface ContactResponse {
  id: number;
  addressBookId: number;
  name: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
