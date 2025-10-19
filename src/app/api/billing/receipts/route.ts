// src/app/api/billing/receipts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { billingManager } from "../../../../lib/billing-manager";
import { CreateReceiptData, Receipt } from "../../../../types/billing";

// GET /api/billing/receipts - Get all receipts with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const conversationId = searchParams.get('conversationId');
    const includeArchived = searchParams.get('archived') === 'true';
    
    let receipts: Receipt[];
    
    if (clientId) {
      receipts = billingManager.getReceiptsByClientId(clientId);
    } else if (conversationId) {
      receipts = billingManager.getReceiptsByConversationId(conversationId);
    } else {
      // Return all receipts
      receipts = await billingManager.getAllReceipts(includeArchived);
    }

    return NextResponse.json({
      success: true,
      receipts: receipts
    });
  } catch (error) {
    console.error("Error fetching receipts:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipts" },
      { status: 500 }
    );
  }
}

// POST /api/billing/receipts - Create new receipt
export async function POST(request: NextRequest) {
  try {
    const receiptData: CreateReceiptData = await request.json();

    // Validate required fields
    if (!receiptData.clientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    if (!receiptData.items || receiptData.items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    if (!receiptData.paymentMethod) {
      return NextResponse.json(
        { error: "Payment method is required" },
        { status: 400 }
      );
    }

    // Create the receipt
    const receipt = await billingManager.createReceipt(receiptData);

    return NextResponse.json({
      success: true,
      receipt: receipt,
      message: "Receipt created successfully"
    });
  } catch (error) {
    console.error("Error creating receipt:", error);
    return NextResponse.json(
      { 
        error: "Failed to create receipt", 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
