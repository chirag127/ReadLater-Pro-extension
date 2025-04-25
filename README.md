# ReadLater Pro Extension

A browser extension designed to help users save online articles, track their reading progress, and manage their reading list effectively.

## Features

-   One-click article saving
-   Reading list management with tagging and search
-   Automatic scroll position tracking
-   Text highlighting and note-taking
-   Cross-device synchronization

## Project Structure

-   `extension/`: Chrome extension code
-   `backend/`: Node.js backend API

## Technologies Used

-   **Frontend**: HTML, CSS, JavaScript (Chrome Extension Manifest V3)
-   **Backend**: Node.js, Express.js
-   **Database**: MongoDB
-   **Authentication**: Clerk

## Development Setup

### Prerequisites

-   Node.js (v14 or higher)
-   MongoDB account
-   Clerk account

### Backend Setup

1. Navigate to the backend directory:

    ```
    cd backend
    ```

2. Install dependencies:

    ```
    npm install
    ```

3. Create a `.env` file based on `.env.example` and fill in your credentials.

4. Start the development server:
    ```
    npm run dev
    ```

### Extension Setup

1. Navigate to the extension directory:

    ```
    cd extension
    ```

2. Load the extension in Chrome:
    - Open Chrome and navigate to `chrome://extensions/`
    - Enable "Developer mode"
    - Click "Load unpacked" and select the `extension` directory

## License

MIT

## Author

Chirag Singhal
