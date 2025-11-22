import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/testimonials/send-request - Send testimonial request to client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, serviceId, serviceName, message } = body

    // Validate required fields
    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required field: clientId' },
        { status: 400 }
      )
    }

    // Fetch client details
    const client = await prisma!.clientRecord.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (!client.email) {
      return NextResponse.json(
        { error: 'Client does not have an email address' },
        { status: 400 }
      )
    }

    // Create a pending testimonial request
    const testimonial = await prisma!.testimonial.create({
      data: {
        clientId,
        serviceId,
        serviceName,
        rating: 0, // Placeholder, will be filled when client submits
        content: '', // Placeholder, will be filled when client submits
        status: 'PENDING',
        requestSentAt: new Date(),
        source: 'email',
      },
    })

    // TODO: Send email to client with testimonial form link
    // For now, we'll just create the record and return success
    // In a real implementation, you would integrate with your email service here
    // Example: await sendTestimonialRequestEmail(client.email, testimonial.id, message)

    return NextResponse.json({
      success: true,
      message: 'Testimonial request created successfully',
      testimonial: {
        id: testimonial.id,
        clientId: testimonial.clientId,
        status: testimonial.status,
        requestSentAt: testimonial.requestSentAt,
      },
      // Include form link that can be sent to client
      formLink: `/testimonials/submit/${testimonial.id}`,
    })
  } catch (error) {
    console.error('Error sending testimonial request:', error)
    return NextResponse.json(
      { error: 'Failed to send testimonial request' },
      { status: 500 }
    )
  }
}
