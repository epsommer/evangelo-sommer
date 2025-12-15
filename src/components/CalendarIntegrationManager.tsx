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

  // Load existing integrations from database on mount
  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        // Fetch integrations from database API
        const response = await fetch('/api/calendar/integrations');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Map database integrations to component format
            const mappedIntegrations: IntegrationType[] = result.data.map((dbIntegration: any) => ({
              id: dbIntegration.id,
              provider: dbIntegration.provider.toLowerCase(),
              accountId: dbIntegration.calendarEmail || dbIntegration.externalId,
              calendarId: dbIntegration.externalId,
              isActive: dbIntegration.isActive,
              syncEnabled: true,
              syncSettings: {
                syncDirection: 'bidirectional' as const,
                autoCreateEvents: true,
                defaultVisibility: 'private' as const,
              },
              lastSyncAt: dbIntegration.lastSyncAt,
              createdAt: dbIntegration.createdAt,
              updatedAt: dbIntegration.updatedAt,
              // Note: credentials are NOT returned by API for security
            }));

            setIntegrations(mappedIntegrations);
            onIntegrationChange?.(mappedIntegrations);

            // Also sync to localStorage for backward compatibility
            mappedIntegrations.forEach(integration => {
              calendarService.addIntegration(integration);
            });
          }
        } else {
          console.warn('Failed to fetch integrations from database, falling back to localStorage');
          // Fallback to localStorage if API fails
          const existingIntegrations = calendarService.getAllIntegrations();
          setIntegrations(existingIntegrations);
          onIntegrationChange?.(existingIntegrations);
        }
      } catch (error) {
        console.error('Error loading integrations:', error);
        // Fallback to localStorage on error
        const existingIntegrations = calendarService.getAllIntegrations();
        setIntegrations(existingIntegrations);
        onIntegrationChange?.(existingIntegrations);
      }
    };

    loadIntegrations();
  }, [onIntegrationChange]);

  // Handle OAuth callback from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const provider = urlParams.get('provider');
    const integrationId = urlParams.get('integrationId');
    const error = urlParams.get('error');

    if (success === 'true' && provider && integrationId) {
      // Reload integrations from database to get the newly connected integration
      const reloadIntegrations = async () => {
        try {
          const response = await fetch('/api/calendar/integrations');
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              // Map database integrations to component format
              const mappedIntegrations: IntegrationType[] = result.data.map((dbIntegration: any) => ({
                id: dbIntegration.id,
                provider: dbIntegration.provider.toLowerCase(),
                accountId: dbIntegration.calendarEmail || dbIntegration.externalId,
                calendarId: dbIntegration.externalId,
                isActive: dbIntegration.isActive,
                syncEnabled: true,
                syncSettings: {
                  syncDirection: 'bidirectional' as const,
                  autoCreateEvents: true,
                  defaultVisibility: 'private' as const,
                },
                lastSyncAt: dbIntegration.lastSyncAt,
                createdAt: dbIntegration.createdAt,
                updatedAt: dbIntegration.updatedAt,
              }));

              setIntegrations(mappedIntegrations);
              onIntegrationChange?.(mappedIntegrations);

              // Sync to localStorage
              mappedIntegrations.forEach(integration => {
                calendarService.addIntegration(integration);
              });

              // Auto-sync after successful connection
              const newIntegration = mappedIntegrations.find(i => i.id === integrationId);
              if (newIntegration) {
                handleSync(newIntegration.id);
              }
            }
          }

          // Clear URL params after processing
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        } catch (error) {
          console.error('Failed to reload integrations after OAuth callback:', error);
        }
      };

      reloadIntegrations();
    } else if (error) {
      console.error('OAuth error:', error, urlParams.get('message'));

      // Clear URL params
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
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

  const handleDisconnect = async (integrationId: string) => {
    try {
      // Delete from database
      const response = await fetch(`/api/calendar/integrations/${integrationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from localStorage
        calendarService.removeIntegration(integrationId);

        // Update local state
        const updated = integrations.filter(i => i.id !== integrationId);
        setIntegrations(updated);
        onIntegrationChange?.(updated);
      } else {
        console.error('Failed to disconnect integration from database');
        alert('Failed to disconnect calendar. Please try again.');
      }
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      alert('Failed to disconnect calendar. Please try again.');
    }
  };

  const handleSync = async (integrationId: string) => {
    setSyncStatus((prev) => ({ ...prev, [integrationId]: "syncing" }));

    try {
      console.log('Starting sync for integration:', integrationId);
      const events = await calendarService.syncEvents(integrationId);
      console.log('Sync successful, received events:', events.length);
      
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
        return [...filtered, ...newEvents];
      });

      // Call onEventsSync after state update
      const filtered = allEvents.filter(e => !e.metadata?.integrationId || e.metadata.integrationId !== integrationId);
      const newEvents = events.map(e => ({
        ...e,
        metadata: { ...e.metadata, integrationId }
      }));
      const merged = [...filtered, ...newEvents];
      onEventsSync?.(merged);

      setSyncStatus((prev) => ({ ...prev, [integrationId]: "success" }));

      // Reset status after 3 seconds
      setTimeout(() => {
        setSyncStatus((prev) => ({ ...prev, [integrationId]: "idle" }));
      }, 3000);
    } catch (error) {
      console.error("Failed to sync calendar:", error);

      // Log the error details for debugging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }

      if (error instanceof Error && error.message === 'REAUTH_REQUIRED') {
        // Handle reauth required
        setSyncStatus((prev) => ({ ...prev, [integrationId]: "error" }));
        alert('Authentication expired. Please reconnect your calendar.');
      } else {
        setSyncStatus((prev) => ({ ...prev, [integrationId]: "error" }));

        // Show user-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`Sync failed: ${errorMessage}\n\nCheck the browser console for more details.`);
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
    <div className={`space-y-8 ${className}`}>
      {/* Header with Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setActiveTab('integrations')}
              className={`neo-button px-4 py-2 text-sm font-primary uppercase tracking-wide transition-all ${
                activeTab === 'integrations'
                  ? 'neo-button-active'
                  : ''
              }`}
            >
              Calendar Integration
            </button>
            <button
              onClick={() => setActiveTab('recurring')}
              className={`neo-button px-4 py-2 text-sm font-primary uppercase tracking-wide transition-all ${
                activeTab === 'recurring'
                  ? 'neo-button-active'
                  : ''
              }`}
            >
              Recurring Events
            </button>
          </div>
          <p className="text-sm text-foreground/60 font-primary">
            {activeTab === 'integrations'
              ? 'Connect your calendar services to sync events and appointments'
              : 'Manage recurring appointments and automatic event generation'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-foreground/60">
            {activeTab === 'integrations' && (
              <>
                <div className="font-primary">{`${integrations.filter((i) => i.isActive).length} of ${providers.length} connected`}</div>
                <button
                  onClick={() => {
                    calendarService.clearAllIntegrations();
                    setIntegrations([]);
                    onIntegrationChange?.([]);
                  }}
                  className="text-xs text-red-500 hover:text-red-700 mt-1 font-primary"
                >
                  Clear All (Debug)
                </button>
              </>
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
        <div className="space-y-8">

      {/* Integration Status Section */}
      {integrations.length > 0 && (
        <div>
          <h3 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4 pb-2 border-b border-border">
            Status
          </h3>
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg animate-pulse"></div>
              <span className="text-sm font-semibold text-foreground font-primary">
                Calendar integrations active
              </span>
            </div>
            <div className="text-sm text-foreground/60 font-primary">
              Last sync:{" "}
              {integrations.find((i) => i.lastSyncAt)?.lastSyncAt
                ? new Date(
                    integrations.find((i) => i.lastSyncAt)!.lastSyncAt!,
                  ).toLocaleString()
                : "Never"}
            </div>
          </div>
        </div>
      )}

      {/* Calendar Providers Section */}
      <div>
        <h3 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4 pb-2 border-b border-border">
          Calendar Providers
        </h3>
        <div className="divide-y divide-border">
          {providers.map((provider) => {
            const integration = getIntegratedProvider(provider.id);
            const isConnected = integration?.isActive;
            const currentSyncStatus = integration
              ? syncStatus[integration.id] || "idle"
              : "idle";

            return (
              <div
                key={provider.id}
                className="py-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-lg ${provider.color} flex items-center justify-center text-white text-lg`}
                    >
                      {provider.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground font-primary">
                          {provider.name}
                        </h4>
                        {isConnected && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold font-primary uppercase tracking-wide">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/60 font-primary">
                        {provider.description}
                      </p>
                    </div>
                  </div>

                  {integration && isConnected ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSync(integration.id)}
                        disabled={currentSyncStatus === "syncing"}
                        className={`neo-button px-3 py-1.5 text-xs font-primary uppercase tracking-wide transition-all ${
                          currentSyncStatus === "syncing"
                            ? "opacity-50 cursor-not-allowed"
                            : currentSyncStatus === "success"
                              ? "!bg-green-100 !text-green-700"
                              : currentSyncStatus === "error"
                                ? "!bg-red-100 !text-red-700"
                                : ""
                        }`}
                      >
                        {currentSyncStatus === "syncing" && "Syncing..."}
                        {currentSyncStatus === "success" && "Synced"}
                        {currentSyncStatus === "error" && "Failed"}
                        {currentSyncStatus === "idle" && "Sync Now"}
                      </button>

                      <button
                        onClick={() => handleDisconnect(integration.id)}
                        className="neo-button px-3 py-1.5 text-xs font-primary uppercase tracking-wide text-red-600 hover:text-red-700"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(provider.id)}
                      disabled={isConnecting === provider.id || !['google', 'notion'].includes(provider.id)}
                      className={`px-4 py-2 text-xs font-primary uppercase tracking-wide font-semibold transition-all ${
                        !['google', 'notion'].includes(provider.id)
                          ? "neo-button opacity-50 cursor-not-allowed"
                          : isConnecting === provider.id
                            ? "neo-button opacity-50 cursor-not-allowed"
                            : "neo-button-active"
                      }`}
                    >
                      {isConnecting === provider.id
                        ? "Connecting..."
                        : !['google', 'notion'].includes(provider.id)
                          ? "Coming Soon"
                          : "Connect"}
                    </button>
                  )}
                </div>

                {/* Integration Details - shown inline when connected */}
                {integration && isConnected && (
                  <div className="mt-3 ml-13 pl-13 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-foreground/60 text-xs font-primary uppercase tracking-wide mb-1">Account</div>
                      <div className="font-medium text-foreground truncate font-primary">
                        {integration.accountId}
                      </div>
                    </div>
                    <div>
                      <div className="text-foreground/60 text-xs font-primary uppercase tracking-wide mb-1">Sync Direction</div>
                      <div className="font-medium text-foreground capitalize font-primary">
                        {integration.syncSettings.syncDirection.replace(
                          "-",
                          " ",
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Synchronized Events Section */}
      {allEvents.length > 0 && (
        <div>
          <h3 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4 pb-2 border-b border-border">
            Synchronized Events ({allEvents.length})
          </h3>
          <div className="divide-y divide-border max-h-48 overflow-y-auto">
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
                  className="py-3 flex items-center justify-between"
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
                      <div className="font-medium text-foreground text-sm font-primary">
                        {event.title}
                      </div>
                      <div className="text-foreground/60 text-xs font-primary">
                        {new Date(event.startTime).toLocaleDateString()} •{" "}
                        {event.type}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-background border border-border rounded capitalize font-primary">
                    {integrations.find(i => i.id === event.metadata?.integrationId)?.provider || 'local'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="pt-4 border-t border-border">
        <p className="text-sm text-foreground/60 font-primary text-center">
          Currently supporting Google Calendar and Notion. More integrations coming soon!
        </p>
      </div>
        </div>
      )}
    </div>
  );
}