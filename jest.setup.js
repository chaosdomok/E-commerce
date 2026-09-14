import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.DIRECT_URL = 'postgresql://test:test@localhost:5432/test'
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key'

// Mock Next.js dynamic imports
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  revalidatePath: jest.fn(),
}))

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
  })),
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    book: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    reservation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))
