import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { SessionManager } from '@client/SessionManager.js'
import {
  mockAPIResponses,
  nextTick,
  wait,
  mockConsole,
  expectToThrow
} from '@tests/utils/test-helpers.js'
import { mockSessionData, mockServerConfig, mockErrorResponses } from '@tests/fixtures/mock-data.js'

describe('SessionManager', () => {
  let sessionManager
  let restoreConsole

  beforeEach(() => {
    restoreConsole = mockConsole()
    mockAPIResponses()

    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        pathname: '/',
        href: 'http://localhost:3020/',
        origin: 'http://localhost:3020',
        search: '',
        hash: ''
      }
    })

    sessionManager = new SessionManager({
      serverUrl: 'http://localhost:3030'
    })
  })

  afterEach(() => {
    if (sessionManager) {
      sessionManager.dispose()
    }
    restoreConsole()
  })

  describe('Constructor and Initialization', () => {
    test('should initialize with default properties', () => {
      expect(sessionManager.serverUrl).toBe('http://localhost:3030')
      expect(sessionManager.currentSessionId).toBeNull()
      expect(sessionManager.sessionData).toBeNull()
      expect(sessionManager.hasUnsavedChanges).toBe(false)
    })

    test('should initialize with callback functions', () => {
      const callbacks = {
        onSessionCreated: vi.fn(),
        onSessionLoaded: vi.fn(),
        onSessionSaved: vi.fn(),
        onSessionError: vi.fn()
      }

      const manager = new SessionManager(callbacks)

      expect(manager.onSessionCreated).toBe(callbacks.onSessionCreated)
      expect(manager.onSessionLoaded).toBe(callbacks.onSessionLoaded)
      expect(manager.onSessionSaved).toBe(callbacks.onSessionSaved)
      expect(manager.onSessionError).toBe(callbacks.onSessionError)

      manager.dispose()
    })

    test('should check for existing session on initialization', () => {
      window.location.pathname = '/existing-session-123'

      const manager = new SessionManager({
        serverUrl: 'http://localhost:3030'
      })

      // Should attempt to load session from URL
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3030/api/sessions/existing-session-123'
      )

      manager.dispose()
    })

    test('should handle no session in URL', () => {
      window.location.pathname = '/'

      expect(() => {
        const manager = new SessionManager()
        manager.dispose()
      }).not.toThrow()
    })
  })

  describe('Session Creation', () => {
    test('should create new session with data', async () => {
      const sessionData = {
        name: 'Test Session',
        layers: [],
        modelPath: '/models/test.glb'
      }

      const mockOnCreated = vi.fn()
      sessionManager.onSessionCreated = mockOnCreated

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessionId: 'new-session-123',
          ...sessionData
        })
      })

      const result = await sessionManager.createSession(sessionData)

      expect(result.sessionId).toBe('new-session-123')
      expect(sessionManager.currentSessionId).toBe('new-session-123')
      expect(sessionManager.sessionData).toEqual(sessionData)
      expect(sessionManager.hasUnsavedChanges).toBe(false)
      expect(mockOnCreated).toHaveBeenCalledWith(result)
    })

    test('should handle session creation failure', async () => {
      const mockOnError = vi.fn()
      sessionManager.onSessionError = mockOnError

      fetch.mockResolvedValueOnce(mockErrorResponses.serverError)

      await expectToThrow(
        () => sessionManager.createSession({}),
        'Failed to create session'
      )

      expect(mockOnError).toHaveBeenCalled()
    })

    test('should validate session data before creation', async () => {
      await expectToThrow(
        () => sessionManager.createSession(null),
        'Session data is required'
      )

      await expectToThrow(
        () => sessionManager.createSession({}),
        'Session name is required'
      )
    })
  })

  describe('Session Loading', () => {
    test('should load existing session by ID', async () => {
      const mockOnLoaded = vi.fn()
      sessionManager.onSessionLoaded = mockOnLoaded

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSessionData)
      })

      const result = await sessionManager.loadSession('test-session-123')

      expect(result).toEqual(mockSessionData)
      expect(sessionManager.currentSessionId).toBe('test-session-123')
      expect(sessionManager.sessionData).toEqual(mockSessionData)
      expect(sessionManager.hasUnsavedChanges).toBe(false)
      expect(mockOnLoaded).toHaveBeenCalledWith(mockSessionData)
    })

    test('should handle session loading failure', async () => {
      const mockOnError = vi.fn()
      sessionManager.onSessionError = mockOnError

      fetch.mockResolvedValueOnce(mockErrorResponses.notFoundError)

      await expectToThrow(
        () => sessionManager.loadSession('non-existent'),
        'Session not found'
      )

      expect(mockOnError).toHaveBeenCalled()
    })

    test('should handle network errors during loading', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'))

      await expectToThrow(
        () => sessionManager.loadSession('test-session'),
        'Network error'
      )
    })
  })

  describe('Session Saving', () => {
    beforeEach(async () => {
      // Set up an existing session
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSessionData)
      })
      await sessionManager.loadSession('test-session-123')
    })

    test('should save session changes', async () => {
      const mockOnSaved = vi.fn()
      sessionManager.onSessionSaved = mockOnSaved

      sessionManager.updateSessionData({
        layers: [{ id: 'new-layer', type: 'text' }]
      })

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })

      await sessionManager.saveSession()

      expect(sessionManager.hasUnsavedChanges).toBe(false)
      expect(mockOnSaved).toHaveBeenCalled()
    })

    test('should handle save failures', async () => {
      const mockOnError = vi.fn()
      sessionManager.onSessionError = mockOnError

      fetch.mockResolvedValueOnce(mockErrorResponses.serverError)

      await expectToThrow(
        () => sessionManager.saveSession(),
        'Failed to save session'
      )

      expect(mockOnError).toHaveBeenCalled()
      expect(sessionManager.hasUnsavedChanges).toBe(true)
    })

    test('should auto-save on data changes', async () => {
      sessionManager.enableAutoSave(true, 100) // 100ms auto-save interval

      sessionManager.updateSessionData({
        layers: [{ id: 'auto-save-layer' }]
      })

      await wait(150)

      expect(fetch).toHaveBeenCalledWith(
        `${sessionManager.serverUrl}/api/sessions/${sessionManager.currentSessionId}`,
        expect.objectContaining({
          method: 'PUT'
        })
      )
    })

    test('should not save when no changes exist', async () => {
      const fetchCallsBeforeSave = fetch.mock.calls.length

      await sessionManager.saveSession()

      // Should not make additional API calls if no changes
      expect(fetch.mock.calls.length).toBe(fetchCallsBeforeSave)
    })
  })

  describe('Session Data Management', () => {
    test('should update session data and mark as changed', () => {
      const updates = {
        layers: [{ id: 'layer-1', type: 'text' }],
        modelPath: '/models/new.glb'
      }

      sessionManager.updateSessionData(updates)

      expect(sessionManager.sessionData).toEqual(updates)
      expect(sessionManager.hasUnsavedChanges).toBe(true)
    })

    test('should merge updates with existing data', () => {
      sessionManager.sessionData = {
        name: 'Existing Session',
        layers: [],
        modelPath: '/models/old.glb'
      }

      sessionManager.updateSessionData({
        layers: [{ id: 'new-layer' }]
      })

      expect(sessionManager.sessionData.name).toBe('Existing Session')
      expect(sessionManager.sessionData.layers).toEqual([{ id: 'new-layer' }])
      expect(sessionManager.sessionData.modelPath).toBe('/models/old.glb')
    })

    test('should get current session data', () => {
      const testData = { name: 'Test', layers: [] }
      sessionManager.sessionData = testData

      expect(sessionManager.getSessionData()).toEqual(testData)
    })

    test('should check if session has unsaved changes', () => {
      expect(sessionManager.hasUnsavedChanges).toBe(false)

      sessionManager.updateSessionData({ layers: [] })

      expect(sessionManager.hasUnsavedChanges).toBe(true)
    })
  })

  describe('Session Listing', () => {
    test('should list available sessions', async () => {
      const mockSessions = [
        { id: 'session-1', name: 'Session 1' },
        { id: 'session-2', name: 'Session 2' }
      ]

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSessions })
      })

      const sessions = await sessionManager.listSessions()

      expect(sessions).toEqual(mockSessions)
    })

    test('should handle empty session list', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: [] })
      })

      const sessions = await sessionManager.listSessions()

      expect(sessions).toEqual([])
    })

    test('should handle session listing errors', async () => {
      fetch.mockResolvedValueOnce(mockErrorResponses.serverError)

      await expectToThrow(
        () => sessionManager.listSessions(),
        'Failed to list sessions'
      )
    })
  })

  describe('Session Deletion', () => {
    test('should delete session by ID', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })

      await sessionManager.deleteSession('session-to-delete')

      expect(fetch).toHaveBeenCalledWith(
        `${sessionManager.serverUrl}/api/sessions/session-to-delete`,
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })

    test('should handle deletion failures', async () => {
      fetch.mockResolvedValueOnce(mockErrorResponses.notFoundError)

      await expectToThrow(
        () => sessionManager.deleteSession('non-existent'),
        'Failed to delete session'
      )
    })

    test('should clear current session if deleting active session', async () => {
      sessionManager.currentSessionId = 'current-session'
      sessionManager.sessionData = { name: 'Current' }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })

      await sessionManager.deleteSession('current-session')

      expect(sessionManager.currentSessionId).toBeNull()
      expect(sessionManager.sessionData).toBeNull()
      expect(sessionManager.hasUnsavedChanges).toBe(false)
    })
  })

  describe('Auto-Save Functionality', () => {
    test('should enable auto-save with specified interval', () => {
      sessionManager.enableAutoSave(true, 500)

      expect(sessionManager.autoSaveEnabled).toBe(true)
      expect(sessionManager.autoSaveInterval).toBe(500)
    })

    test('should disable auto-save', () => {
      sessionManager.enableAutoSave(true, 500)
      sessionManager.enableAutoSave(false)

      expect(sessionManager.autoSaveEnabled).toBe(false)
    })

    test('should trigger auto-save on data changes', async () => {
      const saveSpy = vi.spyOn(sessionManager, 'saveSession')
      sessionManager.enableAutoSave(true, 50)

      sessionManager.updateSessionData({ test: 'data' })

      await wait(100)

      expect(saveSpy).toHaveBeenCalled()
    })

    test('should clear auto-save timer on disable', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      sessionManager.enableAutoSave(true, 1000)
      sessionManager.enableAutoSave(false)

      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })

  describe('Conflict Resolution', () => {
    test('should detect session conflicts', async () => {
      sessionManager.sessionData = { lastModified: '2025-01-01T10:00:00Z' }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          lastModified: '2025-01-01T11:00:00Z' // Server version is newer
        })
      })

      const hasConflict = await sessionManager.checkForConflicts()

      expect(hasConflict).toBe(true)
    })

    test('should handle merge conflicts', async () => {
      const serverData = { ...mockSessionData, layers: [{ id: 'server-layer' }] }
      const localData = { ...mockSessionData, layers: [{ id: 'local-layer' }] }

      sessionManager.sessionData = localData

      const mergedData = await sessionManager.resolveConflict(serverData, 'merge')

      expect(mergedData.layers).toHaveLength(2)
      expect(mergedData.layers).toContainEqual({ id: 'server-layer' })
      expect(mergedData.layers).toContainEqual({ id: 'local-layer' })
    })

    test('should handle conflict resolution strategies', async () => {
      const serverData = { name: 'Server Version' }
      const localData = { name: 'Local Version' }

      sessionManager.sessionData = localData

      // Test server wins strategy
      const serverWins = await sessionManager.resolveConflict(serverData, 'server')
      expect(serverWins.name).toBe('Server Version')

      // Test local wins strategy
      const localWins = await sessionManager.resolveConflict(serverData, 'local')
      expect(localWins.name).toBe('Local Version')
    })
  })

  describe('Error Handling and Recovery', () => {
    test('should handle network timeouts', async () => {
      fetch.mockImplementation(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 100)
      }))

      await expectToThrow(
        () => sessionManager.loadSession('test'),
        'Timeout'
      )
    })

    test('should retry failed requests', async () => {
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSessionData)
        })

      sessionManager.retryCount = 1

      const result = await sessionManager.loadSession('test-session')

      expect(result).toEqual(mockSessionData)
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    test('should handle corrupted session data', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve('invalid json')
      })

      await expectToThrow(
        () => sessionManager.loadSession('corrupted'),
        'Invalid session data'
      )
    })
  })

  describe('Memory Management', () => {
    test('should dispose resources and clear timers', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      sessionManager.enableAutoSave(true, 1000)
      sessionManager.dispose()

      expect(clearIntervalSpy).toHaveBeenCalled()
      expect(sessionManager.sessionData).toBeNull()
      expect(sessionManager.currentSessionId).toBeNull()
    })

    test('should remove event listeners on dispose', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      sessionManager.dispose()

      expect(removeEventListenerSpy).toHaveBeenCalled()
    })
  })

  describe('Session Validation', () => {
    test('should validate session data structure', () => {
      const validSession = {
        name: 'Valid Session',
        layers: [],
        modelPath: '/models/test.glb'
      }

      expect(sessionManager.validateSessionData(validSession)).toBe(true)
    })

    test('should reject invalid session data', () => {
      const invalidSessions = [
        null,
        undefined,
        {},
        { name: '' },
        { name: 'Valid', layers: 'invalid' },
        { name: 'Valid', layers: [], invalidProperty: {} }
      ]

      invalidSessions.forEach(session => {
        expect(sessionManager.validateSessionData(session)).toBe(false)
      })
    })

    test('should validate layer data structure', () => {
      const validLayer = {
        id: 'layer-1',
        type: 'text',
        x: 100,
        y: 100,
        width: 200,
        height: 50
      }

      expect(sessionManager.validateLayerData(validLayer)).toBe(true)
    })
  })
})