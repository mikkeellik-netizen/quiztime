import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: string | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error: error.message || String(error) }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#06080f] flex flex-col items-center justify-center px-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-white font-bold text-lg mb-2">Что-то пошло не так</p>
          <p className="text-red-400 text-sm mb-6 max-w-xs break-words">{this.state.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-[#7c6ded] text-white font-bold"
          >
            Перезагрузить
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
