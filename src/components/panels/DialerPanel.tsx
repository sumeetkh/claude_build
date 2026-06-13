import type { Session } from '../../data/mock'

// Stub of the call surface: a transcript of the conversation and a place to type.
// Static sample turns for now — no live conversation yet.

const SAMPLE = [
  { who: 'agent', text: 'Thanks for calling Meridian support. What are you seeing on the router?' },
  { who: 'customer', text: 'The internet light is red and it says E1.' },
  { who: 'agent', text: 'Is that red light steady, or is it blinking?' },
] as const

export default function DialerPanel({ session }: { session?: Session }) {
  return (
    <div className="dialer">
      <div className="transcript">
        {session
          ? SAMPLE.map((turn, i) => (
              <div key={i} className={`turn ${turn.who}`}>
                <span className="turn-who">{turn.who}</span>
                <span className="turn-text">{turn.text}</span>
              </div>
            ))
          : <div className="empty">No active call.</div>}
      </div>

      <div className="composer">
        <input className="composer-input" placeholder="Type as the customer…" disabled />
        <button className="send-btn" disabled>Send</button>
      </div>
      <div className="dialer-footer">
        <span className="stub-note">stub · sample transcript</span>
      </div>
    </div>
  )
}
