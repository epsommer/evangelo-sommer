"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Conversation, Client, Message, ConversationAnalytics, ConversationHealth, Document, MessageAnalysis, ConversationInsight } from "../../../types/client";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import ConversationAnalyticsEngine, { analyzeMessage } from "../../../lib/conversation-analytics";
import { useConversations } from "../../../hooks/useConversations";
import ScheduleFollowUpForm from "../../../components/ScheduleFollowUpForm";
import FrequencyScheduler from "../../../components/FrequencyScheduler";
import ScheduleCalendar from "../../../components/ScheduleCalendar";
import ConversationBillingPanel from "../../../components/ConversationBillingPanel";

type TabType = "timeline" | "analytics" | "insights" | "schedule" | "billing";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("timeline");
  const [tabLoading, setTabLoading] = useState(false);
  const [messageAnalyses, setMessageAnalyses] = useState<Record<string, MessageAnalysis>>({});
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduledFollowUps, setScheduledFollowUps] = useState<any[]>([]);
  
  // Use real-time conversations hook if client ID is available
  const { conversations: allConversations } = useConversations(client?.id || "");
  
  const conversationId = params.conversationId as string;

  // Tab configuration
  const tabs = [
    { id: "timeline" as TabType, label: "Timeline", icon: "💬" },
    { id: "analytics" as TabType, label: "Analytics", icon: "📊" },
    { id: "insights" as TabType, label: "Insights", icon: "🎯" },
    { id: "schedule" as TabType, label: "Schedule", icon: "📅" },
    { id: "billing" as TabType, label: "Billing", icon: "💰" }
  ];

  // Tab switching handler
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setTabLoading(true);
    // Simulate loading for demo - in real app, this would load tab-specific data
    setTimeout(() => setTabLoading(false), 500);
  };

  useEffect(() => {
    const loadConversation = async () => {
      if (!conversationId) return;
      
      try {
        setLoading(true);
        setError(null);

        // Fetch conversation data
        const response = await fetch(`/api/conversations/${conversationId}`);
        if (!response.ok) {
          throw new Error('Failed to load conversation');
        }

        const result = await response.json();
        if (!result.success || !result.data) {
          throw new Error(result.error || 'No conversation data received');
        }

        const conversationData = result.data;
        setConversation(conversationData);

        // Fetch client data if available
        if (conversationData.clientId) {
          try {
            const clientResponse = await fetch(`/api/clients/${conversationData.clientId}`);
            if (clientResponse.ok) {
              const clientResult = await clientResponse.json();
              if (clientResult.success && clientResult.data) {
                setClient(clientResult.data);
              }
            }
          } catch (clientError) {
            console.warn('Failed to load client data:', clientError);
            // Continue without client data
          }
        }
      } catch (err) {
        console.error('Error loading conversation:', err);
        setError(err instanceof Error ? err.message : 'Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [conversationId]);

  // Analytics engine and calculations
  const analyticsEngine = useMemo(() => {
    const conversations = conversation ? [conversation] : [];
    return new ConversationAnalyticsEngine(conversations);
  }, [conversation]);

  const analytics = useMemo(() => {
    return conversation ? analyticsEngine.calculateAnalytics(conversation.clientId) : null;
  }, [analyticsEngine, conversation]);

  const conversationHealth = useMemo(() => {
    return conversation && conversation.clientId 
      ? analyticsEngine.calculateConversationHealth(conversation.clientId)
      : null;
  }, [analyticsEngine, conversation]);

  const insights = useMemo(() => {
    return conversation && conversation.clientId
      ? analyticsEngine.generateInsights(conversation.clientId) 
      : [];
  }, [analyticsEngine, conversation]);

  // Analyze messages when conversation loads
  useEffect(() => {
    if (conversation && conversation.messages) {
      const analyses: Record<string, MessageAnalysis> = {};
      conversation.messages.forEach((message) => {
        analyses[message.id] = analyzeMessage(message);
      });
      setMessageAnalyses(analyses);
    }
  }, [conversation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-off-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-4"></div>
              <p className="text-medium-grey font-space-grotesk uppercase tracking-wide">
                Loading conversation...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen bg-off-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h1 className="text-2xl font-bold text-dark-grey mb-2 font-space-grotesk uppercase tracking-wide">
                Conversation Not Found
              </h1>
              <p className="text-medium-grey mb-4 font-space-grotesk">
                {error || "The conversation you're looking for doesn't exist."}
              </p>
              <Link
                href="/conversations"
                className="inline-flex items-center px-4 py-2 bg-gold text-dark-grey hover:bg-gold-light font-space-grotesk font-bold uppercase tracking-wide"
              >
                ← Back to Conversations
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getSourceIcon = (source?: string) => {
    const icons = {
      email: "📧",
      text: "💬", 
      phone: "📞",
      meeting: "🤝",
      import: "📥",
      manual: "✏️",
    };
    return icons[source as keyof typeof icons] || "💬";
  };

  const getPriorityColor = (priority?: string) => {
    const colors = {
      urgent: "bg-red-100 text-red-800 border-red-200",
      high: "bg-orange-100 text-orange-800 border-orange-200", 
      medium: "bg-blue-100 text-blue-800 border-blue-200",
      low: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    if (tabLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-4"></div>
            <p className="text-medium-grey font-space-grotesk uppercase tracking-wide">
              Loading {activeTab}...
            </p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case "timeline":
        return renderTimelineContent();
      case "analytics":
        return renderAnalyticsContent();
      case "insights":
        return renderInsightsContent();
      case "schedule":
        return renderScheduleContent();
      case "billing":
        return renderBillingContent();
      default:
        return renderTimelineContent();
    }
  };

  const renderTimelineContent = () => (
    <div className="space-y-6">
      {/* Conversation Summary */}
      {conversation?.summary && (
        <Card className="border border-light-grey">
          <CardHeader className="bg-off-white border-b border-light-grey">
            <CardTitle className="font-space-grotesk uppercase tracking-wide text-dark-grey">
              Conversation Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-dark-grey text-sm mb-4">{conversation.summary}</p>
            {conversation.tags && conversation.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {conversation.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gold text-dark-grey text-xs border border-gold-dark font-space-grotesk uppercase tracking-wide"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
            Message Timeline
          </h3>
          <Button variant="outline" size="sm">
            Edit Messages
          </Button>
        </div>
        
        {conversation?.messages && conversation.messages.length > 0 ? (
          <div className="space-y-4">
            {conversation.messages.map((message: Message) => (
              <div
                key={message.id}
                className={`flex ${(message.role === "you" || message.role === "YOU") ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-3xl p-4 border-2 ${
                    (message.role === "you" || message.role === "YOU")
                      ? "bg-gold text-dark-grey border-gold-dark"
                      : "bg-white text-dark-grey border-light-grey"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold font-space-grotesk uppercase tracking-wide">
                      {(message.role === "you" || message.role === "YOU") ? "You" : (client?.name || "Client")}
                    </span>
                    <span className="text-xs text-medium-grey font-space-grotesk">
                      {new Date(message.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm whitespace-pre-wrap mb-3">
                    {message.content}
                  </p>

                  {/* Message Analysis Badges */}
                  {messageAnalyses[message.id] && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {/* Sentiment Analysis */}
                      {messageAnalyses[message.id].sentiment && Math.abs(messageAnalyses[message.id].sentiment.score) > 0.1 && (
                        <span className={`px-2 py-1 text-xs font-space-grotesk uppercase tracking-wide border ${
                          messageAnalyses[message.id].sentiment.score > 0 
                            ? 'bg-green-100 text-green-700 border-green-300' 
                            : 'bg-red-100 text-red-700 border-red-300'
                        }`}>
                          {messageAnalyses[message.id].sentiment.score > 0 ? '😊 Positive' : '😞 Negative'}
                        </span>
                      )}
                      
                      {/* Urgency Level */}
                      {messageAnalyses[message.id].urgencyLevel > 2 && (
                        <span className={`px-2 py-1 text-xs font-space-grotesk uppercase tracking-wide border ${
                          messageAnalyses[message.id].urgencyLevel >= 4
                            ? 'bg-red-100 text-red-700 border-red-300' 
                            : messageAnalyses[message.id].urgencyLevel === 3
                            ? 'bg-orange-100 text-orange-700 border-orange-300'
                            : 'bg-blue-100 text-blue-700 border-blue-300'
                        }`}>
                          🚨 {messageAnalyses[message.id].urgencyLevel >= 4 ? 'Urgent' : messageAnalyses[message.id].urgencyLevel === 3 ? 'High' : 'Medium'}
                        </span>
                      )}
                      
                      {/* Action Items */}
                      {messageAnalyses[message.id].actionItems && messageAnalyses[message.id].actionItems.length > 0 && (
                        <span className="px-2 py-1 text-xs font-space-grotesk uppercase tracking-wide border bg-blue-100 text-blue-700 border-blue-300">
                          ✓ {messageAnalyses[message.id].actionItems.length} Action{messageAnalyses[message.id].actionItems.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}

                  {message.metadata && (
                    <div className="text-xs text-medium-grey space-y-1">
                      {message.metadata.subject && (
                        <div className="font-space-grotesk uppercase tracking-wide">
                          Subject: {message.metadata.subject}
                        </div>
                      )}
                      {message.metadata.attachments && message.metadata.attachments.length > 0 && (
                        <div className="font-space-grotesk uppercase tracking-wide">
                          {message.metadata.attachments.length} Attachments
                        </div>
                      )}
                    </div>
                  )}

                  {/* Analysis badges - placeholder for future implementation */}
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-space-grotesk uppercase tracking-wide">
                      Sentiment: Positive
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-space-grotesk uppercase tracking-wide">
                      No Action Required
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border border-light-grey">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h4 className="text-xl font-bold text-dark-grey mb-2 font-space-grotesk uppercase tracking-wide">
                  No Messages Yet
                </h4>
                <p className="text-medium-grey font-space-grotesk">
                  Start a conversation to see the timeline here.
                </p>
                <Button className="mt-4" variant="default">
                  Add Message
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Next Actions */}
      {conversation?.nextActions && conversation.nextActions.length > 0 && (
        <Card className="border border-light-grey">
          <CardHeader className="bg-off-white border-b border-light-grey">
            <CardTitle className="font-space-grotesk uppercase tracking-wide text-dark-grey">
              Next Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {conversation.nextActions.map((action, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-gold-light border border-gold"
                >
                  <input
                    type="checkbox"
                    className="border-2 border-gold text-gold focus:ring-gold"
                  />
                  <span className="text-sm text-dark-grey font-space-grotesk">{action}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Helper function to format duration
  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  const renderAnalyticsContent = () => {
    if (!analytics || !conversation) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-medium-grey font-space-grotesk">No analytics data available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-light-grey">
          <CardHeader className="bg-off-white border-b border-light-grey">
            <CardTitle className="font-space-grotesk uppercase tracking-wide text-dark-grey">
              📊 Response Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-space-grotesk uppercase tracking-wide text-medium-grey">Average Response Time</span>
                <span className="text-lg font-bold text-dark-grey">
                  {formatDuration(analytics?.responseMetrics?.averageResponseTime || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-space-grotesk uppercase tracking-wide text-medium-grey">Fastest Response</span>
                <span className="text-lg font-bold text-green-600">
                  {formatDuration(analytics?.responseMetrics?.fastestResponse || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-space-grotesk uppercase tracking-wide text-medium-grey">Slowest Response</span>
                <span className="text-lg font-bold text-red-600">
                  {formatDuration(analytics?.responseMetrics?.slowestResponse || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-space-grotesk uppercase tracking-wide text-medium-grey">Total Messages</span>
                <span className="text-lg font-bold text-dark-grey">{conversation.messages?.length || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-light-grey">
          <CardHeader className="bg-off-white border-b border-light-grey">
            <CardTitle className="font-space-grotesk uppercase tracking-wide text-dark-grey">
              📈 Engagement Data
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-space-grotesk uppercase tracking-wide text-medium-grey">Client Messages</span>
                <span className="text-lg font-bold text-dark-grey">
                  {analytics?.engagementData?.messagesFromClient || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-space-grotesk uppercase tracking-wide text-medium-grey">Your Messages</span>
                <span className="text-lg font-bold text-dark-grey">
                  {analytics?.engagementData?.messagesFromYou || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-space-grotesk uppercase tracking-wide text-medium-grey">Total Messages</span>
                <span className="text-lg font-bold text-dark-grey">
                  {analytics?.engagementData?.totalMessages || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-space-grotesk uppercase tracking-wide text-medium-grey">Avg Message Length</span>
                <span className="text-lg font-bold text-dark-grey">
                  {analytics?.engagementData?.messageLengthAverage ? 
                    `${Math.round(analytics.engagementData.messageLengthAverage)} chars` : '0 chars'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-light-grey lg:col-span-2">
          <CardHeader className="bg-off-white border-b border-light-grey">
            <CardTitle className="font-space-grotesk uppercase tracking-wide text-dark-grey">
              💬 Communication Patterns
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-dark-grey mb-2">
                  {analytics?.engagementData?.activeHours?.slice(0, 3).join(', ') || 'N/A'}
                </div>
                <div className="text-sm font-space-grotesk uppercase tracking-wide text-medium-grey">
                  Most Active Hours
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-dark-grey mb-2">
                  {analytics?.engagementData?.messageLengthAverage ? 
                    Math.round(analytics.engagementData.messageLengthAverage) : 0}
                </div>
                <div className="text-sm font-space-grotesk uppercase tracking-wide text-medium-grey">
                  Avg Message Length (chars)
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-dark-grey mb-2">
                  {analytics?.sentimentTrend?.length > 0 ? 
                    (analytics.sentimentTrend[analytics.sentimentTrend.length - 1]?.sentiment > 0 ? '😊' : 
                     analytics.sentimentTrend[analytics.sentimentTrend.length - 1]?.sentiment < 0 ? '😞' : '😐') : '😐'}
                </div>
                <div className="text-sm font-space-grotesk uppercase tracking-wide text-medium-grey">
                  Latest Sentiment
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Helper functions for health scoring
  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";  
    if (score >= 40) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Poor";
  };

  const renderInsightsContent = () => {
    if (!conversationHealth && insights.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-medium-grey font-space-grotesk">No insights available</p>
            <p className="text-sm text-medium-grey font-space-grotesk mt-1">
              {conversation?.clientId ? "Analyzing conversation..." : "Client data needed for insights"}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Conversation Health Score */}
        {conversationHealth && (
          <Card className="border border-light-grey">
            <CardHeader className="bg-off-white border-b border-light-grey">
              <CardTitle className="font-space-grotesk uppercase tracking-wide text-dark-grey">
                🎯 Conversation Health Score
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center space-x-6">
                <div className="flex-shrink-0">
                  <div className={`relative w-24 h-24 border-4 flex items-center justify-center ${getHealthColor(conversationHealth.overall)}`}>
                    <span className="text-2xl font-bold">{Math.round(conversationHealth.overall)}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-dark-grey mb-2 font-space-grotesk uppercase tracking-wide">
                    {getHealthLabel(conversationHealth.overall)} Health
                  </h4>
                  <p className="text-medium-grey text-sm font-space-grotesk">
                    Overall conversation health based on response times, sentiment analysis, and engagement patterns.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Health Factors Breakdown */}
        {conversationHealth && conversationHealth.factors && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(conversationHealth.factors).map(([key, factor]) => (
              <Card key={key} className="border border-light-grey">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {key === 'responsiveness' ? '⏱️' : 
                       key === 'sentiment' ? '😊' : 
                       key === 'engagement' ? '💬' : 
                       key === 'consistency' ? '📊' : '🎯'}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h5>
                      <p className={`text-sm font-space-grotesk uppercase tracking-wide ${
                        factor.score >= 80 ? 'text-green-600' :
                        factor.score >= 60 ? 'text-yellow-600' :
                        factor.score >= 40 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {getHealthLabel(factor.score)} ({Math.round(factor.score)}/100)
                      </p>
                      {factor.details && (
                        <p className="text-xs text-medium-grey font-space-grotesk mt-1">
                          {factor.details}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* AI-Powered Insights */}
        {insights.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
              💡 AI-Powered Insights
            </h3>
            {insights.map((insight: ConversationInsight, index: number) => (
              <Card key={index} className="border border-light-grey">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {insight.type === "opportunity" ? "🎯" :
                         insight.type === "risk" ? "⚠️" :
                         insight.type === "pattern" ? "📈" :
                         insight.type === "suggestion" ? "💡" : "🔍"}
                      </span>
                      <h4 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                        {insight.title}
                      </h4>
                    </div>
                    <span className={`px-2 py-1 text-xs font-bold font-space-grotesk uppercase tracking-wide border ${
                      insight.priority === "urgent" ? "bg-red-100 text-red-800 border-red-200" :
                      insight.priority === "high" ? "bg-orange-100 text-orange-800 border-orange-200" :
                      insight.priority === "medium" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                      "bg-gray-100 text-gray-800 border-gray-200"
                    }`}>
                      {insight.priority}
                    </span>
                  </div>

                  <p className="text-sm text-medium-grey mb-4 font-space-grotesk">
                    {insight.description}
                  </p>

                  {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                        Suggested Actions:
                      </h5>
                      {insight.suggestedActions.map((action, actionIndex: number) => (
                        <div key={actionIndex} className="flex items-center justify-between p-3 bg-off-white border border-light-grey">
                          <div className="flex-1">
                            <div className="text-sm font-bold text-dark-grey font-space-grotesk">
                              {action.action}
                            </div>
                            <div className="text-xs text-medium-grey font-space-grotesk">
                              {action.description}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <span className={`px-2 py-1 text-xs font-space-grotesk uppercase tracking-wide border ${
                              action.effort === "high" ? "bg-red-100 text-red-700 border-red-200" :
                              action.effort === "medium" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                              "bg-green-100 text-green-700 border-green-200"
                            }`}>
                              {action.effort} effort
                            </span>
                            <span className={`px-2 py-1 text-xs font-space-grotesk uppercase tracking-wide border ${
                              action.impact === "high" ? "bg-green-100 text-green-700 border-green-200" :
                              action.impact === "medium" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                              "bg-gray-100 text-gray-700 border-gray-200"
                            }`}>
                              {action.impact} impact
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderScheduleContent = () => {
    const handleScheduleFollowUp = (followUpData: any) => {
      // Add the follow-up to the scheduled list
      setScheduledFollowUps(prev => [...prev, { ...followUpData, id: Date.now().toString() }]);
      setShowScheduleForm(false);
      console.log('Scheduled follow-up:', followUpData);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
            Follow-up Schedule
          </h3>
          <Button 
            variant="default"
            onClick={() => setShowScheduleForm(true)}
            className="bg-gold text-dark-grey hover:bg-gold-dark font-space-grotesk font-bold uppercase tracking-wide"
          >
            Schedule Follow-up
          </Button>
        </div>

        {/* Schedule Form Modal */}
        {showScheduleForm && (
          <Card className="border-2 border-gold bg-gold-light">
            <CardHeader className="bg-gold border-b-2 border-gold-dark">
              <div className="flex items-center justify-between">
                <CardTitle className="font-space-grotesk uppercase tracking-wide text-dark-grey">
                  📅 Schedule Follow-up
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowScheduleForm(false)}
                  className="text-dark-grey border-dark-grey hover:bg-dark-grey hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ScheduleFollowUpForm
                onSchedule={handleScheduleFollowUp}
                conversationContext={{
                  conversationId: conversation?.id || '',
                  clientId: conversation?.clientId || '',
                  clientName: client?.name || 'Client'
                }}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border border-light-grey">
              <CardHeader className="bg-off-white border-b border-light-grey">
                <CardTitle className="font-space-grotesk uppercase tracking-wide text-dark-grey">
                  📅 Calendar View
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ScheduleCalendar 
                  selectedDate={new Date()}
                  onDateSelect={(date) => console.log('Date selected:', date)}
                  onDayClick={(date) => {
                    console.log('Day clicked:', date);
                    // Navigate to time manager with the selected date
                    router.push(`/time-manager?date=${date.toISOString().split('T')[0]}&clientId=${client?.id}&conversationId=${conversationId}`);
                  }}
                  enableEditing={true}
                />
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border border-light-grey">
              <CardHeader className="bg-off-white border-b border-light-grey">
                <CardTitle className="font-space-grotesk uppercase tracking-wide text-dark-grey">
                  ⏰ Scheduled Follow-ups
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {scheduledFollowUps.length > 0 ? (
                  <div className="space-y-3">
                    {scheduledFollowUps.map((followUp) => (
                      <div key={followUp.id} className="p-3 border border-light-grey bg-off-white">
                        <h6 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                          {followUp.type || 'Follow-up'}
                        </h6>
                        <p className="text-sm text-medium-grey">
                          {followUp.scheduledDate ? new Date(followUp.scheduledDate).toLocaleDateString() : 'Date pending'}
                        </p>
                        {followUp.notes && (
                          <p className="text-xs text-medium-grey mt-1">
                            {followUp.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">⏰</div>
                    <p className="text-medium-grey font-space-grotesk uppercase tracking-wide text-sm">
                      No follow-ups scheduled
                    </p>
                    <p className="text-xs text-medium-grey font-space-grotesk mt-1">
                      Click "Schedule Follow-up" to get started
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Frequency Scheduler for recurring follow-ups */}
            <Card className="border border-light-grey mt-4">
              <CardHeader className="bg-off-white border-b border-light-grey">
                <CardTitle className="font-space-grotesk uppercase tracking-wide text-dark-grey">
                  🔄 Recurring Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <FrequencyScheduler
                  onRuleChange={(rule) => {
                    console.log('Recurring schedule rule set:', rule);
                    // TODO: Save rule to conversation/client follow-up schedule
                  }}
                  initialRule={null}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderBillingContent = () => {
    if (!conversation || !client) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-2">💰</div>
            <p className="text-medium-grey font-space-grotesk">Billing data not available</p>
            <p className="text-sm text-medium-grey font-space-grotesk mt-1">
              Client and conversation data needed for billing
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <ConversationBillingPanel
          conversation={conversation}
          client={client}
          onInvoiceGenerated={(invoice) => {
            console.log('Invoice generated:', invoice);
          }}
          onReceiptGenerated={(receipt) => {
            console.log('Receipt generated:', receipt);
          }}
          onPaymentRecorded={(payment) => {
            console.log('Payment recorded:', payment);
          }}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-off-white">
      {/* Fixed Header */}
      <div className="bg-white border-b-2 border-gold sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Left side - Navigation & Title */}
            <div className="flex items-center space-x-4">
              <Link
                href="/conversations"
                className="text-gold hover:text-gold-dark font-space-grotesk font-bold uppercase tracking-wide transition-colors"
              >
                ← Back to Conversations
              </Link>
              <div className="hidden lg:block w-px h-6 bg-light-grey"></div>
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {getSourceIcon(conversation?.source)}
                </div>
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                    {(conversation?.title || 
                      `${conversation?.source || 'Conversation'}`).toUpperCase()}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-medium-grey font-space-grotesk uppercase tracking-wide">
                    {client && <span>WITH {client.name.toUpperCase()}</span>}
                    {client && <span>•</span>}
                    <span>{conversation?.messages?.length || 0} MESSAGES</span>
                    <span>•</span>
                    <span>
                      {conversation?.updatedAt ? new Date(conversation.updatedAt).toLocaleDateString().toUpperCase() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right side - Priority & Actions */}
            <div className="flex items-center space-x-3">
              {conversation?.priority && (
                <span
                  className={`px-3 py-1 text-xs font-bold border-2 font-space-grotesk uppercase tracking-wide ${getPriorityColor(conversation.priority)}`}
                >
                  {conversation.priority.toUpperCase()}
                </span>
              )}
              <Button variant="outline" size="sm">Edit</Button>
              <Button variant="default" size="sm">Actions</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Sticky */}
      <div className="bg-off-white border-b border-light-grey sticky top-[88px] lg:top-[80px] z-10">
        <div className="container mx-auto px-4">
          <div className="flex space-x-0 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-shrink-0 flex items-center space-x-2 px-4 lg:px-6 py-3 font-space-grotesk font-bold uppercase tracking-wide text-sm transition-all border-b-2 ${
                  activeTab === tab.id
                    ? "bg-gold text-dark-grey border-gold-dark"
                    : "bg-transparent text-medium-grey border-transparent hover:bg-light-grey hover:text-dark-grey"
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-6 lg:py-8">
        {renderTabContent()}
      </div>
    </div>
  );
}