export interface LoginDto { email: string; password: string; }
export interface RegisterDto { email: string; password: string; name: string; }
export interface AuthTokensDto { accessToken: string; expiresIn: number; }
export interface CurrentUserDto {
  id: string; email: string; name: string; avatarUrl?: string; createdAt: string;
}
export interface ChangePasswordDto { currentPassword: string; newPassword: string; }
