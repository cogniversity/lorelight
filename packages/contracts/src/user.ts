export interface UserDto {
  id: string; email: string; name: string; avatarUrl?: string;
  isActive: boolean; createdAt: string;
}
export interface CreateUserDto { email: string; password: string; name: string; }
export interface UpdateUserDto { name?: string; email?: string; avatarUrl?: string; }
export interface SetUserActiveDto { isActive: boolean; }
