import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { endpoint } = await req.json()
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint missing' }, { status: 400 })
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Push unsubscribe error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
