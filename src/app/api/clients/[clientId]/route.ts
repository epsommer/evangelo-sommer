import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient, isPrismaAvailable } from '@/lib/prisma';
import { transformClientRecordForResponse } from '@/lib/json-fields';
import { Client } from "../../../../types/client";
import { isValidEmail, isValidPhone } from "../../../../lib/client-profile-utils";

// Get Prisma client instance
const prisma = getPrismaClient();
const isDatabaseAvailable = isPrismaAvailable();

// GET /api/clients/[clientId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    
    // If database is not available, return error
    if (!isDatabaseAvailable || !prisma) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 503 });
    }

    // Database is available - use Prisma query
    console.log(`Database available - querying client: ${clientId}`);

    const clientRecord = await prisma.clientRecord.findUnique({
      where: { id: clientId },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true
          }
        },
        serviceHistory: {
          take: 10,
          orderBy: { serviceDate: 'desc' },
          select: {
            id: true,
            serviceDate: true,
            serviceType: true,
            completionStatus: true,
            amount: true
          }
        },
        serviceContracts: {
          orderBy: [
            { isPrimary: 'desc' },
            { isActive: 'desc' },
            { createdAt: 'asc' }
          ],
          select: {
            id: true,
            serviceId: true,
            serviceLineId: true,
            serviceLine: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                color: true,
                isActive: true
              }
            },
            serviceName: true,
            serviceCategory: true,
            status: true,
            period: true,
            startDate: true,
            endDate: true,
            contractValue: true,
            frequency: true,
            notes: true,
            isActive: true,
            isPrimary: true,
            nextScheduled: true,
            lastCompleted: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });

    if (!clientRecord) {
      return NextResponse.json({
        success: false,
        error: 'Client not found'
      }, { status: 404 });
    }

    // Transform client for response
    const transformedClient = transformClientRecordForResponse(clientRecord);

    return NextResponse.json({
      success: true,
      data: transformedClient
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch client"
    }, { status: 500 });
  }
}

// PATCH /api/clients/[clientId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const updates = await request.json();

    // Validate required fields if they're being updated
    if (updates.email !== undefined && updates.email && !isValidEmail(updates.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (updates.phone !== undefined && updates.phone && !isValidPhone(updates.phone)) {
      return NextResponse.json(
        { error: "Invalid phone format" },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database update
    // For now, return the updated client data
    const updatedClient: Partial<Client> = {
      id: clientId,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      client: updatedClient,
      message: "Client profile updated successfully"
    });
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}
