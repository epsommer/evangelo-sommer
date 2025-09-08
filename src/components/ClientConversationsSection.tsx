"use client"

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { MessageSquare, Phone, Mail, Video, MapPin, Clock, Plus, Edit, Trash2, Tag, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Conversation, Message } from '@/types/client'
import { Client } from '@/types/client'
import { useConversations } from '@/hooks/useConversations'
import MessageImporter from './MessageImporter'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ClientConversationsSectionProps {
  clientId: string
  client: Client
}

const ClientConversationsSection: React.FC<ClientConversationsSectionProps> = ({ clientId, client }) => {
  const router = useRouter()
  const { conversations, loading, error, addConversation, updateConversation, deleteConversation, addMessage } = useConversations(clientId)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingConversation, setEditingConversation] = useState<Conversation | null>(null)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)


  const getStatusColor = (status: Conversation['status']) => {
    const colors = {
      active: 'bg-gold text-dark-grey',
      resolved: 'bg-green-600 text-white',
      archived: 'bg-medium-grey text-white',
      pending: 'bg-yellow-600 text-white'
    }
    return colors[status || 'active']
  }

  const getPriorityColor = (priority: Conversation['priority']) => {
    const colors = {
      low: 'bg-light-grey text-medium-grey',
      medium: 'bg-gold text-dark-grey',
      high: 'bg-dark-grey text-white',
      urgent: 'bg-red-600 text-white'
    }
    return colors[priority || 'medium']
  }

  const getMessageTypeIcon = (type: Message['type']) => {
    const icons = {
      'call-notes': <Phone className="h-4 w-4" />,
      'email': <Mail className="h-4 w-4" />,
      'text': <MessageSquare className="h-4 w-4" />,
      'meeting-notes': <MapPin className="h-4 w-4" />,
      'voice-memo': <Video className="h-4 w-4" />,
      'file-upload': <Tag className="h-4 w-4" />
    }
    return icons[type] || <MessageSquare className="h-4 w-4" />
  }

  const handleDeleteConversation = async (conversationId: string) => {
    if (confirm('Are you sure you want to delete this conversation?')) {
      try {
        await deleteConversation(conversationId)
      } catch (error) {
        console.error('Failed to delete conversation:', error)
        alert('Failed to delete conversation. Please try again.')
      }
    }
  }

  const handleAddMessage = async (conversationId: string, content: string, type: Message['type'] = 'text') => {
    try {
      await addMessage(conversationId, {
        role: 'you',
        content: content.trim(),
        type: type,
        timestamp: new Date().toISOString(),
        metadata: {}
      })
    } catch (error) {
      console.error('Failed to add message:', error)
      alert('Failed to add message. Please try again.')
    }
  }

  return (
    <Card className="bg-white border-2 border-light-grey p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-dark-grey uppercase tracking-wide font-space-grotesk">
          CONVERSATIONS WITH {client.name.toUpperCase()}
        </h2>
        <div className="flex items-center space-x-2">
          <Link 
            href={`/conversations?client=${clientId}`}
            className="bg-white border-2 border-gold text-gold px-4 py-2 font-bold uppercase text-sm tracking-wide hover:bg-gold hover:text-dark-grey cursor-pointer transition-colors"
          >
            VIEW ALL
          </Link>
          <Button 
            className="bg-gold text-dark-grey px-4 py-2 font-bold uppercase text-sm tracking-wide hover:bg-gold-light cursor-pointer"
            onClick={() => router.push(`/conversations/create?client=${clientId}`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            ADD CONVERSATION
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-2 border-red-600 text-red-700 p-4 mb-4">
          <div className="font-bold font-space-grotesk uppercase tracking-wide">ERROR</div>
          <div className="text-sm font-space-grotesk">{error}</div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-medium-grey font-space-grotesk uppercase tracking-wide">LOADING CONVERSATIONS...</p>
        </div>
      )}

      {/* Conversations List */}
      {!loading && (
        <div className="space-y-4">
          {conversations.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-light-grey" />
            <h3 className="text-lg font-bold text-dark-grey mb-2 font-space-grotesk uppercase tracking-wide">
              NO CONVERSATIONS YET
            </h3>
            <p className="text-medium-grey font-space-grotesk mb-4">
              START A CONVERSATION TO TRACK COMMUNICATIONS WITH THIS CLIENT.
            </p>
            <Button
              className="bg-gold text-dark-grey hover:bg-gold-light font-space-grotesk text-sm uppercase tracking-wide"
              onClick={() => router.push(`/conversations/create?client=${clientId}`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              START CONVERSATION
            </Button>
          </div>
        ) : (
          conversations.map(conversation => (
            <ConversationItem 
              key={conversation.id}
              conversation={conversation}
              onEdit={setEditingConversation}
              onDelete={handleDeleteConversation}
              onAddMessage={(conv) => {
                setSelectedConversation(conv)
                setShowMessageModal(true)
              }}
              getStatusColor={getStatusColor}
              getPriorityColor={getPriorityColor}
              getMessageTypeIcon={getMessageTypeIcon}
            />
          ))
          )}
        </div>
      )}

      {/* Add/Edit Conversation Modal */}
      <ConversationModal 
        isOpen={showAddModal || editingConversation !== null}
        conversation={editingConversation}
        clientId={clientId}
        client={client}
        onClose={() => {
          setShowAddModal(false)
          setEditingConversation(null)
        }}
        onSave={async (conversationData) => {
          try {
            if (editingConversation) {
              await updateConversation(editingConversation.id, conversationData)
            } else {
              await addConversation(conversationData)
            }
            setShowAddModal(false)
            setEditingConversation(null)
          } catch (error) {
            console.error('Failed to save conversation:', error)
            alert('Failed to save conversation. Please try again.')
          }
        }}
      />

      {/* Add Message Modal */}
      <MessageModal 
        isOpen={showMessageModal}
        conversation={selectedConversation}
        onClose={() => {
          setShowMessageModal(false)
          setSelectedConversation(null)
        }}
        onSave={(messageData) => {
          if (selectedConversation) {
            handleAddMessage(selectedConversation.id, messageData)
          }
          setShowMessageModal(false)
          setSelectedConversation(null)
        }}
      />
    </Card>
  )
}

interface ConversationItemProps {
  conversation: Conversation
  onEdit: (conversation: Conversation) => void
  onDelete: (conversationId: string) => void
  onAddMessage: (conversation: Conversation) => void
  getStatusColor: (status: Conversation['status']) => string
  getPriorityColor: (priority: Conversation['priority']) => string
  getMessageTypeIcon: (type: Message['type']) => React.ReactNode
}

const ConversationItem: React.FC<ConversationItemProps> = ({ 
  conversation, 
  onEdit, 
  onDelete, 
  onAddMessage,
  getStatusColor,
  getPriorityColor,
  getMessageTypeIcon
}) => {
  const lastMessage = conversation.messages[conversation.messages.length - 1]

  return (
    <Link href={`/conversations/${conversation.id}`}>
      <Card className="border-2 border-light-grey p-4 hover:border-gold transition-colors cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <h4 className="font-bold text-dark-grey font-space-grotesk">
              {(conversation.title || 'Untitled Conversation').toUpperCase()}
            </h4>
            <Badge className={`${getStatusColor(conversation.status)} text-xs font-bold uppercase tracking-wide`}>
              {conversation.status || 'active'}
            </Badge>
            <Badge className={`${getPriorityColor(conversation.priority)} text-xs font-bold uppercase tracking-wide`}>
              {conversation.priority || 'medium'}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2" onClick={(e) => e.preventDefault()}>
            <Button
              size="sm"
              variant="outline"
              className="text-xs bg-gold text-dark-grey px-2 py-1 font-bold uppercase hover:bg-gold-light cursor-pointer border-gold"
              onClick={(e) => {
                e.stopPropagation()
                onAddMessage(conversation)
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              MESSAGE
            </Button>
            <Button 
              size="sm"
              variant="outline"
              className="text-xs bg-white text-dark-grey px-2 py-1 font-bold uppercase hover:bg-light-grey cursor-pointer border-light-grey"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(conversation)
              }}
            >
              <Edit className="h-3 w-3 mr-1" />
              EDIT
            </Button>
            <Button 
              size="sm"
              variant="outline"
              className="text-xs bg-red-600 text-white px-2 py-1 font-bold uppercase hover:bg-red-700 cursor-pointer border-red-600"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(conversation.id)
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              DELETE
            </Button>
          </div>
        </div>
        
        {/* Messages Preview */}
        <div className="space-y-2 mb-3">
          {conversation.messages.slice(-2).map(message => (
            <MessageItem 
              key={message.id}
              message={message}
              getMessageTypeIcon={getMessageTypeIcon}
            />
          ))}
        </div>

        {/* Conversation Meta */}
        <div className="flex items-center justify-between text-xs text-medium-grey font-space-grotesk">
          <div className="flex items-center space-x-4">
            <span>{conversation.messages.length} MESSAGES</span>
            <span>LAST: {format(new Date(conversation.updatedAt), 'MMM dd, HH:mm').toUpperCase()}</span>
            {conversation.source && (
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span>{conversation.source.toUpperCase()}</span>
              </div>
            )}
          </div>
          
          {conversation.tags && conversation.tags.length > 0 && (
            <div className="flex items-center space-x-1">
              <Tag className="h-3 w-3" />
              <span>{conversation.tags.join(', ').toUpperCase()}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}

interface MessageItemProps {
  message: Message
  getMessageTypeIcon: (type: Message['type']) => React.ReactNode
}

const MessageItem: React.FC<MessageItemProps> = ({ message, getMessageTypeIcon }) => (
  <div className={`flex items-start space-x-3 p-2 ${
    (message.role === 'client' || message.role === 'CLIENT') ? 'bg-off-white' : 'bg-gold-light'
  }`}>
    <div className="flex items-center space-x-2">
      {getMessageTypeIcon(message.type)}
      <Badge className={`text-xs font-bold uppercase ${
        (message.role === 'client' || message.role === 'CLIENT') ? 'bg-medium-grey text-white' : 'bg-gold text-dark-grey'
      }`}>
        {(message.role === 'client' || message.role === 'CLIENT') ? 'CLIENT' : 'YOU'}
      </Badge>
    </div>
    <div className="flex-1">
      <p className="text-sm text-dark-grey font-space-grotesk">
        {message.content}
      </p>
      <div className="flex items-center space-x-2 text-xs text-medium-grey font-space-grotesk mt-1">
        <Clock className="h-3 w-3" />
        <span>{format(new Date(message.timestamp), 'MMM dd, HH:mm').toUpperCase()}</span>
        {message.metadata?.duration && (
          <span>• {message.metadata.duration}MIN</span>
        )}
      </div>
    </div>
  </div>
)

// Functional conversation modal
const ConversationModal: React.FC<{
  isOpen: boolean
  conversation: Conversation | null
  clientId: string
  client: Client
  onClose: () => void
  onSave: (data: Conversation) => void
}> = ({ isOpen, conversation, clientId, client, onClose, onSave }) => {
  const [creationType, setCreationType] = useState<'manual' | 'import'>('manual')
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Conversation['priority']>('medium')
  const [status, setStatus] = useState<Conversation['status']>('active')
  const [source, setSource] = useState<Conversation['source']>('email')
  const [initialMessage, setInitialMessage] = useState('')
  const [tags, setTags] = useState('')
  const [importedMessages, setImportedMessages] = useState<Message[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (creationType === 'manual' && (!title.trim() || !initialMessage.trim())) {
      alert('Please provide both a title and initial message')
      return
    }
    
    if (creationType === 'import' && (!title.trim() || importedMessages.length === 0)) {
      alert('Please provide a title and import some messages')
      return
    }

    let messages: Message[]
    if (creationType === 'manual') {
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: 'client',
        content: initialMessage.trim(),
        timestamp: new Date().toISOString(),
        type: source === 'phone' ? 'call-notes' : source === 'meeting' ? 'meeting-notes' : 'text',
        metadata: {}
      }
      messages = [message]
    } else {
      messages = importedMessages
    }

    const newConversation: Conversation = {
      id: conversation?.id || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      clientId,
      title: title.trim(),
      messages,
      createdAt: conversation?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source,
      priority,
      status,
      tags: tags.trim() ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      summary: `${source} conversation with ${messages.length} message${messages.length !== 1 ? 's' : ''}`
    }

    onSave(newConversation)
    
    // Reset form
    resetForm()
  }

  const resetForm = () => {
    setCreationType('manual')
    setTitle('')
    setInitialMessage('')
    setTags('')
    setPriority('medium')
    setStatus('active')
    setSource('email')
    setImportedMessages([])
  }

  const handleMessagesImported = (messages: Message[]) => {
    setImportedMessages(messages)
    if (messages.length > 0 && !title.trim()) {
      // Auto-generate title based on first message
      const firstMessage = messages[0]
      const preview = firstMessage.content.substring(0, 50)
      setTitle(`${source} conversation: ${preview}...`)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[min(90vw,800px)] max-h-[90vh] overflow-y-auto bg-white border-2 border-light-grey">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-dark-grey uppercase tracking-wide font-space-grotesk">
            {conversation ? 'EDIT CONVERSATION' : 'NEW CONVERSATION'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Creation Type Selection */}
          <div>
            <label className="block text-sm font-bold text-dark-grey mb-3 uppercase tracking-wide font-space-grotesk">
              HOW WOULD YOU LIKE TO CREATE THIS CONVERSATION?
            </label>
            <div className="space-y-3">
              <label className="flex items-start p-3 border-2 border-light-grey cursor-pointer hover:bg-off-white transition-colors">
                <input
                  type="radio"
                  value="manual"
                  checked={creationType === 'manual'}
                  onChange={(e) => setCreationType(e.target.value as 'manual' | 'import')}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-bold text-dark-grey uppercase tracking-wide font-space-grotesk">
                    MANUAL ENTRY
                  </div>
                  <div className="text-sm text-medium-grey font-space-grotesk">
                    ENTER CONVERSATION DETAILS AND FIRST MESSAGE
                  </div>
                </div>
              </label>
              <label className="flex items-start p-3 border-2 border-light-grey cursor-pointer hover:bg-off-white transition-colors">
                <input
                  type="radio"
                  value="import"
                  checked={creationType === 'import'}
                  onChange={(e) => setCreationType(e.target.value as 'manual' | 'import')}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-bold text-dark-grey uppercase tracking-wide font-space-grotesk">
                    IMPORT MESSAGES
                  </div>
                  <div className="text-sm text-medium-grey font-space-grotesk">
                    IMPORT FROM EXCEL FILE, PASTE TEXT, OR CRM INTEGRATION
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-dark-grey mb-2 uppercase tracking-wide font-space-grotesk">
              CONVERSATION TITLE
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.G., LANDSCAPING QUOTE DISCUSSION"
              className="w-full px-3 py-2 border-2 border-light-grey focus:border-gold bg-white text-dark-grey font-space-grotesk"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-dark-grey mb-2 uppercase tracking-wide font-space-grotesk">
                SOURCE
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as Conversation['source'])}
                className="w-full px-3 py-2 border-2 border-light-grey focus:border-gold bg-white text-dark-grey font-space-grotesk text-sm uppercase tracking-wide"
              >
                <option value="email">EMAIL</option>
                <option value="text">TEXT</option>
                <option value="phone">PHONE</option>
                <option value="meeting">MEETING</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-dark-grey mb-2 uppercase tracking-wide font-space-grotesk">
                PRIORITY
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Conversation['priority'])}
                className="w-full px-3 py-2 border-2 border-light-grey focus:border-gold bg-white text-dark-grey font-space-grotesk text-sm uppercase tracking-wide"
              >
                <option value="low">LOW</option>
                <option value="medium">MEDIUM</option>
                <option value="high">HIGH</option>
                <option value="urgent">URGENT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-dark-grey mb-2 uppercase tracking-wide font-space-grotesk">
                STATUS
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Conversation['status'])}
                className="w-full px-3 py-2 border-2 border-light-grey focus:border-gold bg-white text-dark-grey font-space-grotesk text-sm uppercase tracking-wide"
              >
                <option value="active">ACTIVE</option>
                <option value="pending">PENDING</option>
                <option value="resolved">RESOLVED</option>
                <option value="archived">ARCHIVED</option>
              </select>
            </div>
          </div>

          {/* Manual Entry Fields */}
          {creationType === 'manual' && (
            <div>
              <label className="block text-sm font-bold text-dark-grey mb-2 uppercase tracking-wide font-space-grotesk">
                INITIAL MESSAGE
              </label>
              <textarea
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="ENTER THE FIRST MESSAGE IN THIS CONVERSATION..."
                rows={4}
                className="w-full px-3 py-2 border-2 border-light-grey focus:border-gold bg-white text-dark-grey font-space-grotesk"
                required
              />
            </div>
          )}

          {/* Import Fields */}
          {creationType === 'import' && (
            <div className="border-2 border-light-grey p-4 max-h-[60vh] overflow-y-auto">
              <MessageImporter
                onMessagesDetected={handleMessagesImported}
                clientName={client.name}
                userName="You"
              />
              {importedMessages.length > 0 && (
                <div className="mt-4 p-3 bg-gold-light border border-gold">
                  <div className="text-sm font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                    ✅ {importedMessages.length} MESSAGES IMPORTED
                  </div>
                  <div className="text-xs text-medium-grey font-space-grotesk mt-1">
                    MESSAGES ARE READY TO BE ADDED TO THE CONVERSATION
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-dark-grey mb-2 uppercase tracking-wide font-space-grotesk">
              TAGS (COMMA SEPARATED)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="QUOTE, URGENT, FOLLOW-UP"
              className="w-full px-3 py-2 border-2 border-light-grey focus:border-gold bg-white text-dark-grey font-space-grotesk"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t-2 border-light-grey">
            <Button 
              type="button"
              variant="outline" 
              onClick={onClose}
              className="border-2 border-light-grey text-dark-grey hover:bg-light-grey font-space-grotesk font-bold uppercase tracking-wide"
            >
              CANCEL
            </Button>
            <Button 
              type="submit"
              className="bg-gold text-dark-grey hover:bg-gold-light font-space-grotesk font-bold uppercase tracking-wide"
              disabled={creationType === 'import' && importedMessages.length === 0}
            >
              {conversation ? 'UPDATE' : 'CREATE'} CONVERSATION
              {creationType === 'import' && importedMessages.length > 0 && ` (${importedMessages.length} MESSAGES)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const MessageModal: React.FC<{
  isOpen: boolean
  conversation: Conversation | null
  onClose: () => void
  onSave: (data: string) => void
}> = ({ isOpen, conversation, onClose, onSave }) => {
  const [message, setMessage] = useState('')

  const handleSave = () => {
    if (message.trim()) {
      onSave(message.trim())
      setMessage('')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white border-2 border-light-grey">
        <DialogHeader className="bg-off-white border-b-2 border-gold p-6">
          <DialogTitle className="text-xl font-bold text-dark-grey uppercase tracking-wide font-space-grotesk">
            ADD MESSAGE
          </DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="TYPE YOUR MESSAGE..."
            className="w-full h-32 p-3 border-2 border-light-grey focus:border-gold bg-white text-dark-grey font-space-grotesk"
          />
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-2 border-light-grey text-dark-grey hover:bg-light-grey font-space-grotesk font-bold uppercase tracking-wide"
            >
              CANCEL
            </Button>
            <Button 
              className="bg-gold text-dark-grey hover:bg-gold-light font-space-grotesk font-bold uppercase tracking-wide"
              onClick={handleSave}
              disabled={!message.trim()}
            >
              SEND
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ClientConversationsSection
