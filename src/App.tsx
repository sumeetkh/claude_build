import { useState } from 'react'
import { sessions as seedSessions, type Session } from './data/mock'
import HomeView from './components/HomeView'
import SessionView from './components/SessionView'

export default function App() {
  // The whole app is one of two screens: the Workspace home, or a Session canvas.
  const [view, setView] = useState<'home' | 'session'>('home')

  // Sessions opened as tabs. Multiple can be "live" at once (parallel runs);
  // the canvas just shows whichever is active.
  const [openSessions, setOpenSessions] = useState<Session[]>(seedSessions.slice(0, 2))
  const [activeId, setActiveId] = useState<string>(seedSessions[0].id)

  const openSession = (session: Session) => {
    setOpenSessions((prev) => (prev.some((s) => s.id === session.id) ? prev : [...prev, session]))
    setActiveId(session.id)
    setView('session')
  }

  const closeSession = (id: string) => {
    setOpenSessions((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (id === activeId && next.length) setActiveId(next[next.length - 1].id)
      if (!next.length) setView('home')
      return next
    })
  }

  if (view === 'home') {
    return <HomeView onOpenSession={openSession} />
  }

  return (
    <SessionView
      openSessions={openSessions}
      activeId={activeId}
      onSelect={setActiveId}
      onClose={closeSession}
      onHome={() => setView('home')}
      onNew={() => setView('home')}
    />
  )
}
