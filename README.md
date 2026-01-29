# DevFlow – Issue Tracker & Daily To-Do for Engineers

## Project Description
DevFlow is a robust, client-side web application designed to help engineers manage tasks and track issues efficiently. It combines a KanBan-style issue board with a daily todo planner, all persisted locally for a seamless experience.

## Problem Statement
Standard issue trackers can be bloated and slow. DevFlow provides a lightweight, instant-load alternative that lives entirely in the browser, perfect for personal workflow management without server overhead.

## Features Implemented
### 1. Issue Tracking
- **CRUD Operations**: Create, Read, Update, and Delete issues.
- **Kanban Board**: Drag-and-drop support to move issues between "Open", "In Progress", and "Resolved".
- **Priority System**: Visual distinction for Low, Medium, High, and Critical issues.
- **Search & Filter**: Real-time filtering by priority and text search.

### 2. Daily Todo Planner
- **Date-Specific Lists**: Todos are bucketed by date (YYYY-MM-DD).
- **Persistent Storage**: Tasks remain saved even after closing the browser.
- **Smart Completion**: Toggle completion status with visual feedback.

### 3. Advanced Features
- **GitHub Integration**: Import issues directly from public GitHub repositories via REST API.
- **Automatic Time Sync**: Integrates with WorldTimeAPI to ensure accurate date/time handling.
- **State Management**: Centralized reactive state store using the Observer pattern.
- **Theming**: Button-toggleable Light and Dark modes.

## External APIs Used
1. **GitHub REST API**: `https://api.github.com/repos/{owner}/{repo}/issues`
   - Used to fetch and import issues.
2. **WorldTimeAPI**: `http://worldtimeapi.org/api/ip`
   - Used to synchronize the application date with a reliable external source.

## How to Run
1. Open the folder in VS Code or any editor.
2. Use a local server (e.g., "Live Server" extension) to serve `index.html`.
3. **Note**: Opening `index.html` directly via `file://` protocol may cause CORS issues with ES Modules. A local HTTP server is required.

## Known Limitations
- GitHub API has a rate limit for unauthenticated requests.
- LocalStorage has a size limit (usually 5MB), which is sufficient for text data but not infinite.
- No backend means data is local to the specific browser/device.
