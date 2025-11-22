import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// POST /api/testimonials/submit - Public endpoint for clients to submit testimonials
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testimonialId, rating, title, content } = body

    // Validate required fields
    if (!testimonialId || !content || rating === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: testimonialId, content, rating' },
        { status: 400 }
      )
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Find the testimonial request
    const existingTestimonial = await prisma!.testimonial.findUnique({
      where: { id: testimonialId },
    })

    if (!existingTestimonial) {
      return NextResponse.json(
        { error: 'Testimonial request not found' },
        { status: 404 }
      )
    }

    // Check if already submitted
    if (existingTestimonial.status !== 'PENDING' && existingTestimonial.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'This testimonial has already been submitted' },
        { status: 400 }
      )
    }

    // Update the testimonial with client's submission
    const testimonial = await prisma!.testimonial.update({
      where: { id: testimonialId },
      data: {
        rating,
        title,
        content,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Thank you for your testimonial! It has been submitted for review.',
      testimonial: {
        id: testimonial.id,
        status: testimonial.status,
        submittedAt: testimonial.submittedAt,
      },
    })
  } catch (error) {
    console.error('Error submitting testimonial:', error)
    return NextResponse.json(
      { error: 'Failed to submit testimonial' },
      { status: 500 }
    )
  }
}
