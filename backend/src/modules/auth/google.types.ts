export interface GoogleUserInfo {
  email: string
  name: string
  avatarUrl: string | null
  emailVerified: boolean
  googleId: string
}

export interface GoogleAuthInput {
  credential?: string
  idToken?: string
  accessToken?: string
  supabaseToken?: string
  developmentDemoUser?: {
    email: string
    name: string
    avatarUrl?: string
  }
}

