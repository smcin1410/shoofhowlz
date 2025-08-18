# Deployment Guide

This guide provides step-by-step instructions for deploying the client and server of the Fantasy Football Draft App.

We recommend the following services for their ease of use and generous free tiers:
- **Client (React App):** Vercel
- **Server (Node.js App):** Render

## Prerequisites

1.  **Create Accounts:**
    *   Sign up for a free account at [Vercel](https://vercel.com).
    *   Sign up for a free account at [Render](https://render.com).

2.  **Push to GitHub:**
    *   Create a new repository on GitHub.
    *   Push your entire project (`client` and `server` folders included) to this repository. Both Vercel and Render deploy directly from GitHub repositories.

---

## Part 1: Deploying the Server to Render

1.  **Create a New Web Service on Render:**
    *   Log in to your Render account.
    *   On your dashboard, click **"New +"** and then **"Web Service"**.
    *   Connect your GitHub account and select your project repository.

2.  **Configure the Server:**
    *   **Name:** Give your service a name (e.g., `fantasy-draft-server`).
    *   **Root Directory:** Set this to `server`. This tells Render to look inside the `server` folder for the application.
    *   **Environment:** Select `Node`.
    *   **Region:** Choose a region close to you.
    *   **Branch:** Select your main branch (e.g., `main` or `master`).
    *   **Build Command:** Set this to `npm install`.
    *   **Start Command:** Set this to `node index.js`.

3.  **Add Environment Variables:**
    *   Click on the **"Environment"** tab.
    *   You don't need to add `CLIENT_URL` yet. We will get this URL after deploying the client in Part 2.

4.  **Deploy:**
    *   Click **"Create Web Service"**. Render will now pull your code from GitHub, install the dependencies, and start your server.
    *   Once the deployment is complete, find your server's public URL. It will look something like `https://fantasy-draft-server.onrender.com`. **Copy this URL.**

---

## Part 2: Deploying the Client to Vercel

1.  **Create a New Project on Vercel:**
    *   Log in to your Vercel account.
    *   On your dashboard, click **"Add New..."** and then **"Project"**.
    *   Import your project repository from GitHub.

2.  **Configure the Client:**
    *   **Framework Preset:** Vercel should automatically detect that it's a Vite project.
    *   **Root Directory:** Set this to `client`.

3.  **Add Environment Variables:**
    *   Expand the **"Environment Variables"** section.
    *   Add a new variable:
        *   **Name:** `REACT_APP_SERVER_URL`
        *   **Value:** Paste the URL of your Render server that you copied in Part 1 (e.g., `https://fantasy-draft-server.onrender.com`).

4.  **Deploy:**
    *   Click **"Deploy"**. Vercel will build and deploy your React application.
    *   Once complete, Vercel will give you a public URL for your client (e.g., `https://your-project-name.vercel.app`). **This is the URL your friends will use.**

---

## Part 3: Final Configuration

1.  **Update Server CORS Policy:**
    *   Go back to your server's dashboard on Render.
    *   Go to the **"Environment"** tab.
    *   Add a new environment variable:
        *   **Name:** `CLIENT_URL`
        *   **Value:** Paste the URL of your Vercel client application (e.g., `https://your-project-name.vercel.app`).
    *   Render will automatically restart your server with the new environment variable.

## You're Live!

Your application is now deployed. You and your friends can access the Vercel URL to participate in the draft. Remember to also open the `/display` route on a large screen for your in-person draft!
