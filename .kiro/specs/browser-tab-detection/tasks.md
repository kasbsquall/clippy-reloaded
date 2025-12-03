# Implementation Plan

- [x] 1. Create TitleParser component

  - [x] 1.1 Implement TitleParser class with browser detection logic


    - Create `src/core/title-parser.ts`
    - Implement `detectBrowser()` method to identify Chrome, Firefox, Edge from window titles
    - Implement `extractPageTitle()` method to strip browser suffix from title
    - Implement `parse()` method that returns ParsedTitle interface


    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 2.4_

  - [x] 1.2 Write property test for title parsing

    - **Property 1: Title Parsing Preserves Information**

    - **Validates: Requirements 1.2, 1.3**



  - [x] 1.3 Write property test for browser detection
    - **Property 2: Browser Detection Consistency**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**



- [x] 2. Create PlatformProvider for Windows
  - [x] 2.1 Implement WindowsPowerShellProvider class

    - Create `src/core/platform-providers/windows.ts`


    - Implement PowerShell command to get foreground window title
    - Implement `isSupported()` to check if running on Windows
    - Implement `getActiveWindow()` to return WindowInfo
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 2.2 Write unit tests for PowerShell provider

    - Test PowerShell command execution
    - Test error handling for failed commands
    - _Requirements: 5.1_



- [x] 3. Create WindowMonitor component
  - [x] 3.1 Implement WindowMonitor class with polling logic

    - Create `src/core/window-monitor.ts`

    - Implement configurable poll interval (default 1000ms)
    - Implement `start()` and `stop()` methods


    - Implement `getCurrentWindow()` method

    - Implement event callback registration with `onWindowChange()`




    - _Requirements: 1.1, 3.1_
  - [x] 3.2 Implement deduplication logic
    - Track last window title to avoid duplicate events


    - Only emit events when title actually changes


    - _Requirements: 3.2_
  - [x] 3.3 Write property test for event deduplication

    - **Property 3: Event Deduplication**




    - **Validates: Requirements 3.2**
  - [x] 3.4 Implement error handling in polling loop
    - Catch errors from platform provider


    - Log errors and continue polling
    - _Requirements: 3.3_





  - [x] 3.5 Write property test for error resilience
    - **Property 4: Error Resilience**


    - **Validates: Requirements 3.3**

- [x] 4. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.


- [x] 5. Integrate with Context Engine
  - [x] 5.1 Add window context to ContextEngine
    - Update `src/core/context-engine.ts` to handle window change events
    - Add `browserContext` field to context state
    - Subscribe to WindowMonitor events via EventManager


    - _Requirements: 4.1_
  - [x] 5.2 Write property test for context integration
    - **Property 5: Context Integration**


    - **Validates: Requirements 4.1**
  - [x] 5.3 Update AI prompt to include browser context


    - Modify `src/core/ai-engine.ts` to include browser context in prompts
    - Add browser context to system prompt when available
    - _Requirements: 4.2, 4.3_

- [x] 6. Initialize WindowMonitor in main process
  - [x] 6.1 Add WindowMonitor initialization to Electron main
    - Update `src/main/index.ts` to create and start WindowMonitor
    - Connect WindowMonitor to EventManager
    - Add IPC handler to expose current window info to renderer
    - _Requirements: 1.1, 1.4_
  - [x] 6.2 Add UI indicator for detected browser tab
    - Update Clippy UI to show current detected context
    - Display browser icon and page title when available
    - _Requirements: 1.1_

- [x] 7. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
