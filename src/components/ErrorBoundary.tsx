import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props { children: ReactNode; label?: string }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) { return { error } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', this.props.label, error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-sm text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <AlertTriangle size={28} style={{ color: '#f87171' }} />
            </div>
          </div>
          <div>
            <div className="font-semibold mb-1" style={{ color: '#e2e8f0' }}>
              {this.props.label || 'Something went wrong'}
            </div>
            <div className="text-sm" style={{ color: '#64748b' }}>
              {this.state.error.message}
            </div>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: '#141720', border: '1px solid #1c2030', color: '#94a3b8' }}
          >
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      </div>
    )
  }
}
