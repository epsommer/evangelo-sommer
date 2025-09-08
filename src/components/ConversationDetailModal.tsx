// src/components/ConversationDetailModal.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Conversation, Message, MessageAnalysis } from "../types/client";
import { ScheduleRule } from "../types/scheduling";
import ConversationAnalyticsEngine, {
  analyzeMessage,
} from "../lib/conversation-analytics";
import FrequencyScheduler from "./FrequencyScheduler";

interface ConversationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  clientName: string;
  allConversations: Conversation[];
  onSave: (conversation: Conversation) => void;
  onScheduleFollowUp?: (rule: ScheduleRule) => void;
}

type TabType = "timeline" | "analytics" | "insights" | "schedule";

export default function ConversationDetailModal({
  isOpen,
  onClose,
  conversation,
  clientName,
  allConversations,
  onSave,
  onScheduleFollowUp,
}: ConversationDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("timeline");
  const [isEditing, setIsEditing] = useState(false);
  const [editedConversation, setEditedConversation] =
    useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [messageAnalyses, setMessageAnalyses] = useState<
    Record<string, MessageAnalysis>
  >({});
  const [showScheduler, setShowScheduler] = useState(false);

  // Analytics engine
  const analyticsEngine = useMemo(
    () => new ConversationAnalyticsEngine(allConversations),
    [allConversations],
  );

  // Calculate analytics for current conversation
  const conversationAnalytics = useMemo(
    () =>
      conversation
        ? analyticsEngine.calculateAnalytics(conversation.clientId)
        : null,
    [analyticsEngine, conversation],
  );

  const conversationHealth = useMemo(
    () =>
      conversation
        ? analyticsEngine.calculateConversationHealth(conversation.clientId)
        : null,
    [analyticsEngine, conversation],
  );

  const insights = useMemo(
    () =>
      conversation
        ? analyticsEngine.generateInsights(conversation.clientId)
        : [],
    [analyticsEngine, conversation],
  );

  useEffect(() => {
    if (conversation) {
      setEditedConversation({ ...conversation });

      // Analyze messages
      const analyses: Record<string, MessageAnalysis> = {};
      conversation.messages.forEach((message) => {
        analyses[message.id] = analyzeMessage(message);
      });
      setMessageAnalyses(analyses);
    }
  }, [conversation]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab("timeline");
      setIsEditing(false);
      setNewMessage("");
      setShowScheduler(false);
    }
  }, [isOpen]);

  if (!isOpen || !conversation || !editedConversation) return null;

  const handleSave = () => {
    if (editedConversation) {
      onSave(editedConversation);
      setIsEditing(false);
    }
  };

  const handleAddMessage = () => {
    if (!newMessage.trim() || !editedConversation) return;

    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: "you",
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      type: "email",
    };

    const updatedConversation = {
      ...editedConversation,
      messages: [...editedConversation.messages, message],
      updatedAt: new Date().toISOString(),
    };

    setEditedConversation(updatedConversation);
    setNewMessage("");

    // Analyze new message
    setMessageAnalyses((prev) => ({
      ...prev,
      [message.id]: analyzeMessage(message),
    }));
  };

  const handleScheduleFollowUp = (rule: ScheduleRule) => {
    onScheduleFollowUp?.(rule);
    setShowScheduler(false);
  };

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

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (score >= 40) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="text-2xl">{getSourceIcon(conversation.source)}</div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {conversation.title || `${conversation.source} conversation`}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <span>with {clientName}</span>
                <span>•</span>
                <span>{conversation.messages.length} messages</span>
                <span>•</span>
                <span>
                  {new Date(conversation.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full border ${getPriorityColor(conversation.priority)}`}
            >
              {conversation.priority}
            </span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isEditing ? "Cancel Edit" : "Edit"}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { key: "timeline", name: "Timeline", icon: "📅" },
              { key: "analytics", name: "Analytics", icon: "📊" },
              { key: "insights", name: "Insights", icon: "💡" },
              { key: "schedule", name: "Schedule", icon: "⏰" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div className="p-6">
              {/* Conversation Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900 mb-2">
                  Conversation Summary
                </h3>
                <p className="text-blue-800 text-sm">
                  {editedConversation.summary || "No summary available"}
                </p>
                {editedConversation.tags &&
                  editedConversation.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {editedConversation.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
              </div>

              {/* Messages Timeline */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 mb-4">
                  Message Timeline
                </h3>
                {editedConversation.messages.map((message, index) => {
                  const analysis = messageAnalyses[message.id];
                  return (
                    <div
                      key={message.id || `message-${index}`}
                      className={`flex ${message.role === "you" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-3xl rounded-lg p-4 ${
                          message.role === "you"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium opacity-90">
                            {message.role === "you" ? "You" : clientName}
                          </span>
                          <span className="text-xs opacity-75">
                            {new Date(message.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>

                        {analysis && (
                          <div className="mt-3 pt-3 border-t border-opacity-20">
                            <div className="flex flex-wrap gap-2">
                              {analysis.urgencyLevel > 3 && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                  Urgent ({analysis.urgencyLevel}/5)
                                </span>
                              )}
                              {analysis.sentiment.score > 0.3 && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                  Positive Sentiment
                                </span>
                              )}
                              {analysis.sentiment.score < -0.3 && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                  Negative Sentiment
                                </span>
                              )}
                              {analysis.actionItems.length > 0 && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                                  {analysis.actionItems.length} Action Items
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {message.metadata && (
                          <div className="mt-2 text-xs opacity-75">
                            {message.metadata.subject && (
                              <div>Subject: {message.metadata.subject}</div>
                            )}
                            {message.metadata.attachments &&
                              message.metadata.attachments.length > 0 && (
                                <div>
                                  {message.metadata.attachments.length}{" "}
                                  attachments
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Message */}
              {isEditing && (
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Add Message
                  </h4>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleAddMessage}
                      disabled={!newMessage.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Message
                    </button>
                  </div>
                </div>
              )}

              {/* Next Actions */}
              {editedConversation.nextActions &&
                editedConversation.nextActions.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-medium text-gray-900 mb-3">
                      Next Actions
                    </h3>
                    <ul className="space-y-2">
                      {editedConversation.nextActions.map((action, index) => (
                        <li
                          key={index}
                          className="flex items-center space-x-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {action}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Save Button */}
              {isEditing && (
                <div className="flex justify-end mt-6 pt-4 border-t">
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && conversationAnalytics && (
            <div className="p-6 space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatDuration(
                      conversationAnalytics.responseMetrics.averageResponseTime,
                    )}
                  </div>
                  <div className="text-sm text-blue-800">Avg Response Time</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {conversationAnalytics.engagementData.totalMessages}
                  </div>
                  <div className="text-sm text-green-800">Total Messages</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(
                      conversationAnalytics.actionItemsTracking.completionRate,
                    )}
                    %
                  </div>
                  <div className="text-sm text-purple-800">Completion Rate</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-600">
                    {conversationAnalytics.topicAnalysis.keyTopics.length}
                  </div>
                  <div className="text-sm text-orange-800">
                    Topics Discussed
                  </div>
                </div>
              </div>

              {/* Sentiment Trend */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="font-medium text-gray-900 mb-4">
                  Sentiment Over Time
                </h3>
                <div className="space-y-2">
                  {conversationAnalytics.sentimentTrend
                    .slice(-5)
                    .map((point, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-600">
                          {new Date(point.date).toLocaleDateString()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-16 h-2 rounded-full ${
                              point.sentiment > 0.3
                                ? "bg-green-400"
                                : point.sentiment < -0.3
                                  ? "bg-red-400"
                                  : "bg-gray-400"
                            }`}
                          />
                          <span className="text-sm text-gray-700">
                            {point.sentiment > 0 ? "+" : ""}
                            {(point.sentiment * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Communication Patterns */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="font-medium text-gray-900 mb-4">
                  Communication Patterns
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Preferred Method
                    </h4>
                    <div className="text-lg font-semibold text-gray-900 capitalize">
                      {
                        conversationAnalytics.communicationPatterns
                          .preferredContactMethod
                      }
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </h4>
                    <div className="text-lg font-semibold text-gray-900 capitalize">
                      {
                        conversationAnalytics.communicationPatterns
                          .communicationFrequency
                      }
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Best Response Times
                  </h4>
                  <div className="flex space-x-2">
                    {conversationAnalytics.communicationPatterns.bestResponseTimes
                      .slice(0, 3)
                      .map((time, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                        >
                          {time.hour}:00
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              {/* Top Topics */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="font-medium text-gray-900 mb-4">
                  Most Discussed Topics
                </h3>
                <div className="space-y-3">
                  {conversationAnalytics.topicAnalysis.keyTopics
                    .slice(0, 5)
                    .map((topic, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-700 capitalize">
                          {topic.topic}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{
                                width: `${Math.min(100, (topic.frequency / Math.max(...conversationAnalytics.topicAnalysis.keyTopics.map((t) => t.frequency))) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {topic.frequency}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === "insights" && (
            <div className="p-6 space-y-6">
              {/* Conversation Health Score */}
              {conversationHealth && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-medium text-gray-900 mb-4">
                    Conversation Health
                  </h3>
                  <div
                    className={`text-center p-6 rounded-lg border-2 ${getHealthColor(conversationHealth.overall)}`}
                  >
                    <div className="text-3xl font-bold mb-2">
                      {Math.round(conversationHealth.overall)}%
                    </div>
                    <div className="text-sm font-medium">
                      Overall Health Score
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {Object.entries(conversationHealth.factors).map(
                      ([key, factor]) => (
                        <div key={key} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {Math.round(factor.score)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full">
                            <div
                              className={`h-full rounded-full ${
                                factor.score >= 80
                                  ? "bg-green-500"
                                  : factor.score >= 60
                                    ? "bg-yellow-500"
                                    : factor.score >= 40
                                      ? "bg-orange-500"
                                      : "bg-red-500"
                              }`}
                              style={{ width: `${factor.score}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-600 mt-2">
                            {factor.details}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Insights List */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">
                  Generated Insights
                </h3>
                {insights.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">💡</div>
                    <p>
                      No insights available yet. More conversation data needed.
                    </p>
                  </div>
                ) : (
                  insights.map((insight, index) => (
                    <div key={index} className="bg-white border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {insight.type === "opportunity"
                              ? "🎯"
                              : insight.type === "risk"
                                ? "⚠️"
                                : insight.type === "pattern"
                                  ? "📈"
                                  : insight.type === "suggestion"
                                    ? "💡"
                                    : "🔍"}
                          </span>
                          <h4 className="font-medium text-gray-900">
                            {insight.title}
                          </h4>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            insight.priority === "urgent"
                              ? "bg-red-100 text-red-800"
                              : insight.priority === "high"
                                ? "bg-orange-100 text-orange-800"
                                : insight.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {insight.priority}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mb-4">
                        {insight.description}
                      </p>

                      {insight.suggestedActions &&
                        insight.suggestedActions.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-gray-900">
                              Suggested Actions:
                            </h5>
                            {insight.suggestedActions.map(
                              (action, actionIndex) => (
                                <div
                                  key={actionIndex}
                                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                                >
                                  <div>
                                    <div className="text-sm font-medium text-blue-900">
                                      {action.action}
                                    </div>
                                    <div className="text-xs text-blue-700">
                                      {action.description}
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    <span
                                      className={`px-2 py-1 text-xs rounded ${
                                        action.effort === "high"
                                          ? "bg-red-100 text-red-700"
                                          : action.effort === "medium"
                                            ? "bg-yellow-100 text-yellow-700"
                                            : "bg-green-100 text-green-700"
                                      }`}
                                    >
                                      {action.effort} effort
                                    </span>
                                    <span
                                      className={`px-2 py-1 text-xs rounded ${
                                        action.impact === "high"
                                          ? "bg-green-100 text-green-700"
                                          : action.impact === "medium"
                                            ? "bg-yellow-100 text-yellow-700"
                                            : "bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      {action.impact} impact
                                    </span>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === "schedule" && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-2">
                  Schedule Follow-ups
                </h3>
                <p className="text-sm text-gray-600">
                  Set up recurring follow-ups based on this conversation.
                </p>
              </div>

              {!showScheduler ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⏰</div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Schedule Recurring Follow-ups
                  </h4>
                  <p className="text-gray-600 mb-6">
                    Create automated follow-up reminders based on this
                    conversation.
                  </p>
                  <button
                    onClick={() => setShowScheduler(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Set Up Schedule
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <FrequencyScheduler
                    onRuleChange={handleScheduleFollowUp}
                    showPreview={true}
                  />
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowScheduler(false)}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Suggested Follow-up Times */}
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">
                  Smart Suggestions
                </h4>
                <div className="space-y-2">
                  <div className="text-sm text-blue-800">
                    Based on this conversation&apos;s urgency and your
                    communication patterns:
                  </div>
                  <ul className="text-sm text-blue-700 space-y-1 ml-4">
                    <li>• Follow up in 3 days for medium priority items</li>
                    <li>• Schedule weekly check-ins for ongoing projects</li>
                    <li>• Set reminders before important deadlines</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
