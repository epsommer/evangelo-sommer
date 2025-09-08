"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  CalendarEvent,
  CalendarIntegration as IntegrationType,
} from "../types/scheduling";
import { calendarService } from "@/lib/calendar-service";
import RecurringEventManager from "./RecurringEventManager";

interface CalendarIntegrationManagerProps {
  onEventsSync?: (events: CalendarEvent[]) => void;
  onIntegrationChange?: (integrations: IntegrationType[]) => void;
  clientId?: string;
  className?: string;
}

export default function CalendarIntegrationManager({
  onEventsSync,
  onIntegrationChange,
  clientId,
  className = "",
}: CalendarIntegrationManagerProps) {
  const [integrations, setIntegrations] = useState<IntegrationType[]>([]);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    Record<string, "idle" | "syncing" | "success" | "error">
  >({});
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'integrations' | 'recurring'>('integrations');

  // Handle OAuth callback from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const provider = urlParams.get('provider');
    const data = urlParams.get('data');
    const error = urlParams.get('error');

    if (success === 'true' && provider && data) {
      try {
        const integrationData = JSON.parse(data);
        const integration = calendarService.handleOAuthCallback(provider, integrationData);
        
        setIntegrations(prev => {
          const updated = [...prev, integration];
          onIntegrationChange?.(updated);
          return updated;
        });

        // Clear URL params
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
        // Auto-sync after successful connection
        handleSync(integration.id);
        
      } catch (error) {
        console.error('Failed to process OAuth callback:', error);
      }
    } else if (error) {
      console.error('OAuth error:', error, urlParams.get('message'));
    }
  }, [onIntegrationChange]);

  const providers = calendarService.getAvailableProviders();

  const handleConnect = async (providerId: string) => {
    if (!['google', 'notion'].includes(providerId)) {
      // Coming soon providers
      alert(`${providerId} integration is coming soon!`);
      return;
    }

    setIsConnecting(providerId);

    try {
      const { authUrl } = await calendarService.initiateOAuth(providerId);
      window.location.href = authUrl;
    } catch (error) {
      console.error("Failed to connect:", error);
      setIsConnecting(null);
    }
  };

  const handleDisconnect = (integrationId: string) => {
    calendarService.removeIntegration(integrationId);
    const updated = integrations.filter(i => i.id !== integrationId);
    setIntegrations(updated);
    onIntegrationChange?.(updated);
  };

  const handleSync = async (integrationId: string) => {
    setSyncStatus((prev) => ({ ...prev, [integrationId]: "syncing" }));

    try {
      const events = await calendarService.syncEvents(integrationId);
      
      // Update the integration's last sync time
      const integration = integrations.find(i => i.id === integrationId);
      if (integration) {
        integration.lastSyncAt = new Date().toISOString();
        setIntegrations([...integrations]);
      }

      // Merge with existing events
      setAllEvents(prev => {
        const filtered = prev.filter(e => !e.metadata?.integrationId || e.metadata.integrationId !== integrationId);
        const newEvents = events.map(e => ({
          ...e,
          metadata: { ...e.metadata, integrationId }
        }));
        const merged = [...filtered, ...newEvents];
        onEventsSync?.(merged);
        return merged;
      });

      setSyncStatus((prev) => ({ ...prev, [integrationId]: "success" }));

      // Reset status after 3 seconds
      setTimeout(() => {
        setSyncStatus((prev) => ({ ...prev, [integrationId]: "idle" }));
      }, 3000);
    } catch (error) {
      console.error("Failed to sync:", error);
      
      if (error instanceof Error && error.message === 'REAUTH_REQUIRED') {
        // Handle reauth required
        setSyncStatus((prev) => ({ ...prev, [integrationId]: "error" }));
        alert('Authentication expired. Please reconnect your calendar.');
      } else {
        setSyncStatus((prev) => ({ ...prev, [integrationId]: "error" }));
      }
    }
  };

  const getIntegratedProvider = (providerId: string) => {
    return integrations.find(
      (integration) => integration.provider === providerId,
    );
  };

  const handleRecurringEventsGenerated = (newEvents: CalendarEvent[]) => {
    setAllEvents(prev => {
      const merged = [...prev, ...newEvents];
      onEventsSync?.(merged);
      return merged;
    });

    // Optionally sync to external calendars automatically
    if (integrations.length > 0) {
      syncRecurringEventsToCalendars(newEvents);
    }
  };

  const syncRecurringEventsToCalendars = async (events: CalendarEvent[]) => {
    const activeIntegrations = integrations.filter(i => i.isActive);
    
    for (const integration of activeIntegrations) {
      try {
        const result = await calendarService.syncRecurringEvents(integration.id, events);
        console.log(`Synced ${result.successful.length} events to ${integration.provider}, ${result.failed.length} failed`);
      } catch (error) {
        console.error(`Failed to sync recurring events to ${integration.provider}:`, error);
      }
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Tabs */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-6 mb-4">
            <button
              onClick={() => setActiveTab('integrations')}
              className={`text-lg font-semibold pb-2 border-b-2 transition-colors ${
                activeTab === 'integrations'
                  ? 'text-gold border-gold'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              Calendar Integration
            </button>
            <button
              onClick={() => setActiveTab('recurring')}
              className={`text-lg font-semibold pb-2 border-b-2 transition-colors ${
                activeTab === 'recurring'
                  ? 'text-gold border-gold'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              Recurring Events
            </button>
          </div>
          <p className="text-sm text-gray-600">
            {activeTab === 'integrations' 
              ? 'Connect your calendar services to sync events and appointments'
              : 'Manage recurring appointments and automatic event generation'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">
            {activeTab === 'integrations' && (
              `${integrations.filter((i) => i.isActive).length} of ${providers.length} connected`
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'recurring' ? (
        <RecurringEventManager
          clientId={clientId}
          onEventsGenerated={handleRecurringEventsGenerated}
        />
      ) : (
        <div className="space-y-6">

      {/* Integration Status */}
      {integrations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-900">
              Calendar integrations are active
            </span>
          </div>
          <div className="text-sm text-blue-800">
            Last sync:{" "}
            {integrations.find((i) => i.lastSyncAt)?.lastSyncAt
              ? new Date(
                  integrations.find((i) => i.lastSyncAt)!.lastSyncAt!,
                ).toLocaleString()
              : "Never"}
          </div>
        </div>
      )}

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((provider) => {
          const integration = getIntegratedProvider(provider.id);
          const isConnected = integration?.isActive;
          const currentSyncStatus = integration
            ? syncStatus[integration.id] || "idle"
            : "idle";

          return (
            <div
              key={provider.id}
              className={`border-2 rounded-lg p-6 transition-all ${
                isConnected
                  ? "border-green-200 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${provider.color} flex items-center justify-center text-white text-xl`}
                  >
                    {provider.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {provider.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {provider.description}
                    </p>
                  </div>
                </div>

                {isConnected && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-700 font-medium">
                      Connected
                    </span>
                  </div>
                )}
              </div>

              {integration && isConnected ? (
                <div className="space-y-4">
                  {/* Integration Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Account</div>
                      <div className="font-medium text-gray-900 truncate">
                        {integration.accountId}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Sync Direction</div>
                      <div className="font-medium text-gray-900 capitalize">
                        {integration.syncSettings.syncDirection.replace(
                          "-",
                          " ",
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <Button
                      onClick={() => handleSync(integration.id)}
                      disabled={currentSyncStatus === "syncing"}
                      variant="outline"
                      size="sm"
                      className={`flex-1 ${
                        currentSyncStatus === "syncing"
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : currentSyncStatus === "success"
                            ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-300"
                            : currentSyncStatus === "error"
                              ? "bg-red-100 text-red-700 hover:bg-red-200 border-red-300"
                              : "border-blue-300 text-blue-700 hover:bg-blue-50"
                      }`}
                    >
                      {currentSyncStatus === "syncing" && "🔄 Syncing..."}
                      {currentSyncStatus === "success" && "✅ Synced"}
                      {currentSyncStatus === "error" && "❌ Failed"}
                      {currentSyncStatus === "idle" && "🔄 Sync Now"}
                    </Button>

                    <Button
                      onClick={() => handleDisconnect(integration.id)}
                      variant="outline"
                      size="sm"
                      className="px-4 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                /* Connection Button */
                <Button
                  onClick={() => handleConnect(provider.id)}
                  disabled={isConnecting === provider.id || !['google', 'notion'].includes(provider.id)}
                  className={`w-full ${
                    !['google', 'notion'].includes(provider.id)
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : isConnecting === provider.id
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gold text-dark-grey hover:bg-gold/90"
                  }`}
                >
                  {isConnecting === provider.id
                    ? "Connecting..."
                    : !['google', 'notion'].includes(provider.id)
                      ? "Coming Soon"
                      : `Connect ${provider.name}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Events Summary */}
      {allEvents.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-4">
            Synchronized Events ({allEvents.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {allEvents
              .sort(
                (a, b) =>
                  new Date(a.startTime).getTime() -
                  new Date(b.startTime).getTime(),
              )
              .slice(0, 10)
              .map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-lg">
                      {event.type === "follow-up"
                        ? "🔄"
                        : event.type === "appointment"
                          ? "📅"
                          : event.type === "deadline"
                            ? "⏰"
                            : "🔔"}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {event.title}
                      </div>
                      <div className="text-gray-600 text-xs">
                        {new Date(event.startTime).toLocaleDateString()} •{" "}
                        {event.type}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {integrations.find(i => i.id === event.metadata?.integrationId)?.provider || 'local'}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Currently supporting Google Calendar and Notion. More integrations coming soon!
        </p>
      </div>
        </div>
      )}
    </div>
  );
}