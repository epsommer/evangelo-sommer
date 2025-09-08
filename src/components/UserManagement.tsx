"use client"

import React, { useState } from 'react'
import { Users, Plus, Shield, Lock, Unlock, Eye, EyeOff, UserCheck, UserX, Settings, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserRole, UserStatus, User } from '@/types/security'
import { hasPermission } from '@/lib/security'

interface UserManagementProps {
  currentUserRole: UserRole
}

// Mock user data (in production, fetch from secure database)
const mockUsers: User[] = [
  {
    id: 'admin-001',
    email: 'admin@evangelosommer.com',
    name: 'System Administrator',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    failedLoginAttempts: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    twoFactorEnabled: true,
    emailVerified: new Date('2024-01-01'),
    lastLogin: new Date()
  },
  {
    id: 'mgr-001',
    email: 'manager@evangelosommer.com',
    name: 'Service Manager',
    role: 'MANAGER',
    status: 'ACTIVE',
    failedLoginAttempts: 1,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    twoFactorEnabled: false
  },
  {
    id: 'user-001',
    email: 'employee@evangelosommer.com',
    name: 'Team Member',
    role: 'USER',
    status: 'SUSPENDED',
    failedLoginAttempts: 0,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date(),
    twoFactorEnabled: true,
    emailVerified: new Date('2024-03-01')
  }
]

const UserManagement: React.FC<UserManagementProps> = ({ currentUserRole }) => {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUserDetails, setShowUserDetails] = useState(false)

  const canManageUsers = hasPermission(currentUserRole, 'users:create') && hasPermission(currentUserRole, 'users:update')

  if (!canManageUsers) {
    return (
      <div className="text-center py-12">
        <Users className="h-16 w-16 mx-auto mb-4 text-gold opacity-50" />
        <h3 className="text-xl font-bold text-dark-grey mb-2 font-space-grotesk uppercase">
          ACCESS RESTRICTED
        </h3>
        <p className="text-medium-grey font-space-grotesk">
          User management requires administrator privileges.
        </p>
      </div>
    )
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-red-600 text-white'
      case 'ADMIN': return 'bg-blue-600 text-white'
      case 'MANAGER': return 'bg-purple-600 text-white'
      case 'USER': return 'bg-green-600 text-white'
      case 'VIEWER': return 'bg-gray-600 text-white'
      default: return 'bg-gray-400 text-white'
    }
  }

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'INACTIVE': return 'bg-gray-100 text-gray-800'
      case 'SUSPENDED': return 'bg-red-100 text-red-800'
      case 'LOCKED': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleStatusChange = (userId: string, newStatus: UserStatus) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: newStatus, updatedAt: new Date() }
        : user
    ))
  }

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, role: newRole, updatedAt: new Date() }
        : user
    ))
  }

  const toggleTwoFactor = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, twoFactorEnabled: !user.twoFactorEnabled, updatedAt: new Date() }
        : user
    ))
  }

  const resetFailedAttempts = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, failedLoginAttempts: 0, status: 'ACTIVE', updatedAt: new Date() }
        : user
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
            USER MANAGEMENT
          </h2>
          <p className="text-medium-grey font-space-grotesk">
            Manage system users, roles, and security settings
          </p>
        </div>
        <Button 
          className="bg-gold text-dark-grey font-bold font-space-grotesk uppercase tracking-wide hover:bg-gold-dark"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          CREATE USER
        </Button>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-2 border-light-grey">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk">
                TOTAL USERS
              </span>
              <Users className="h-5 w-5 text-gold" />
            </div>
            <div className="text-2xl font-bold text-dark-grey font-space-grotesk">
              {users.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-light-grey">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk">
                ACTIVE USERS
              </span>
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600 font-space-grotesk">
              {users.filter(u => u.status === 'ACTIVE').length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-light-grey">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk">
                2FA ENABLED
              </span>
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600 font-space-grotesk">
              {users.filter(u => u.twoFactorEnabled).length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-light-grey">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk">
                ISSUES
              </span>
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600 font-space-grotesk">
              {users.filter(u => u.status === 'SUSPENDED' || u.status === 'LOCKED' || u.failedLoginAttempts > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="bg-white border-2 border-light-grey">
        <CardHeader className="bg-off-white border-b border-light-grey p-6">
          <h3 className="text-lg font-bold text-dark-grey uppercase tracking-wide font-space-grotesk">
            SYSTEM USERS
          </h3>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-light-grey">
                <tr>
                  <th className="text-left p-4 font-bold text-dark-grey font-space-grotesk uppercase text-sm tracking-wide">
                    USER
                  </th>
                  <th className="text-left p-4 font-bold text-dark-grey font-space-grotesk uppercase text-sm tracking-wide">
                    ROLE
                  </th>
                  <th className="text-left p-4 font-bold text-dark-grey font-space-grotesk uppercase text-sm tracking-wide">
                    STATUS
                  </th>
                  <th className="text-left p-4 font-bold text-dark-grey font-space-grotesk uppercase text-sm tracking-wide">
                    SECURITY
                  </th>
                  <th className="text-left p-4 font-bold text-dark-grey font-space-grotesk uppercase text-sm tracking-wide">
                    LAST LOGIN
                  </th>
                  <th className="text-left p-4 font-bold text-dark-grey font-space-grotesk uppercase text-sm tracking-wide">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-light-grey hover:bg-off-white transition-colors">
                    <td className="p-4">
                      <div>
                        <div className="font-bold text-dark-grey font-space-grotesk">
                          {user.name}
                        </div>
                        <div className="text-sm text-medium-grey font-space-grotesk">
                          {user.email}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={`text-xs font-bold ${getRoleColor(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge className={`text-xs font-bold ${getStatusColor(user.status)}`}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {user.twoFactorEnabled ? (
                          <Shield className="h-4 w-4 text-green-600" title="2FA Enabled" />
                        ) : (
                          <Shield className="h-4 w-4 text-gray-400" title="2FA Disabled" />
                        )}
                        {user.emailVerified ? (
                          <UserCheck className="h-4 w-4 text-blue-600" title="Email Verified" />
                        ) : (
                          <UserX className="h-4 w-4 text-red-600" title="Email Not Verified" />
                        )}
                        {user.failedLoginAttempts > 0 && (
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <span className="text-xs text-red-600 ml-1">{user.failedLoginAttempts}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-dark-grey font-space-grotesk">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user)
                            setShowUserDetails(true)
                          }}
                          className="text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          VIEW
                        </Button>
                        
                        {user.status === 'LOCKED' && (
                          <Button
                            size="sm"
                            onClick={() => resetFailedAttempts(user.id)}
                            className="bg-green-600 text-white text-xs hover:bg-green-700"
                          >
                            <Unlock className="h-3 w-3 mr-1" />
                            UNLOCK
                          </Button>
                        )}
                        
                        {user.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(user.id, 'SUSPENDED')}
                            className="bg-red-600 text-white text-xs hover:bg-red-700"
                          >
                            <UserX className="h-3 w-3 mr-1" />
                            SUSPEND
                          </Button>
                        )}
                        
                        {user.status === 'SUSPENDED' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                            className="bg-green-600 text-white text-xs hover:bg-green-700"
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            ACTIVATE
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-light-grey">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-dark-grey font-space-grotesk uppercase">
                  USER DETAILS
                </h3>
                <button
                  onClick={() => setShowUserDetails(false)}
                  className="text-medium-grey hover:text-dark-grey"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk">
                    NAME
                  </label>
                  <div className="text-dark-grey font-space-grotesk">{selectedUser.name}</div>
                </div>
                <div>
                  <label className="text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk">
                    EMAIL
                  </label>
                  <div className="text-dark-grey font-space-grotesk">{selectedUser.email}</div>
                </div>
                <div>
                  <label className="text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk">
                    ROLE
                  </label>
                  <select
                    value={selectedUser.role}
                    onChange={(e) => handleRoleChange(selectedUser.id, e.target.value as UserRole)}
                    className="w-full mt-1 p-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                  >
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="USER">User</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk">
                    STATUS
                  </label>
                  <select
                    value={selectedUser.status}
                    onChange={(e) => handleStatusChange(selectedUser.id, e.target.value as UserStatus)}
                    className="w-full mt-1 p-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="LOCKED">Locked</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-off-white">
                <div>
                  <span className="font-bold text-dark-grey font-space-grotesk">Two-Factor Authentication</span>
                  <div className="text-sm text-medium-grey font-space-grotesk">
                    {selectedUser.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
                <Button
                  onClick={() => toggleTwoFactor(selectedUser.id)}
                  className={selectedUser.twoFactorEnabled 
                    ? "bg-red-600 text-white hover:bg-red-700" 
                    : "bg-green-600 text-white hover:bg-green-700"
                  }
                >
                  {selectedUser.twoFactorEnabled ? 'DISABLE 2FA' : 'ENABLE 2FA'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement