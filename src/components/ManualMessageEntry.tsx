// src/components/ManualMessageEntry.tsx
"use client";

import { useState, useEffect } from "react";
import { Message } from "../types/client";

interface ManualMessage extends Omit<Message, "id" | "role"> {
  sender: "you" | "client";
}

interface ManualMessageEntryProps {
  onMessagesChange: (messages: Message[]) => void;
  clientName: string;
  userName: string;
  messageType?: Message["type"];
}

export default function ManualMessageEntry({
  onMessagesChange,
  clientName,
  userName,
  messageType = "email",
}: ManualMessageEntryProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState<Partial<ManualMessage>>({
    sender: "you",
    type: messageType,
    timestamp: new Date().toISOString(),
  });

  useEffect(() => {
    onMessagesChange(messages);
  }, [messages, onMessagesChange]);

  const handleAddMessage = () => {
    if (!currentMessage.content?.trim()) return;

    const newMessage: Message = {
      id: `msg_${Math.random().toString(36).substr(2, 9)}`,
      role: currentMessage.sender || "you",
      content: currentMessage.content.trim(),
      timestamp: currentMessage.timestamp || new Date().toISOString(),
      type: currentMessage.type || messageType || "email",
      metadata: currentMessage.metadata,
    };

    setMessages((prev) => [...prev, newMessage]);
    setCurrentMessage({
      sender: "you",
      type: messageType,
      timestamp: new Date().toISOString(),
    });
  };

  const handleRemoveMessage = (index: number) => {
    setMessages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.metaKey) {
      handleAddMessage();
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="space-y-6">
      {/* Message List */}
      {messages.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Messages</h3>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border relative group ${
                message.role === "you"
                  ? "bg-blue-50 border-blue-200"
                  : "bg-green-50 border-green-200"
              }`}
            >
              <button
                onClick={() => handleRemoveMessage(index)}
                className="absolute top-2 right-2 p-2 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                title="Remove message"
              >
                🗑️
              </button>
              <div className="flex items-center space-x-2 mb-2">
                <span
                  className={`px-2 py-1 rounded text-sm font-medium ${
                    message.role === "you"
                      ? "bg-blue-200 text-blue-800"
                      : "bg-green-200 text-green-800"
                  }`}
                >
                  {message.role === "you" ? userName : clientName}
                </span>
                <span className="text-sm text-gray-500">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
              <div className="text-gray-900 whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message Input */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4 mb-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sender
            </label>
            <select
              value={currentMessage.sender || "you"}
              onChange={(e) =>
                setCurrentMessage((prev) => ({
                  ...prev,
                  sender: e.target.value as "you" | "client",
                }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            >
              <option value="you">{userName}</option>
              <option value="client">{clientName}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timestamp
            </label>
            <input
              type="datetime-local"
              value={
                currentMessage.timestamp
                  ? new Date(currentMessage.timestamp)
                      .toISOString()
                      .slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                setCurrentMessage((prev) => ({
                  ...prev,
                  timestamp: new Date(e.target.value).toISOString(),
                }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            />
          </div>

          {messageType === "email" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={currentMessage.metadata?.subject || ""}
                onChange={(e) =>
                  setCurrentMessage((prev) => ({
                    ...prev,
                    metadata: { ...prev.metadata, subject: e.target.value },
                  }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                placeholder="Email subject"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message Content
          </label>
          <textarea
            value={currentMessage.content || ""}
            onChange={(e) =>
              setCurrentMessage((prev) => ({
                ...prev,
                content: e.target.value,
              }))
            }
            onKeyDown={handleKeyDown}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            placeholder="Type your message here... (⌘+Enter to add)"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleAddMessage}
            disabled={!currentMessage.content?.trim()}
            className={`px-4 py-2 rounded-lg ${
              currentMessage.content?.trim()
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Add Message
          </button>
        </div>
      </div>
    </div>
  );
}
