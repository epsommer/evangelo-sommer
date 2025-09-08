"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ServiceAnalysisResponse } from '@/app/api/clients/[clientId]/analyze-services/route';
import { DetectedService, ServiceRecommendation } from '@/lib/service-detection';

interface ServiceAnalysisDemoProps {
  clientId: string;
  clientName: string;
}

const ServiceAnalysisDemo: React.FC<ServiceAnalysisDemoProps> = ({
  clientId,
  clientName
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<ServiceAnalysisResponse['data'] | null>(null);
  const [error, setError] = useState<string>('');

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError('');
    
    try {
      const response = await fetch(`/api/clients/${clientId}/analyze-services`);
      const data: ServiceAnalysisResponse = await response.json();
      
      if (data.success && data.data) {
        setAnalysisResults(data.data);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyRecommendations = async (servicesToAdd: string[]) => {
    setIsUpdating(true);
    setError('');
    
    try {
      const response = await fetch(`/api/clients/${clientId}/analyze-services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          servicesToAdd,
          autoApply: true
        })
      });
      
      const data: ServiceAnalysisResponse = await response.json();
      
      if (data.success) {
        // Refresh analysis to show updated state
        await runAnalysis();
      } else {
        setError(data.error || 'Update failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-300';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <Card className="p-6 bg-white border-2 border-light-grey">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-dark-grey uppercase tracking-wide font-space-grotesk mb-2">
          🔍 Service Analysis Demo
        </h3>
        <p className="text-medium-grey font-space-grotesk">
          Analyze conversation history to detect additional services mentioned by {clientName}
        </p>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-6">
        <Button
          onClick={runAnalysis}
          disabled={isAnalyzing || isUpdating}
          className="bg-gold text-dark-grey hover:bg-gold-light font-space-grotesk"
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-grey mr-2"></div>
              ANALYZING...
            </>
          ) : (
            'ANALYZE CONVERSATIONS'
          )}
        </Button>

        {analysisResults?.analysisResults.recommendations.length > 0 && (
          <Button
            onClick={() => {
              const servicesToAdd = analysisResults.analysisResults.recommendations
                .filter(r => r.recommendedAction === 'HIGH_CONFIDENCE_ADD')
                .map(r => r.serviceType);
              if (servicesToAdd.length > 0) {
                applyRecommendations(servicesToAdd);
              }
            }}
            disabled={isAnalyzing || isUpdating}
            className="bg-green-600 text-white hover:bg-green-700 font-space-grotesk"
          >
            {isUpdating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                UPDATING...
              </>
            ) : (
              'APPLY HIGH-CONFIDENCE RECOMMENDATIONS'
            )}
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded">
          <p className="text-red-700 font-space-grotesk text-sm">{error}</p>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResults && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-off-white border border-light-grey rounded">
              <div className="text-2xl font-bold text-dark-grey font-space-grotesk">
                {analysisResults.analysisResults.totalMessages}
              </div>
              <div className="text-xs text-medium-grey font-space-grotesk uppercase">
                Messages Analyzed
              </div>
            </div>
            <div className="text-center p-4 bg-off-white border border-light-grey rounded">
              <div className="text-2xl font-bold text-blue-600 font-space-grotesk">
                {analysisResults.analysisResults.detectedServices.length}
              </div>
              <div className="text-xs text-medium-grey font-space-grotesk uppercase">
                Services Detected
              </div>
            </div>
            <div className="text-center p-4 bg-off-white border border-light-grey rounded">
              <div className="text-2xl font-bold text-orange-600 font-space-grotesk">
                {analysisResults.analysisResults.newServices.length}
              </div>
              <div className="text-xs text-medium-grey font-space-grotesk uppercase">
                New Services
              </div>
            </div>
            <div className="text-center p-4 bg-off-white border border-light-grey rounded">
              <div className="text-2xl font-bold text-green-600 font-space-grotesk">
                {analysisResults.analysisResults.recommendations.length}
              </div>
              <div className="text-xs text-medium-grey font-space-grotesk uppercase">
                Recommendations
              </div>
            </div>
          </div>

          {/* Detected Services */}
          {analysisResults.analysisResults.detectedServices.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-dark-grey font-space-grotesk mb-4 uppercase tracking-wide">
                🔍 Detected Services
              </h4>
              <div className="space-y-3">
                {analysisResults.analysisResults.detectedServices.map((service, index) => (
                  <div key={index} className="p-4 border border-light-grey rounded bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-bold text-dark-grey font-space-grotesk">
                        {service.serviceName}
                      </h5>
                      <Badge className={`${getConfidenceColor(service.confidence)} border`}>
                        {getConfidenceLabel(service.confidence)} ({(service.confidence * 100).toFixed(1)}%)
                      </Badge>
                    </div>
                    <p className="text-sm text-medium-grey mb-2">
                      <strong>Mentions:</strong> {service.mentions.length}
                    </p>
                    {service.frequency && (
                      <p className="text-sm text-medium-grey mb-2">
                        <strong>Frequency:</strong> {service.frequency.pattern}
                      </p>
                    )}
                    <div className="space-y-2">
                      <p className="text-xs text-dark-grey font-space-grotesk uppercase tracking-wide">
                        Evidence:
                      </p>
                      {service.mentions.slice(0, 2).map((mention, mentionIndex) => (
                        <div key={mentionIndex} className="bg-gray-50 p-2 rounded text-xs">
                          <p className="font-medium text-blue-600">
                            Keywords: {mention.matchedKeywords.join(', ')}
                          </p>
                          <p className="text-gray-700 mt-1">{mention.context}</p>
                        </div>
                      ))}
                      {service.mentions.length > 2 && (
                        <p className="text-xs text-gray-500">
                          +{service.mentions.length - 2} more mentions
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Services & Recommendations */}
          {analysisResults.analysisResults.newServices.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-dark-grey font-space-grotesk mb-4 uppercase tracking-wide">
                ✨ New Services Found
              </h4>
              <div className="space-y-3">
                {analysisResults.analysisResults.newServices.map((service, index) => (
                  <div key={index} className="p-4 border-2 border-orange-200 bg-orange-50 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-bold text-orange-800 font-space-grotesk">
                        {service.serviceName}
                      </h5>
                      <Badge className="bg-orange-200 text-orange-800 border-orange-300">
                        NEW
                      </Badge>
                    </div>
                    <p className="text-sm text-orange-700">
                      This service was detected in conversations but is not currently in {clientName}'s profile.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Services */}
          <div>
            <h4 className="text-lg font-bold text-dark-grey font-space-grotesk mb-4 uppercase tracking-wide">
              📋 Current Service Profile
            </h4>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded">
              {analysisResults.analysisResults.currentServices.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {analysisResults.analysisResults.currentServices.map((service, index) => (
                    <Badge key={index} className="bg-blue-100 text-blue-800 border-blue-300">
                      {service}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 font-space-grotesk">
                  No services currently in profile
                </p>
              )}
            </div>
          </div>

          {/* Special Snow Removal Alert */}
          {analysisResults.analysisResults.detectedServices.some(s => s.serviceType === 'SNOW_REMOVAL') && (
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">❄️</span>
                <h4 className="font-bold text-blue-800 font-space-grotesk uppercase">
                  Snow Removal Service Detected!
                </h4>
              </div>
              <p className="text-blue-700 text-sm">
                The system detected mentions of "White Knight Snow Removal" and other snow-related services 
                in {clientName}'s conversation history. This matches the user feedback about missing snow removal services.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!analysisResults && !isAnalyzing && (
        <div className="text-center p-8 bg-gray-50 border border-gray-200 rounded">
          <p className="text-medium-grey font-space-grotesk mb-4">
            Click "Analyze Conversations" to scan {clientName}'s message history for service mentions.
          </p>
          <p className="text-sm text-gray-500 font-space-grotesk">
            The system will identify services like "White Knight Snow Removal" mentioned in conversations
            and recommend adding them to the client's service profile.
          </p>
        </div>
      )}
    </Card>
  );
};

export default ServiceAnalysisDemo;