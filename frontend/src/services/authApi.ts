
export type UserRole = "SHIPPER" | "CARRIER" | "ADMIN";

export type AuthUser = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    companyName: string | null;
    role: UserRole;
    status: "ACTIVE" | "SUSPENDED";
    createdAt: string;
};

export type AuthSession = {
    user: AuthUser;
    accessToken: string;
    tokenType: "Bearer";
    expiresInSeconds: number;
};

export type RegisterPayload = {
    name: string;
    email: string;
    password: string;
    phone?: string;
    companyName: string;
    role: "SHIPPER" | "CARRIER";
};

export type LoginPayload = {
    email: string;
    password: string;
};

type ApiResponse<T> = {
    success: boolean;
    message?: string;
    data: T;
};

type ApiErrorResponse = {
    message?: string;
    errors?: Record<string, string[] | undefined>;
};


export class ApiError extends Error {
    readonly status: number;

    readonly fieldErrors: Record<
        string,
        string[] | undefined
    >;

    constructor(
        message: string,
        status: number,
        fieldErrors: Record<
            string,
            string[] | undefined
        > = {}
    ) {
        super(message);

        this.name = "ApiError";
        this.status = status;
        this.fieldErrors = fieldErrors;
    }
}


let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
    accessToken = token;
}

async function apiRequest<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");

    if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
    }

    let response: Response;

    try {
        response = await fetch(`/api/v1${path}`, {
            ...options,
            headers,
            credentials: "omit",
        });
    } catch {
        throw new ApiError(
            "Cannot connect to the server. Check that the backend is running.",
            0
        );
    }

    const body: unknown = await response.json().catch(
        () => null
    );

    if (!response.ok) {
        const errorBody = body as ApiErrorResponse | null;

        throw new ApiError(
            errorBody?.message ?? `Request failed (${response.status})`,
            response.status,
            errorBody?.errors ?? {}
        );
    }

    return body as T;
}

export async function registerUser(
    data: RegisterPayload
): Promise<AuthSession> {
    const result = await apiRequest<ApiResponse<AuthSession>>(
        "/auth/register",
        {
            method: "POST",
            body: JSON.stringify(data),
        }
    );

    return result.data;
}

export async function loginUser(
    data: LoginPayload
): Promise<AuthSession> {
    const result = await apiRequest<ApiResponse<AuthSession>>(
        "/auth/login",
        {
            method: "POST",
            body: JSON.stringify(data),
        }
    );

    return result.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
    const result = await apiRequest<
        ApiResponse<{ user: AuthUser }>
    >("/auth/me");

    return result.data.user;
}

export function dashboardForRole(role: UserRole): string {
    switch (role) {
        case "SHIPPER":
            return "/app/shipper";
        case "CARRIER":
            return "/app/carrier";
        case "ADMIN":
            return "/app/admin";
    }
}


export type GoogleAuthPayload = {
    credential: string;
    role?: "SHIPPER" | "CARRIER";
};

export async function loginWithGoogle(
    data: GoogleAuthPayload
): Promise<AuthSession> {
    const result = await apiRequest<
        ApiResponse<AuthSession>
    >("/auth/google", {
        method: "POST",
        body: JSON.stringify(data),
    });

    return result.data;
}

