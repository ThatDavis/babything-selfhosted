import { useEffect } from 'react'
import FeedSheet from './FeedSheet'
import DiaperSheet from './DiaperSheet'
import SleepSheet from './SleepSheet'
import type { SleepEvent } from '../lib/api'

interface Props {
  type: 'feed' | 'diaper' | 'sleep'
  babyId: string
  activeSleep: SleepEvent | null
  onClose: () => void
  onLogged: () => void
}

export default function QuickLogSheet({ type, babyId, activeSleep, onClose, onLogged }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet">
        {type === 'feed'   && <FeedSheet   babyId={babyId} onClose={onClose} onLogged={onLogged} />}
        {type === 'diaper' && <DiaperSheet babyId={babyId} onClose={onClose} onLogged={onLogged} />}
        {type === 'sleep'  && <SleepSheet  babyId={babyId} activeSleep={activeSleep} onClose={onClose} onLogged={onLogged} />}
      </div>
    </>
  )
}
