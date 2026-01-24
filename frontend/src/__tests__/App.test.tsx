import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const renderApp = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('App', () => {
  it('renders the home page', () => {
    renderApp()
    // 使用 getAllByText 因為有多個 "Travian Tools" 元素（nav 和 h1）
    expect(screen.getAllByText(/Travian Tools/i).length).toBeGreaterThan(0)
  })
})
