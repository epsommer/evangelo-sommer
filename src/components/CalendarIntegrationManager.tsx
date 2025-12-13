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

  // Load existing integrations on mount
  useEffect(() => {
    const existingIntegrations = calendarService.getAllIntegrations();
    setIntegrations(existingIntegrations);
    onIntegrationChange?.(existingIntegrations);
  }, [onIntegrationChange]);

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
    <div className={`space-y-6 ${className}`}>
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
          <p className="text-sm text-[var(--neomorphic-text)] opacity-70 font-primary">
            {activeTab === 'integrations'
              ? 'Connect your calendar services to sync events and appointments'
              : 'Manage recurring appointments and automatic event generation'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-[var(--neomorphic-text)] opacity-70">
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
        <div className="space-y-6">

      {/* Integration Status */}
      {integrations.length > 0 && (
        <div className="neo-card p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg animate-pulse"></div>
            <span className="text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
              Calendar integrations active
            </span>
          </div>
          <div className="text-sm text-[var(--neomorphic-text)] opacity-70 font-primary">
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
              className={`neo-card p-6 transition-all ${
                isConnected ? "ring-2 ring-green-500/30" : ""
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-12 h-12 rounded-xl ${provider.color} flex items-center justify-center text-white text-xl shadow-lg`}
                  >
                    {provider.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--neomorphic-text)] font-primary">
                      {provider.name}
                    </h3>
                    <p className="text-sm text-[var(--neomorphic-text)] opacity-60 font-primary">
                      {provider.description}
                    </p>
                  </div>
                </div>

                {isConnected && (
                  <div className="neo-badge px-3 py-1 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-600 font-semibold font-primary uppercase tracking-wide">
                      Connected
                    </span>
                  </div>
                )}
              </div>

              {integration && isConnected ? (
                <div className="space-y-4">
                  {/* Integration Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm neo-inset rounded-lg p-3">
                    <div>
                      <div className="text-[var(--neomorphic-text)] opacity-60 text-xs font-primary uppercase tracking-wide mb-1">Account</div>
                      <div className="font-medium text-[var(--neomorphic-text)] truncate font-primary">
                        {integration.accountId}
                      </div>
                    </div>
                    <div>
                      <div className="text-[var(--neomorphic-text)] opacity-60 text-xs font-primary uppercase tracking-wide mb-1">Sync Direction</div>
                      <div className="font-medium text-[var(--neomorphic-text)] capitalize font-primary">
                        {integration.syncSettings.syncDirection.replace(
                          "-",
                          " ",
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSync(integration.id)}
                      disabled={currentSyncStatus === "syncing"}
                      className={`neo-button flex-1 px-4 py-2 text-sm font-primary uppercase tracking-wide transition-all ${
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
                      className="neo-button px-4 py-2 text-sm font-primary uppercase tracking-wide text-red-600 hover:text-red-700"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                /* Connection Button */
                <button
                  onClick={() => handleConnect(provider.id)}
                  disabled={isConnecting === provider.id || !['google', 'notion'].includes(provider.id)}
                  className={`w-full py-3 text-sm font-primary uppercase tracking-wide font-semibold transition-all ${
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
                      : `Connect ${provider.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Events Summary */}
      {allEvents.length > 0 && (
        <div className="neo-card p-6">
          <h3 className="font-semibold text-[var(--neomorphic-text)] mb-4 font-primary uppercase tracking-wide">
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
                  className="flex items-center justify-between p-3 neo-inset rounded-lg"
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
                      <div className="font-medium text-[var(--neomorphic-text)] text-sm font-primary">
                        {event.title}
                      </div>
                      <div className="text-[var(--neomorphic-text)] opacity-60 text-xs font-primary">
                        {new Date(event.startTime).toLocaleDateString()} •{" "}
                        {event.type}
                      </div>
                    </div>
                  </div>
                  <div className="neo-badge text-xs px-2 py-1 capitalize font-primary">
                    {integrations.find(i => i.id === event.metadata?.integrationId)?.provider || 'local'}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-center">
        <p className="text-sm text-[var(--neomorphic-text)] opacity-60 font-primary">
          Currently supporting Google Calendar and Notion. More integrations coming soon!
        </p>
      </div>
        </div>
      )}
    </div>
  );
}