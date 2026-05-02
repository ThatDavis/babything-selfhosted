import { Router } from 'express'
import { getPlansFromMainApp } from '../lib/main-app.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const { plans } = await getPlansFromMainApp()
    res.json({ plans })
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? 'Failed to fetch plans' })
  }
})

export default router
