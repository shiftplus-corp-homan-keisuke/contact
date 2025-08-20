// 認証関連の型定義
export interface User {
    id: string;
    email: string;
    name: string;
    role: {
        id: string;
        name: string;
        permissions: string[];
    };
    createdAt: string;
    updatedAt: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthResult {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface AuthContextType {
    user: User | null;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    isAuthenticated: boolean;
}