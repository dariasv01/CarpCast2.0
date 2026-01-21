// Componente para mostrar el índice de actividad de pesca
'use client';

import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ActivityScore } from '@/types';

interface ActivityScoreProps {
  score: ActivityScore;
  timestamp?: string;
  compact?: boolean;
}

export default function ActivityScoreDisplay({ score, timestamp, compact = false }: ActivityScoreProps) {
  const getScoreColor = (value: number) => {
    if (value >= 80) return 'text-green-600 border-green-500 bg-green-50';
    if (value >= 60) return 'text-blue-600 border-blue-500 bg-blue-50';
    if (value >= 40) return 'text-yellow-600 border-yellow-500 bg-yellow-50';
    return 'text-red-600 border-red-500 bg-red-50';
  };

  const getScoreGradient = (value: number) => {
    if (value >= 80) return 'from-green-400 to-green-600';
    if (value >= 60) return 'from-blue-400 to-blue-600';
    if (value >= 40) return 'from-yellow-400 to-yellow-600';
    return 'from-red-400 to-red-600';
  };

  const getScoreEmoji = (level: string) => {
    switch (level) {
      case 'excellent': return '🎣';
      case 'good': return '👍';
      case 'fair': return '🤔';
      case 'poor': return '😔';
      default: return '📊';
    }
  };

  const getLevelFromScore = (score: number): string => {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'excellent': return 'Excelente';
      case 'good': return 'Buena';
      case 'fair': return 'Regular';
      case 'poor': return 'Pobre';
      default: return 'Desconocida';
    }
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border-2 ${getScoreColor(score.overall)}`}>
        <span className="text-lg font-bold">{score.overall}</span>
        <span className="text-xs">{getLevelText(getLevelFromScore(score.overall))}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100">
      {/* Header with timestamp */}
      {timestamp && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              {new Date(timestamp).toLocaleTimeString('es', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {new Date(timestamp).toLocaleDateString('es', {
              weekday: 'short',
              day: 'numeric',
              month: 'short'
            })}
          </span>
        </div>
      )}

      {/* Score Display */}
      <div className="text-center mb-6">
        <div className="relative inline-block">
          {/* Circular Progress */}
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="transparent"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="url(#scoreGradient)"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - score.overall / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            {/* Gradient definition */}
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className={`${getScoreGradient(score.overall).split(' ')[0].replace('from-', 'stop-')}`} />
                <stop offset="100%" className={`${getScoreGradient(score.overall).split(' ')[1].replace('to-', 'stop-')}`} />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Score Text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-800">
                {score.overall}
              </div>
              <div className="text-sm text-gray-600">
                {getScoreEmoji(getLevelFromScore(score.overall))} {getLevelText(getLevelFromScore(score.overall))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Factors */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">
          Factores que Influyen
        </h4>
        <div className="space-y-2">
          {score.reasons.map((reason, index) => (
            <div key={index} className="flex items-center py-2 px-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600">
                  <TrendingUp className="w-3 h-3" />
                </div>
                <div className="text-sm text-gray-700">
                  {reason}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Best Windows */}
      {score.bestWindows && score.bestWindows.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Mejores Ventanas del Día
          </h4>
          <div className="space-y-2">
            {score.bestWindows.map((window, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-blue-700">
                    {new Date(window.start).toLocaleTimeString('es', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - {new Date(window.end).toLocaleTimeString('es', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <span className="text-sm font-semibold text-blue-600">
                  {window.score}/100
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}