import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const serviceLines = await prisma.serviceLine.findMany({
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: {
            serviceContracts: true,
            serviceRecords: true,
            billingRecords: true
          }
        }
      }
    })

    const enhancedServiceLines = serviceLines.map(serviceLine => ({
      id: serviceLine.id,
      name: serviceLine.name,
      slug: serviceLine.slug,
      description: serviceLine.description,
      color: serviceLine.color,
      isActive: serviceLine.isActive,
      createdAt: serviceLine.createdAt,
      updatedAt: serviceLine.updatedAt,
      counts: {
        contracts: serviceLine._count.serviceContracts,
        records: serviceLine._count.serviceRecords,
        billing: serviceLine._count.billingRecords
      }
    }))

    return NextResponse.json(enhancedServiceLines)
  } catch (error) {
    console.error('Error fetching service lines:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}