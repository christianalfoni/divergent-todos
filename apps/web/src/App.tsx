import { useEffect, useState } from 'react'
import { auth } from './firebase'

export default function App() {
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    // Works only when running inside Electron
    window.native?.getVersion?.().then(setVersion).catch(() => {})
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Divergent Todos</h1>
      {version && <p className="text-sm opacity-70">App v{version}</p>}
      {/* Render auth state, Firestore data, etc. */}
    </div>
  )
}
