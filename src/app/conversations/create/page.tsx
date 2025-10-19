// src/app/conversations/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Client, Message } from "../../../types/client";
import ConversationCreator from "../../../components/conversation/ConversationCreator";

export default function CreateConversationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get client ID from URL params if provided
  const preSelectedClientId = searchParams?.get('client') || '';

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients?limit=100');
        if (response.ok) {
          const data = await response.json();
          console.log('📥 Fetched clients data:', data);
          
          // Handle different response formats
          if (Array.isArray(data)) {
            setClients(data);
          } else if (data.clients && Array.isArray(data.clients)) {
            setClients(data.clients);
          } else if (data.data && Array.isArray(data.data)) {
            setClients(data.data);
          } else {
            console.error('Unexpected clients data format:', data);
            setClients([]);
          }
        } else {
          console.error('Failed to fetch clients');
          setClients([]);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
        setClients([]); // Ensure clients is always an array
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const handleConversationCreated = (conversationId: string, clientId: string) => {
    // Navigate to the standalone conversation page
    router.push(`/conversations/${conversationId}`);
  };

  const handleCancel = () => {
    // Navigate back to conversations list or client page
    if (preSelectedClientId) {
      router.push(`/clients/${preSelectedClientId}`);
    } else {
      router.push('/conversations');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-hud-background-secondary">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hud-border-accent"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hud-background-secondary">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-hud-text-primary uppercase tracking-wide font-space-grotesk">
              Create New Conversation
            </h1>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-medium-grey hover:text-hud-text-primary font-space-grotesk font-bold uppercase tracking-wide transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-medium-grey font-space-grotesk">
            Import conversation data from multiple formats with advanced editing capabilities
          </p>
        </div>

        {/* Main Content */}
        <ConversationCreator
          clients={clients}
          preSelectedClientId={preSelectedClientId}
          onConversationCreated={handleConversationCreated}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}