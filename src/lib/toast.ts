// Toast Notification Utility
// Simple client-side toast system for user feedback

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number // milliseconds
  action?: {
    label: string
    onClick: () => void
  }
}

class ToastManager {
  private container: HTMLDivElement | null = null
  private toasts: Map<string, HTMLDivElement> = new Map()

  private ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div')
      this.container.id = 'toast-container'
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
      `
      document.body.appendChild(this.container)
    }
    return this.container
  }

  private getToastStyles(type: ToastType): string {
    const baseStyles = `
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      animation: slideIn 0.3s ease-out;
    `

    const typeStyles = {
      success: 'background-color: #10b981; color: white;',
      error: 'background-color: #ef4444; color: white;',
      warning: 'background-color: #f59e0b; color: white;',
      info: 'background-color: #3b82f6; color: white;'
    }

    return baseStyles + typeStyles[type]
  }

  show(options: ToastOptions): string {
    const { message, type = 'info', duration = 3000, action } = options
    const container = this.ensureContainer()
    const toastId = `toast-${Date.now()}-${Math.random()}`

    // Create toast element
    const toast = document.createElement('div')
    toast.id = toastId
    toast.style.cssText = this.getToastStyles(type)

    // Message content
    const messageEl = document.createElement('span')
    messageEl.textContent = message
    messageEl.style.flex = '1'
    toast.appendChild(messageEl)

    // Action button if provided
    if (action) {
      const actionBtn = document.createElement('button')
      actionBtn.textContent = action.label
      actionBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
      `
      actionBtn.onclick = () => {
        action.onClick()
        this.dismiss(toastId)
      }
      toast.appendChild(actionBtn)
    }

    // Close button
    const closeBtn = document.createElement('button')
    closeBtn.innerHTML = '&times;'
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.8;
    `
    closeBtn.onclick = () => this.dismiss(toastId)
    toast.appendChild(closeBtn)

    // Add to container
    container.appendChild(toast)
    this.toasts.set(toastId, toast)

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(toastId), duration)
    }

    // Add animation styles to document if not already present
    if (!document.getElementById('toast-animations')) {
      const style = document.createElement('style')
      style.id = 'toast-animations'
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `
      document.head.appendChild(style)
    }

    return toastId
  }

  dismiss(toastId: string) {
    const toast = this.toasts.get(toastId)
    if (!toast) return

    // Animate out
    toast.style.animation = 'slideOut 0.3s ease-in'
    setTimeout(() => {
      toast.remove()
      this.toasts.delete(toastId)
    }, 300)
  }

  dismissAll() {
    this.toasts.forEach((_, id) => this.dismiss(id))
  }

  success(message: string, duration?: number) {
    return this.show({ message, type: 'success', duration })
  }

  error(message: string, duration?: number, action?: ToastOptions['action']) {
    return this.show({ message, type: 'error', duration, action })
  }

  warning(message: string, duration?: number) {
    return this.show({ message, type: 'warning', duration })
  }

  info(message: string, duration?: number) {
    return this.show({ message, type: 'info', duration })
  }
}

// Export singleton instance
export const toast = new ToastManager()

// Export utility functions
export const showToast = (options: ToastOptions) => toast.show(options)
export const dismissToast = (toastId: string) => toast.dismiss(toastId)
export const dismissAllToasts = () => toast.dismissAll()
