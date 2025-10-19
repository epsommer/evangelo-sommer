"use client";

import { useMemo, useState } from 'react';
import { Brain, Target, TrendingUp, AlertTriangle, CheckCircle2, Clock, Users, Zap } from 'lucide-react';
import { Conversation, Client, Message } from '../types/client';
import { Button } from './ui/button';

interface SidebarInsightsProps {
  conversation: Conversation;
  client: Client;
}

interface Insight {
  type: 'opportunity' | 'concern' | 'success' | 'action';
  title: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  actionable: boolean;
  relatedMessages?: Message[]; // Messages that triggered this insight
  evidence?: string[]; // Specific evidence/quotes from messages
}

export default function SidebarInsights({ conversation, client }: SidebarInsightsProps) {
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  const insights = useMemo((): Insight[] => {
    const messages = conversation.messages || [];
    const insights: Insight[] = [];

    // Sort messages by timestamp
    const sortedMessages = [...messages].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Analyze response time patterns (case-insensitive)
    const responseTimes: number[] = [];
    let lastClientMessage: Message | null = null;

    sortedMessages.forEach((message) => {
      const role = message.role?.toLowerCase();
      if (role === 'client') {
        lastClientMessage = message;
      } else if (role === 'you' && lastClientMessage) {
        const responseTime = new Date(message.timestamp).getTime() - new Date(lastClientMessage.timestamp).getTime();
        responseTimes.push(responseTime / (1000 * 60 * 60)); // Convert to hours
        lastClientMessage = null;
      }
    });

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Response time insights
    if (avgResponseTime > 24) {
      insights.push({
        type: 'concern',
        title: 'Slow Response Times',
        description: `Average response time is ${Math.round(avgResponseTime)}h. Consider setting up auto-responses or faster notification systems.`,
        confidence: 'high',
        priority: 'high',
        actionable: true
      });
    } else if (avgResponseTime < 2) {
      insights.push({
        type: 'success',
        title: 'Excellent Response Times',
        description: `Lightning-fast ${Math.round(avgResponseTime * 60)}min average response time is exceeding client expectations.`,
        confidence: 'high',
        priority: 'low',
        actionable: false
      });
    }

    // Note: Urgent message handling now done through sentiment analysis below

    // Conversation momentum
    const recentMessages = messages.filter(m => {
      const messageTime = new Date(m.timestamp);
      const daysSince = (Date.now() - messageTime.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 7;
    });

    if (recentMessages.length === 0 && messages.length > 0) {
      insights.push({
        type: 'opportunity',
        title: 'Conversation Going Cold',
        description: 'No activity in the last week. Consider sending a follow-up message to re-engage the client.',
        confidence: 'medium',
        priority: 'medium',
        actionable: true
      });
    } else if (recentMessages.length > 5) {
      insights.push({
        type: 'success',
        title: 'High Engagement',
        description: `${recentMessages.length} messages this week shows strong client engagement. Great momentum!`,
        confidence: 'high',
        priority: 'low',
        actionable: false
      });
    }

    // Message complexity analysis
    const longMessages = messages.filter(m => m.content.length > 500);
    if (longMessages.length > messages.length * 0.3) {
      insights.push({
        type: 'concern',
        title: 'Complex Communications',
        description: 'Many lengthy messages detected. Consider breaking down complex topics or scheduling a call.',
        confidence: 'medium',
        priority: 'medium',
        actionable: true
      });
    }

    // Client initiative analysis (case-insensitive)
    const clientMessages = messages.filter(m => m.role?.toLowerCase() === 'client');
    const yourMessages = messages.filter(m => m.role?.toLowerCase() === 'you');

    if (clientMessages.length > yourMessages.length * 1.5) {
      insights.push({
        type: 'opportunity',
        title: 'Client is Highly Proactive',
        description: 'Client is initiating most conversations. This shows strong interest - consider proposing additional services.',
        confidence: 'high',
        priority: 'high',
        actionable: true
      });
    } else if (yourMessages.length > clientMessages.length * 2) {
      insights.push({
        type: 'concern',
        title: 'Low Client Engagement',
        description: 'You are sending most messages. Client may be losing interest - consider a direct follow-up call.',
        confidence: 'medium',
        priority: 'high',
        actionable: true
      });
    }

    // Sentiment analysis based on keywords
    const positiveKeywords = ['great', 'excellent', 'perfect', 'love', 'wonderful', 'amazing', 'thanks', 'appreciate', 'happy', 'satisfied'];
    const negativeKeywords = ['problem', 'issue', 'concern', 'worried', 'unhappy', 'disappointed', 'frustrated', 'confused', 'delay', 'late'];
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'now', 'today'];

    const positiveMessages: Message[] = [];
    const negativeMessages: Message[] = [];
    const urgentMessages: Message[] = [];
    const positiveEvidence: string[] = [];
    const negativeEvidence: string[] = [];
    const urgentEvidence: string[] = [];

    clientMessages.forEach(message => {
      const content = message.content.toLowerCase();
      let foundPositive = false;
      let foundNegative = false;
      let foundUrgent = false;

      positiveKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          foundPositive = true;
          // Extract sentence containing keyword
          const sentences = message.content.split(/[.!?]/);
          const relevantSentence = sentences.find(s => s.toLowerCase().includes(keyword));
          if (relevantSentence && !positiveEvidence.includes(relevantSentence.trim())) {
            positiveEvidence.push(relevantSentence.trim());
          }
        }
      });

      negativeKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          foundNegative = true;
          const sentences = message.content.split(/[.!?]/);
          const relevantSentence = sentences.find(s => s.toLowerCase().includes(keyword));
          if (relevantSentence && !negativeEvidence.includes(relevantSentence.trim())) {
            negativeEvidence.push(relevantSentence.trim());
          }
        }
      });

      urgentKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          foundUrgent = true;
          const sentences = message.content.split(/[.!?]/);
          const relevantSentence = sentences.find(s => s.toLowerCase().includes(keyword));
          if (relevantSentence && !urgentEvidence.includes(relevantSentence.trim())) {
            urgentEvidence.push(relevantSentence.trim());
          }
        }
      });

      if (foundPositive) positiveMessages.push(message);
      if (foundNegative) negativeMessages.push(message);
      if (foundUrgent) urgentMessages.push(message);
    });

    // Sentiment insights
    if (positiveMessages.length > 3) {
      insights.push({
        type: 'success',
        title: 'Positive Client Sentiment',
        description: `Client has expressed positive sentiment ${positiveMessages.length} times. Great opportunity to request a testimonial or referral!`,
        confidence: 'high',
        priority: 'medium',
        actionable: true,
        relatedMessages: positiveMessages.slice(0, 5),
        evidence: positiveEvidence.slice(0, 3)
      });
    }

    if (negativeMessages.length > 2) {
      insights.push({
        type: 'concern',
        title: 'Negative Sentiment Detected',
        description: `Client has expressed concerns ${negativeMessages.length} times. Address these issues promptly to maintain relationship.`,
        confidence: 'high',
        priority: 'urgent',
        actionable: true,
        relatedMessages: negativeMessages.slice(0, 5),
        evidence: negativeEvidence.slice(0, 3)
      });
    }

    if (urgentMessages.length > 0) {
      insights.push({
        type: 'action',
        title: 'Urgent Language Detected',
        description: `Client used urgent language ${urgentMessages.length} time(s). Immediate response required.`,
        confidence: 'high',
        priority: 'urgent',
        actionable: true,
        relatedMessages: urgentMessages,
        evidence: urgentEvidence.slice(0, 3)
      });
    }

    // Question analysis
    const questionMessages = clientMessages.filter(m => m.content.includes('?'));
    const questionEvidence = questionMessages.map(m => {
      const sentences = m.content.split(/[.!?]/);
      return sentences.find(s => s.includes('?'))?.trim() + '?';
    }).filter(Boolean) as string[];

    const unansweredQuestions = questionMessages.length - yourMessages.filter(m => {
      const yourContent = m.content.toLowerCase();
      return yourContent.includes('answer') || yourContent.includes('yes') || yourContent.includes('no');
    }).length;

    if (unansweredQuestions > 2) {
      insights.push({
        type: 'action',
        title: 'Unanswered Questions',
        description: `${unansweredQuestions} client questions may need explicit answers. Review and respond thoroughly.`,
        confidence: 'medium',
        priority: 'high',
        actionable: true,
        relatedMessages: questionMessages.slice(0, 5),
        evidence: questionEvidence.slice(0, 3)
      });
    }

    // Conversation frequency analysis
    if (sortedMessages.length > 0) {
      const firstMsg = new Date(sortedMessages[0].timestamp);
      const lastMsg = new Date(sortedMessages[sortedMessages.length - 1].timestamp);
      const daysDiff = (lastMsg.getTime() - firstMsg.getTime()) / (1000 * 60 * 60 * 24);
      const messagesPerDay = messages.length / Math.max(daysDiff, 1);

      if (messagesPerDay > 5) {
        insights.push({
          type: 'success',
          title: 'High Communication Frequency',
          description: `${messagesPerDay.toFixed(1)} messages per day shows active engagement. Project is moving forward quickly.`,
          confidence: 'high',
          priority: 'low',
          actionable: false
        });
      } else if (messagesPerDay < 0.5 && messages.length > 5) {
        insights.push({
          type: 'opportunity',
          title: 'Slow Communication Pace',
          description: 'Less than 1 message every 2 days. Consider establishing regular check-ins to maintain momentum.',
          confidence: 'medium',
          priority: 'medium',
          actionable: true
        });
      }
    }

    // Time of day patterns
    const messageHours = messages.map(m => new Date(m.timestamp).getHours());
    const afterHoursMessages = messageHours.filter(h => h < 8 || h > 18).length;

    if (afterHoursMessages > messages.length * 0.4) {
      insights.push({
        type: 'concern',
        title: 'After-Hours Communication Pattern',
        description: `${Math.round((afterHoursMessages / messages.length) * 100)}% of messages outside business hours. Consider setting boundaries or auto-responses.`,
        confidence: 'medium',
        priority: 'medium',
        actionable: true
      });
    }

    // Next actions analysis
    if (conversation.nextActions && conversation.nextActions.length > 0) {
      insights.push({
        type: 'action',
        title: 'Pending Action Items',
        description: `${conversation.nextActions.length} action item${conversation.nextActions.length > 1 ? 's' : ''} identified. Review and prioritize for follow-up.`,
        confidence: 'high',
        priority: 'medium',
        actionable: true
      });
    }

    // Service opportunity detection
    const serviceKeywords = ['help', 'need', 'support', 'advice', 'guidance', 'consultation'];
    const serviceMessages = messages.filter(m => 
      m.role === 'client' && 
      serviceKeywords.some(keyword => m.content.toLowerCase().includes(keyword))
    );

    if (serviceMessages.length > 2) {
      insights.push({
        type: 'opportunity',
        title: 'Service Opportunity Detected',
        description: 'Multiple requests for help/advice detected. Consider proposing a formal service engagement.',
        confidence: 'medium',
        priority: 'high',
        actionable: true
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [conversation, client]);

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity':
        return <TrendingUp className="w-4 h-4" />;
      case 'concern':
        return <AlertTriangle className="w-4 h-4" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'action':
        return <Target className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getInsightColors = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity':
        return {
          bg: 'bg-tactical-gold-muted',
          border: 'border-tactical-grey-300',
          text: 'text-tactical-brown-dark',
          icon: 'text-tactical-gold'
        };
      case 'concern':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: 'text-red-600'
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          icon: 'text-green-600'
        };
      case 'action':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-700',
          icon: 'text-orange-600'
        };
      default:
        return {
          bg: 'bg-tactical-grey-100',
          border: 'border-tactical-grey-300',
          text: 'text-tactical-grey-600',
          icon: 'text-tactical-grey-500'
        };
    }
  };

  const getPriorityBadge = (priority: Insight['priority']) => {
    const configs = {
      urgent: { bg: 'bg-red-100', text: 'text-red-800', label: 'URGENT' },
      high: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'HIGH' },
      medium: { bg: 'bg-tactical-gold-light', text: 'text-hud-text-primary', label: 'MEDIUM' },
      low: { bg: 'bg-tactical-grey-200', text: 'text-tactical-grey-500', label: 'LOW' }
    };
    
    const config = configs[priority];
    return (
      <span className={`px-2 py-1 text-xs font-bold font-primary uppercase tracking-wide ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getConfidenceBadge = (confidence: Insight['confidence']) => {
    const configs = {
      high: { bg: 'bg-green-100', text: 'text-green-800', icon: '🎯' },
      medium: { bg: 'bg-tactical-gold-light', text: 'text-hud-text-primary', icon: '📊' },
      low: { bg: 'bg-tactical-grey-200', text: 'text-tactical-grey-500', icon: '🤔' }
    };
    
    const config = configs[confidence];
    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-primary ${config.bg} ${config.text}`}>
        <span>{config.icon}</span>
        <span>{confidence} confidence</span>
      </span>
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide">
          AI Insights
        </h3>
        <div className="flex items-center space-x-2">
          <Brain className="w-4 h-4 text-purple-600" />
          <span className="text-xs text-medium-grey">{insights.length} insights</span>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-medium-grey mx-auto mb-3" />
            <p className="text-sm text-medium-grey font-primary">
              No insights available yet.
            </p>
            <p className="text-xs text-medium-grey mt-1">
              Continue the conversation to generate AI-powered insights.
            </p>
          </div>
        ) : (
          insights.map((insight, index) => {
            const colors = getInsightColors(insight.type);
            const isExpanded = expandedInsight === index;
            
            return (
              <div
                key={index}
                className={`border-2 ${colors.border} ${colors.bg} transition-all duration-200 hover:shadow-sm`}
              >
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => setExpandedInsight(isExpanded ? null : index)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={colors.icon}>
                        {getInsightIcon(insight.type)}
                      </div>
                      <h4 className={`font-primary font-bold text-sm ${colors.text}`}>
                        {insight.title}
                      </h4>
                    </div>
                    {getPriorityBadge(insight.priority)}
                  </div>
                  
                  <p className={`text-sm ${colors.text} mb-3`}>
                    {insight.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    {getConfidenceBadge(insight.confidence)}
                    
                    {insight.actionable && (
                      <span className="text-xs text-medium-grey font-primary">
                        Actionable
                      </span>
                    )}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="border-t border-current border-opacity-20 p-3 bg-white bg-opacity-50">
                    {/* Evidence Section */}
                    {insight.evidence && insight.evidence.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-xs font-primary font-bold uppercase tracking-wide text-hud-text-primary mb-2">
                          Evidence
                        </h5>
                        <div className="space-y-2">
                          {insight.evidence.map((evidence, idx) => (
                            <div key={idx} className="p-2 bg-tactical-grey-100 border-l-2 border-tactical-gold">
                              <p className="text-xs text-tactical-grey-700 italic">
                                "{evidence}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Related Messages */}
                    {insight.relatedMessages && insight.relatedMessages.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-xs font-primary font-bold uppercase tracking-wide text-hud-text-primary mb-2">
                          Related Messages ({insight.relatedMessages.length})
                        </h5>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {insight.relatedMessages.map((msg) => (
                            <button
                              key={msg.id}
                              onClick={() => {
                                // Scroll to message in main timeline
                                const messageElement = document.getElementById(`message-${msg.id}`);
                                if (messageElement) {
                                  messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  messageElement.classList.add('highlight-flash');
                                  setTimeout(() => messageElement.classList.remove('highlight-flash'), 2000);
                                }
                              }}
                              className="w-full text-left p-2 bg-tactical-grey-50 hover:bg-tactical-gold-muted border border-tactical-grey-300 hover:border-tactical-gold transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-tactical-grey-600">
                                  {new Date(msg.timestamp).toLocaleDateString()} {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-xs text-tactical-gold">→</span>
                              </div>
                              <p className="text-xs text-tactical-grey-700 mt-1 truncate">
                                {msg.content.slice(0, 60)}{msg.content.length > 60 ? '...' : ''}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested Actions */}
                    {insight.actionable && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-primary font-bold uppercase tracking-wide text-hud-text-primary">
                          Suggested Actions
                        </h5>

                        <div className="space-y-1">
                          {insight.type === 'opportunity' && (
                            <>
                              <Button size="sm" variant="outline" className="w-full justify-start text-xs">
                                <Target className="w-3 h-3 mr-2" />
                                Create Follow-up Task
                              </Button>
                              <Button size="sm" variant="outline" className="w-full justify-start text-xs">
                                <Users className="w-3 h-3 mr-2" />
                                Schedule Client Call
                              </Button>
                            </>
                          )}

                          {insight.type === 'concern' && (
                            <>
                              <Button size="sm" variant="outline" className="w-full justify-start text-xs">
                                <AlertTriangle className="w-3 h-3 mr-2" />
                                Set Response Reminder
                              </Button>
                              <Button size="sm" variant="outline" className="w-full justify-start text-xs">
                                <Clock className="w-3 h-3 mr-2" />
                                Review Process
                              </Button>
                            </>
                          )}

                          {insight.type === 'action' && (
                            <>
                              <Button size="sm" variant="outline" className="w-full justify-start text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-2" />
                                Review Action Items
                              </Button>
                              <Button size="sm" variant="outline" className="w-full justify-start text-xs">
                                <Zap className="w-3 h-3 mr-2" />
                                Send Update
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Next Actions from Conversation */}
      {conversation.nextActions && conversation.nextActions.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide text-sm">
            Identified Next Actions
          </h4>
          
          <div className="space-y-2">
            {conversation.nextActions.map((action, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 bg-tactical-gold-light border border-hud-border-accent"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 border-2 border-hud-border-accent text-gold focus:ring-gold"
                />
                <span className="text-sm text-hud-text-primary font-primary flex-1">
                  {action}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}