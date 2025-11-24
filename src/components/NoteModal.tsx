"use client"

import React, { useState, useEffect } from 'react'
import { X, StickyNote } from 'lucide-react'
import { Client } from '@/types/client'

interface NoteModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  onSave?: (note: { content: string; date: string; time: string }) => void
}

const NoteModal: React.FC<NoteModalProps> = ({ isOpen, onClose, client, onSave }) => {
  const [noteContent, setNoteContent] = useState('')
  const [noteDate, setNoteDate] = useState('')
  const [noteTime, setNoteTime] = useState('')

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Initialize with current date/time when modal opens
  useEffect(() => {
    if (isOpen) {
      const now = new Date()

      // Format date as YYYY-MM-DD
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`

      // Format time as HH:MM
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const timeString = `${hours}:${minutes}`

      setNoteDate(dateString)
      setNoteTime(timeString)
      setNoteContent('')
    }
  }, [isOpen])

  const handleSave = () => {
    if (!noteContent.trim()) return

    // Save note to localStorage
    const clientId = client.id
    const storedNotes = localStorage.getItem(`client_notes_${clientId}`)
    const notes = storedNotes ? JSON.parse(storedNotes) : []

    const timestamp = new Date(`${noteDate}T${noteTime}`).toISOString()
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      content: noteContent.trim(),
      createdAt: timestamp,
      updatedAt: timestamp
    }

    notes.unshift(newNote)
    localStorage.setItem(`client_notes_${clientId}`, JSON.stringify(notes))

    // Call optional callback
    if (onSave) {
      onSave({ content: noteContent, date: noteDate, time: noteTime })
    }

    // Reset and close
    setNoteContent('')
    onClose()
  }

  const handleCancel = () => {
    setNoteContent('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="neo-container max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="neo-inset border-b border-foreground/10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <StickyNote className="h-6 w-6 text-foreground" />
              <h2 className="text-xl font-bold text-foreground uppercase tracking-wide font-primary">
                Add Note for {client.name}
              </h2>
            </div>
            <button
              onClick={handleCancel}
              className="neo-icon-button transition-transform hover:scale-[1.1]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Note Content */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
              Note Content *
            </label>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all placeholder:text-muted-foreground/50 placeholder:font-normal"
              placeholder="Enter your note here..."
              autoFocus
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                Date
              </label>
              <input
                type="date"
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
                className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                Time
              </label>
              <input
                type="time"
                value={noteTime}
                onChange={(e) => setNoteTime(e.target.value)}
                className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              className="neo-button px-6 py-3 uppercase tracking-wide font-bold font-primary transition-transform hover:scale-[1.02]"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              className="neo-button-active px-6 py-3 uppercase tracking-wide font-bold font-primary transition-transform hover:scale-[1.02]"
              onClick={handleSave}
              disabled={!noteContent.trim()}
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NoteModal
