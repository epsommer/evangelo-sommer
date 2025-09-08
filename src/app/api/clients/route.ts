import { NextRequest, NextResponse } from 'next/server';
import { ClientStatus, ServiceType } from '@prisma/client';
import { getPrismaClient, isPrismaAvailable } from '@/lib/prisma';
import { JsonFieldParsers, JsonFieldSerializers, transformClientRecordForResponse } from '@/lib/json-fields';

// Get Prisma client instance
const prisma = getPrismaClient();
const isDatabaseAvailable = isPrismaAvailable();


export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status') as ClientStatus | null;
    const search = url.searchParams.get('search');

    // If database is not available, return error
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { 
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    // Database is available - use Prisma queries
    console.log('Database available - querying clients');

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count (simplified for debugging)
    const total = await prisma.clientRecord.count();

    // Get clients with pagination (simplified query for debugging)
    const skip = (page - 1) * limit;
    const clients = await prisma.clientRecord.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        serviceId: true,
        status: true,
        tags: true,
        notes: true,
        projectType: true,
        serviceTypes: true,
        budget: true,
        timeline: true,
        seasonalContract: true,
        recurringService: true,
        address: true,
        metadata: true,
        contactPreferences: true,
        personalInfo: true,
        serviceProfile: true,
        billingInfo: true,
        relationshipData: true,
        createdAt: true,
        updatedAt: true,
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit
    });

    // Transform clients for response
    const transformedClients = clients.map(transformClientRecordForResponse);

    return NextResponse.json({
      success: true,
      data: transformedClients,
      total,
      page,
      limit
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('Clients listing error:', error);
    
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve clients'
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if database is available
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available - client creation requires database connection'
      }, { status: 503 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json({
        success: false,
        error: 'Client name is required'
      }, { status: 400 });
    }

    // Create participant first
    const participant = await prisma.participant.create({
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        company: body.company || null,
        role: 'CLIENT',
        services: body.serviceTypes ? JsonFieldSerializers.serializeStringArray(body.serviceTypes) : null,
        contactPreferences: body.contactPreferences ? JsonFieldSerializers.serializeContactPreferences(body.contactPreferences) : null
      }
    });

    // Create client record
    const client = await prisma.clientRecord.create({
      data: {
        participantId: participant.id,
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        company: body.company || null,
        serviceId: body.serviceId || `client_${Date.now()}`,
        status: body.status || 'ACTIVE',
        tags: body.tags ? JsonFieldSerializers.serializeStringArray(body.tags) : null,
        notes: body.notes || null,
        projectType: body.projectType || null,
        serviceTypes: body.serviceTypes ? JsonFieldSerializers.serializeStringArray(body.serviceTypes) : null,
        budget: body.budget || null,
        timeline: body.timeline || null,
        seasonalContract: body.seasonalContract || false,
        recurringService: body.recurringService || 'ONE_TIME',
        address: body.address ? JsonFieldSerializers.serializeAddress(body.address) : null,
        metadata: body.metadata ? JsonFieldSerializers.serializeObject(body.metadata) : null,
        contactPreferences: body.contactPreferences ? JsonFieldSerializers.serializeContactPreferences(body.contactPreferences) : null,
        personalInfo: body.personalInfo ? JsonFieldSerializers.serializeObject(body.personalInfo) : null,
        serviceProfile: body.serviceProfile ? JsonFieldSerializers.serializeObject(body.serviceProfile) : null,
        billingInfo: body.billingInfo ? JsonFieldSerializers.serializeObject(body.billingInfo) : null,
        relationshipData: body.relationshipData ? JsonFieldSerializers.serializeObject(body.relationshipData) : null
      },
      include: {
        participant: true
      }
    });

    // Transform for response
    const transformedClient = transformClientRecordForResponse(client);

    return NextResponse.json({
      success: true,
      data: transformedClient
    }, { 
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('Client creation error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create client'
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}