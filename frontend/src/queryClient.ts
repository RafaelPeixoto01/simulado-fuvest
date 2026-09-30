import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // questões e catálogo só mudam a cada deploy
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
