# PEA Computer Asset Management

This project is built with React, TypeScript, and Vite. It is designed to be deployed on Vercel.

## Deployment on Vercel

1.  Push this project to a GitHub repository.
2.  Connect your GitHub repository to [Vercel](https://vercel.com/).
3.  Vercel will automatically detect the Vite project and configure the build settings:
    *   **Build Command:** `npm run build`
    *   **Output Directory:** `dist`
4.  Add any necessary environment variables in the Vercel dashboard (e.g., `GEMINI_API_KEY` if used).
5.  Deploy!

## Local Development

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the development server:
    ```bash
    npm run dev
    ```
3.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

*   Dashboard with asset statistics.
*   Asset table with filtering and sorting.
*   Integration with Google Sheets via Apps Script.
*   Multi-line timestamp and repair history handling.
