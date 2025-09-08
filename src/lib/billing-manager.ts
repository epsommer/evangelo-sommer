// src/lib/billing-manager.ts
import { 
  Receipt, 
  Invoice, 
  ReceiptItem, 
  InvoiceItem, 
  CreateReceiptData, 
  CreateInvoiceData, 
  BillingSuggestion,
  BillingAnalytics,
  DEFAULT_TAX_CONFIG,
  TaxConfig,
  BusinessConfig,
  DEFAULT_BUSINESS_CONFIG,
  Quote,
  QuoteItem,
  CreateQuoteData
} from '../types/billing';
import { Client, Conversation, Message } from '../types/client';

class BillingManager {
  private receipts: Receipt[] = [];
  private invoices: Invoice[] = [];
  private quotes: Quote[] = [];
  private taxConfig: TaxConfig = DEFAULT_TAX_CONFIG;
  private businessConfig: BusinessConfig = DEFAULT_BUSINESS_CONFIG;

  // Receipt Management
  async createReceipt(data: CreateReceiptData): Promise<Receipt> {
    // CRITICAL: Always fetch latest client data
    const client = await this.getClientById(data.clientId);
    
    if (!client) {
      throw new Error('Client not found');
    }
    
    // Verify client has required info for receipt
    if (!client.email || !client.name) {
      throw new Error('Client missing required information for receipt generation');
    }

    // Generate receipt items with IDs
    const items: ReceiptItem[] = data.items.map(item => ({
      ...item,
      id: this.generateId(),
      totalPrice: item.quantity * item.unitPrice
    }));

    const subtotal = this.calculateSubtotal(items);
    const taxAmount = this.calculateTax(items);
    const totalAmount = subtotal + taxAmount;
    
    const receipt: Receipt = {
      id: this.generateId(),
      receiptNumber: await this.generateReceiptNumber(),
      clientId: data.clientId,
      client: client, // Use fresh client data
      conversationId: data.conversationId,
      items: items,
      subtotal: subtotal,
      taxAmount: taxAmount,
      totalAmount: totalAmount,
      paymentMethod: data.paymentMethod,
      paymentDate: data.paymentDate || new Date(),
      serviceDate: data.serviceDate || new Date(),
      status: 'issued',
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return await this.saveReceipt(receipt);
  }

  async createInvoice(data: CreateInvoiceData): Promise<Invoice> {
    // CRITICAL: Always fetch latest client data
    const client = await this.getClientById(data.clientId);
    
    if (!client) {
      throw new Error('Client not found');
    }
    
    // Verify client has required info for invoice
    if (!client.email || !client.name) {
      throw new Error('Client missing required information for invoice generation');
    }

    // Generate invoice items with IDs
    const items: InvoiceItem[] = data.items.map(item => ({
      ...item,
      id: this.generateId(),
      totalPrice: item.quantity * item.unitPrice
    }));

    const subtotal = this.calculateSubtotal(items);
    const taxAmount = this.calculateTax(items);
    const totalAmount = subtotal + taxAmount;
    
    const invoice: Invoice = {
      id: this.generateId(),
      invoiceNumber: await this.generateInvoiceNumber(),
      clientId: data.clientId,
      client: client, // Use fresh client data
      conversationId: data.conversationId,
      items: items,
      subtotal: subtotal,
      taxAmount: taxAmount,
      totalAmount: totalAmount,
      dueDate: data.dueDate || this.calculateDueDate(data.paymentTerms || 'net30'),
      paymentTerms: data.paymentTerms || 'net30',
      status: 'draft',
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return await this.saveInvoice(invoice);
  }

  // Client Data Sync Functions
  async syncBillingDocumentsWithClient(clientId: string, updatedClient: Client): Promise<void> {
    // Update all receipts
    await this.updateReceiptsClientData(clientId, {
      name: updatedClient.name,
      email: updatedClient.email,
      phone: updatedClient.phone,
      address: updatedClient.address,
      company: updatedClient.company
    });
    
    // Update all invoices
    await this.updateInvoicesClientData(clientId, updatedClient);
    
    console.log(`Synced billing documents for client: ${updatedClient.name}`);
  }

  private async updateReceiptsClientData(clientId: string, clientData: Partial<Client>): Promise<void> {
    const clientReceipts = this.receipts.filter(r => r.clientId === clientId);
    
    for (const receipt of clientReceipts) {
      receipt.client = { ...receipt.client, ...clientData };
      receipt.updatedAt = new Date();
      await this.saveReceipt(receipt);
    }
  }

  private async updateInvoicesClientData(clientId: string, updatedClient: Client): Promise<void> {
    const clientInvoices = this.invoices.filter(i => i.clientId === clientId);
    
    for (const invoice of clientInvoices) {
      invoice.client = updatedClient;
      invoice.updatedAt = new Date();
      await this.saveInvoice(invoice);
    }
  }

  // Conversation Analysis for Billing
  analyzeConversationForBilling(conversation: Conversation): BillingSuggestion {
    const messages = conversation.messages;
    const lastMessages = messages.slice(-5); // Check last 5 messages
    
    const indicators = {
      serviceCompleted: this.checkForServiceCompletion(lastMessages),
      paymentMentioned: this.checkForPaymentMention(lastMessages),
      pricingDiscussed: this.checkForPricingDiscussion(messages),
      schedulingConfirmed: this.checkForSchedulingConfirmation(messages)
    };
    
    // Determine if receipt should be suggested
    if (indicators.serviceCompleted && indicators.paymentMentioned) {
      return {
        type: 'receipt',
        confidence: 'high',
        suggestedItems: this.extractServiceItems(messages),
        suggestedAmount: this.extractAmount(lastMessages),
        reason: 'Service completed and payment mentioned in conversation'
      };
    }
    
    // Determine if invoice should be suggested
    if (indicators.serviceCompleted && !indicators.paymentMentioned) {
      return {
        type: 'invoice',
        confidence: 'medium',
        suggestedItems: this.extractServiceItems(messages),
        suggestedAmount: this.extractAmount(messages),
        reason: 'Service completed but no payment mentioned'
      };
    }
    
    return { 
      type: 'none', 
      confidence: 'low',
      reason: 'No clear billing indicators found in conversation'
    };
  }

  // Service completion detection patterns
  private checkForServiceCompletion(messages: Message[]): boolean {
    const completionPhrases = [
      'job is done', 'finished', 'completed', 'all set',
      'work is finished', 'service completed', 'task completed',
      'wrapped up', 'done with', 'finished up'
    ];
    
    return messages.some(msg => 
      completionPhrases.some(phrase => 
        msg.content.toLowerCase().includes(phrase)
      )
    );
  }

  // Payment mention detection
  private checkForPaymentMention(messages: Message[]): boolean {
    const paymentPhrases = [
      'paid', 'payment', 'cash', 'card', 'e-transfer',
      'bill', 'charge', 'cost', '$', 'invoice', 'receipt',
      'etransfer', 'interac', 'visa', 'mastercard'
    ];
    
    return messages.some(msg =>
      paymentPhrases.some(phrase =>
        msg.content.toLowerCase().includes(phrase)
      )
    );
  }

  private checkForPricingDiscussion(messages: Message[]): boolean {
    const pricingPhrases = [
      'price', 'cost', 'quote', 'estimate', '$', 'dollar',
      'rate', 'fee', 'charge', 'total', 'amount'
    ];
    
    return messages.some(msg =>
      pricingPhrases.some(phrase =>
        msg.content.toLowerCase().includes(phrase)
      )
    );
  }

  private checkForSchedulingConfirmation(messages: Message[]): boolean {
    const schedulingPhrases = [
      'scheduled', 'appointment', 'booked', 'confirmed',
      'see you', 'coming by', 'visit', 'arrive'
    ];
    
    return messages.some(msg =>
      schedulingPhrases.some(phrase =>
        msg.content.toLowerCase().includes(phrase)
      )
    );
  }

  private extractServiceItems(messages: Message[]): ReceiptItem[] {
    // Simple extraction - in a real implementation, this would use NLP
    const items: ReceiptItem[] = [];
    
    // Look for common service patterns
    const servicePatterns = [
      { pattern: /lawn\s*(care|mowing|cutting)/i, service: 'lawn_care', description: 'Lawn Care Service' },
      { pattern: /landscaping/i, service: 'landscaping', description: 'Landscaping Service' },
      { pattern: /snow\s*(removal|clearing)/i, service: 'snow_removal', description: 'Snow Removal Service' },
      { pattern: /maintenance/i, service: 'maintenance', description: 'Maintenance Service' },
      { pattern: /consultation/i, service: 'consultation', description: 'Consultation Service' }
    ];

    const messageText = messages.map(m => m.content).join(' ');
    
    servicePatterns.forEach(pattern => {
      if (pattern.pattern.test(messageText)) {
        items.push({
          id: this.generateId(),
          description: pattern.description,
          serviceType: pattern.service as 'landscaping' | 'snow_removal' | 'hair_cutting' | 'creative_development',
          quantity: 1,
          unitPrice: 0, // Would need to be filled in by user
          totalPrice: 0,
          taxable: true
        });
      }
    });

    return items;
  }

  private extractAmount(messages: Message[]): number | undefined {
    const messageText = messages.map(m => m.content).join(' ');
    
    // Look for dollar amounts
    const dollarMatch = messageText.match(/\$(\d+(?:\.\d{2})?)/);
    if (dollarMatch) {
      return parseFloat(dollarMatch[1]);
    }
    
    return undefined;
  }

  // Calculation helpers
  private calculateSubtotal(items: (ReceiptItem | InvoiceItem)[]): number {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  private calculateTax(items: (ReceiptItem | InvoiceItem)[], businessRegistered?: boolean): number {
    // For unregistered business under $30k CAD, no tax is applicable
    if (!businessRegistered && !this.businessConfig.isRegistered) {
      return 0;
    }
    
    const taxableAmount = items
      .filter(item => item.taxable)
      .reduce((sum, item) => sum + item.totalPrice, 0);
    
    return taxableAmount * this.taxConfig.rate;
  }

  private calculateTaxForQuote(items: QuoteItem[], businessRegistered?: boolean): number {
    // For unregistered business under $30k CAD, no tax is applicable
    if (!businessRegistered && !this.businessConfig.isRegistered) {
      return 0;
    }
    
    // For quotes, assume all items are taxable unless specified otherwise
    const taxableAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    return taxableAmount * this.taxConfig.rate;
  }

  private calculateDueDate(paymentTerms: Invoice['paymentTerms']): Date {
    const now = new Date();
    switch (paymentTerms) {
      case 'due_on_receipt':
        return now;
      case 'net15':
        return new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
      case 'net30':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case 'net45':
        return new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  // Number generation
  private async generateReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = this.receipts.filter(r => 
      r.receiptNumber.startsWith(`REC-${year}`)
    ).length + 1;
    
    return `REC-${year}-${count.toString().padStart(3, '0')}`;
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = this.invoices.filter(i => 
      i.invoiceNumber.startsWith(`INV-${year}`)
    ).length + 1;
    
    return `INV-${year}-${count.toString().padStart(3, '0')}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Data persistence (mock implementation - replace with actual database)
  private async saveReceipt(receipt: Receipt): Promise<Receipt> {
    const existingIndex = this.receipts.findIndex(r => r.id === receipt.id);
    if (existingIndex >= 0) {
      this.receipts[existingIndex] = receipt;
    } else {
      this.receipts.push(receipt);
    }
    return receipt;
  }

  private async saveInvoice(invoice: Invoice): Promise<Invoice> {
    const existingIndex = this.invoices.findIndex(i => i.id === invoice.id);
    if (existingIndex >= 0) {
      this.invoices[existingIndex] = invoice;
    } else {
      this.invoices.push(invoice);
    }
    return invoice;
  }

  // Client data fetching - integrates with clientManager
  private async getClientById(clientId: string): Promise<Client | null> {
    try {
      // Import clientManager dynamically to avoid circular dependencies
      const { clientManager } = await import('./client-config');
      const client = clientManager.getClient(clientId);
      
      if (!client) {
        console.error(`Client with ID ${clientId} not found`);
        return null;
      }
      
      return client;
    } catch (error) {
      console.error('Error fetching client:', error);
      return null;
    }
  }

  // Public getters
  getReceiptsByClientId(clientId: string): Receipt[] {
    return this.receipts.filter(r => r.clientId === clientId);
  }

  getInvoicesByClientId(clientId: string): Invoice[] {
    return this.invoices.filter(i => i.clientId === clientId);
  }

  getReceiptsByConversationId(conversationId: string): Receipt[] {
    return this.receipts.filter(r => r.conversationId === conversationId);
  }

  getInvoicesByConversationId(conversationId: string): Invoice[] {
    return this.invoices.filter(i => i.conversationId === conversationId);
  }

  getReceiptById(receiptId: string): Receipt | null {
    return this.receipts.find(r => r.id === receiptId) || null;
  }

  getInvoiceById(invoiceId: string): Invoice | null {
    return this.invoices.find(i => i.id === invoiceId) || null;
  }

  // Quote Management
  async createQuote(data: CreateQuoteData): Promise<Quote> {
    // CRITICAL: Always fetch latest client data
    const client = await this.getClientById(data.clientId);
    
    if (!client) {
      throw new Error('Client not found');
    }
    
    // Verify client has required info for quote (name is sufficient)
    if (!client.name) {
      throw new Error('Client missing required information for quote generation');
    }

    // Generate quote items with IDs
    const items: QuoteItem[] = data.items.map(item => ({
      ...item,
      id: this.generateId(),
      totalPrice: item.quantity * item.unitPrice
    }));

    const subtotal = this.calculateSubtotal(items as any); // QuoteItem compatible with calculation
    const businessRegistered = data.businessRegistered ?? this.businessConfig.isRegistered;
    const taxAmount = this.calculateTaxForQuote(items, businessRegistered);
    const totalAmount = subtotal + taxAmount;
    
    const quote: Quote = {
      id: this.generateId(),
      quoteNumber: await this.generateQuoteNumber(),
      clientId: data.clientId,
      client: client, // Use fresh client data
      conversationId: data.conversationId,
      items: items,
      subtotal: subtotal,
      taxAmount: taxAmount,
      totalAmount: totalAmount,
      taxStatus: businessRegistered ? 'applicable' : 'not_applicable',
      businessRegistered: businessRegistered,
      validUntil: data.validUntil,
      status: 'draft',
      notes: data.notes,
      terms: data.terms || this.getDefaultQuoteTerms(client.serviceId),
      projectScope: data.projectScope,
      estimatedDuration: data.estimatedDuration,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return await this.saveQuote(quote);
  }

  async updateQuoteStatus(quoteId: string, status: Quote['status']): Promise<Quote> {
    const quote = this.getQuoteById(quoteId);
    if (!quote) {
      throw new Error('Quote not found');
    }

    quote.status = status;
    quote.updatedAt = new Date();

    if (status === 'sent') {
      quote.sentAt = new Date();
    } else if (status === 'accepted') {
      quote.acceptedAt = new Date();
    } else if (status === 'declined') {
      quote.declinedAt = new Date();
    }

    return await this.saveQuote(quote);
  }

  async convertQuoteToInvoice(quoteId: string): Promise<Invoice> {
    const quote = this.getQuoteById(quoteId);
    if (!quote) {
      throw new Error('Quote not found');
    }

    if (quote.status !== 'accepted') {
      throw new Error('Quote must be accepted before converting to invoice');
    }

    // Convert quote items to invoice items
    const invoiceItems: InvoiceItem[] = quote.items.map(item => ({
      id: this.generateId(),
      description: item.description,
      serviceType: item.serviceCategory as any, // Map serviceCategory to serviceType
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      taxable: true
    }));

    const invoiceData: CreateInvoiceData = {
      clientId: quote.clientId,
      conversationId: quote.conversationId,
      items: invoiceItems.map(item => ({
        description: item.description,
        serviceType: item.serviceType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        taxable: item.taxable
      })),
      notes: `Converted from Quote ${quote.quoteNumber}. ${quote.notes || ''}`.trim()
    };

    const invoice = await this.createInvoice(invoiceData);

    // Update quote status and link to invoice
    quote.status = 'converted';
    quote.convertedToInvoiceId = invoice.id;
    quote.updatedAt = new Date();
    await this.saveQuote(quote);

    return invoice;
  }

  private getDefaultQuoteTerms(serviceId?: string): string {
    const baseTerms = `This quote is valid for 30 days from the date issued.
Pricing subject to change after expiration date.
Work will commence upon written acceptance of this quote.
Payment terms: Net 30 days from invoice date.`;

    const serviceSpecificTerms: Record<string, string> = {
      landscaping: `${baseTerms}
Weather conditions may affect project timeline.
Materials costs subject to supplier availability.`,
      
      'creative-development': `${baseTerms}
50% deposit required to begin work.
Additional revisions beyond scope may incur extra charges.
Client responsible for providing necessary assets and content.`,
      
      'snow-removal': `${baseTerms}
Seasonal contract rates available.
Emergency service calls subject to additional charges.`,
      
      'hair-cutting': `${baseTerms}
Appointment booking required.
Cancellation policy: 24 hours notice required.`
    };

    return serviceSpecificTerms[serviceId || ''] || baseTerms;
  }

  private async generateQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = this.quotes.filter(q => 
      q.quoteNumber.startsWith(`QUO-${year}`)
    ).length + 1;
    
    return `QUO-${year}-${count.toString().padStart(3, '0')}`;
  }

  private async saveQuote(quote: Quote): Promise<Quote> {
    const existingIndex = this.quotes.findIndex(q => q.id === quote.id);
    if (existingIndex >= 0) {
      this.quotes[existingIndex] = quote;
    } else {
      this.quotes.push(quote);
    }
    return quote;
  }

  // Quote getters
  getQuotesByClientId(clientId: string): Quote[] {
    return this.quotes.filter(q => q.clientId === clientId);
  }

  getQuoteById(quoteId: string): Quote | null {
    return this.quotes.find(q => q.id === quoteId) || null;
  }

  getExpiredQuotes(): Quote[] {
    const now = new Date();
    return this.quotes.filter(q => 
      q.status === 'sent' && q.validUntil < now
    );
  }

  // Analytics
  calculateBillingAnalytics(): BillingAnalytics {
    const totalRevenue = this.receipts.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalReceiptsIssued = this.receipts.length;
    const totalInvoicesSent = this.invoices.filter(i => i.status === 'sent').length;
    const averageReceiptAmount = totalReceiptsIssued > 0 ? totalRevenue / totalReceiptsIssued : 0;
    const averageInvoiceAmount = this.invoices.length > 0 ? 
      this.invoices.reduce((sum, i) => sum + i.totalAmount, 0) / this.invoices.length : 0;

    const outstandingInvoices = this.invoices.filter(i => 
      i.status === 'sent' || i.status === 'overdue'
    ).length;
    const outstandingAmount = this.invoices
      .filter(i => i.status === 'sent' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.totalAmount, 0);

    const overdueInvoices = this.invoices.filter(i => 
      i.status === 'overdue' || (i.status === 'sent' && new Date() > i.dueDate)
    ).length;
    const overdueAmount = this.invoices
      .filter(i => i.status === 'overdue' || (i.status === 'sent' && new Date() > i.dueDate))
      .reduce((sum, i) => sum + i.totalAmount, 0);

    const paymentMethodBreakdown = this.receipts.reduce((acc, r) => {
      acc[r.paymentMethod] = (acc[r.paymentMethod] || 0) + r.totalAmount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRevenue,
      totalReceiptsIssued,
      totalInvoicesSent,
      averageReceiptAmount,
      averageInvoiceAmount,
      outstandingInvoices,
      outstandingAmount,
      overdueInvoices,
      overdueAmount,
      paymentMethodBreakdown,
      monthlyRevenue: [], // Would implement monthly breakdown
      topServices: [] // Would implement service breakdown
    };
  }
}

// Export singleton instance
export const billingManager = new BillingManager();
export default billingManager;
