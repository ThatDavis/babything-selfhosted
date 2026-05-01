import { useEffect } from 'react'

const SCRIPT_URL = import.meta.env.VITE_AFFILIATE_SCRIPT_URL

export default function AffiliateScript() {
  useEffect(() => {
    if (!SCRIPT_URL) return
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return null
}
