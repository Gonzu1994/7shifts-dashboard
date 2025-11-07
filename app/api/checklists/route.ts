// app/api/checklists/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getTaskLists } from '../../../lib/sevenshifts'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const start = searchParams.get('start_date') || searchParams.get('date') || new Date().toISOString().slice(0,10)
    const end   = searchParams.get('end_date')   || start
    const locationParam = searchParams.get('location_ids') || ''
    const userId = searchParams.get('user_id') || undefined
    const locationIds = locationParam ? locationParam.split(',').map(s => s.trim()).filter(Boolean) : []

    const data = await getTaskLists({ start, end, locationIds, userId, debug: searchParams.get('debug') === '1' })

    return NextResponse.json({
      start, end,
      ...data,
      refreshedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
