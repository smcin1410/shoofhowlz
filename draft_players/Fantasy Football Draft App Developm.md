Fantasy Football Draft App: Development Plan
1. Project Overview
Goal: To create a web-based Fantasy Football draft application for a 12-person league. The app must support both in-person and remote drafters simultaneously, providing a fun, intuitive, and real-time experience.

Core Features:

Real-time draft board and player pool updates.

Interactive player cards with detailed stats.

Filtering, sorting, and searching for players.

Team roster management with position caps.

A 90-second pick timer with time extension tokens.

Auto-draft functionality for expired timers.

Post-draft summary with PDF export and email list.

Instructions for Cursor:

You are an expert programmer. Your task is to build this application step-by-step. Follow each phase in order. After you complete the "To-Do" items in a step, mark them as complete by changing [ ] to [x] and then update this DEVELOPMENT_PLAN.md file with the new status. Then, await the next instruction.

2. Recommended Technology Stack
Frontend: React (with Create React App) or Vite for a modern, component-based UI.

Backend: Node.js with Express.js for a simple and powerful API.

Real-time Communication: Socket.IO for instant updates between the server and all clients.

Styling: Tailwind CSS or Styled-Components for a clean and modern design.

PDF Generation: A library like jsPDF or html2pdf.js on the frontend.

Phase 1: Project Setup & Backend Foundation
Step 1.1: Initialize Project Structure
Status: Incomplete
[ ]

To-Do:

[ ] Create a monorepo structure with two main folders: client (for the React frontend) and server (for the Node.js backend).

[ ] In the server directory, initialize a new Node.js project (npm init -y) and install initial dependencies: express, socket.io, cors, and nodemon.

[ ] In the client directory, initialize a new React project using Vite (npm create vite@latest client -- --template react).

[ ] Create a data folder inside the server directory and place the 10 player JSON files there.

Instructions for Cursor:

Set up the project structure and install the initial dependencies as described above. Once complete, update the status of this step.

Step 1.2: Set Up Server & API
Status: Incomplete
[ ]

To-Do:

[ ] In the server directory, create a main index.js file.

[ ] Set up a basic Express server that listens on a port (e.g., 4000).

[ ] Implement CORS middleware to allow requests from your React client (e.g., http://localhost:5173).

[ ] Create a simple API endpoint (e.g., GET /api/players) that reads, merges, and returns all player data from the JSON files. Ensure players are sorted by their default rank.

Instructions for Cursor:

Implement the basic Express server and the /api/players endpoint. The server should be able to read all JSON files, combine them into a single array of player objects, and send it as a response. Update the status when done.

Step 1.3: Set Up Real-time Server
Status: Incomplete
[ ]

To-Do:

[ ] Integrate Socket.IO into your Express server.

[ ] Create a basic connection listener. When a client connects, log a message to the console.

[ ] Define the initial state of the draft on the server. This should include:

availablePlayers: The full list of players.

draftedPlayers: An empty array.

teams: An array of 12 team objects, initially with just a name and email.

draftOrder: The sequence of picks.

currentPick: The index of the current pick in the draft order (starts at 0).

[ ] Create a 'draft-state' event that emits the entire draft state to any newly connected client.

Instructions for Cursor:

Integrate Socket.IO and establish the initial server-side state management for the draft. Ensure new clients receive the current state upon connecting. Update the status when this is functional.

Phase 2: Core Frontend - The Player Board
Step 2.1: Basic UI Layout & Data Fetching
Status: Incomplete
[ ]

To-Do:

[ ] In the React app, create a main DraftPage component.

[ ] Design a two-column layout. The left column (approx. 70% width) will be the "Player Board" and the right column (30%) will be for the "Draft Board" and "Team Rosters".

[ ] On component mount, fetch the player data from your backend's /api/players endpoint and store it in the component's state.

Instructions for Cursor:

Create the main DraftPage component with the specified layout. Fetch the player data from the server and display a simple loading message until the data is available. Update the status when complete.

Step 2.2: Implement Player Card Component
Status: Incomplete
[ ]

To-Do:

[ ] Create a reusable PlayerCard component.

[ ] The component should accept a player object as a prop.

[ ] It needs an isExpanded state, defaulting to false.

[ ] Collapsed State: Display only the player's name, position, team, and overall projected points. The card's background color should be based on the player's position (e.g., QB: red, RB: blue, WR: green, TE: orange, K/DST: grey).

[ ] Expanded State: Show all player stats from the JSON data, a "Draft Player" button, and a close 'X' button in the top-right corner.

[ ] Clicking the card should toggle the isExpanded state.

Instructions for Cursor:

Build the PlayerCard component with both collapsed and expanded views. Ensure the styling reflects the player's position. Clicking the card should toggle its state. Update the status when done.

Step 2.3: Build the Player Board Grid
Status: Incomplete
[ ]

To-Do:

[ ] In the DraftPage component, map over the availablePlayers state.

[ ] Render a PlayerCard for each player in a responsive grid or flexbox layout.

[ ] Ensure players are displayed in their ranked order.

Instructions for Cursor:

Create the main player board by rendering the list of available players using the PlayerCard component you just built. Update the status upon completion.

Step 2.4: Implement Filtering and Sorting
Status: Incomplete
[ ]

To-Do:

[ ] Above the player board, add UI elements for filtering:

A set of buttons or a dropdown for Position (All, QB, RB, WR, TE, D/ST, K).

A dropdown for Team.

[ ] Implement the state management and logic to filter the displayed players based on the user's selections.

Instructions for Cursor:

Add the filter controls to the UI. Write the client-side logic to filter the players shown on the board according to the selected criteria. Update the status when the filters are functional.

Step 2.5: Implement Player Search
Status: Incomplete
[ ]

To-Do:

[ ] Add a text input search box at the top of the player board area.

[ ] As the user types, filter the list of all players (both available and drafted) to show matching names.

[ ] Display the results in a dropdown/autocomplete list below the search box. Each item should show the player's name, position, and team.

[ ] If a player in the search result has already been drafted, display their name in a faded or greyed-out style with "(Drafted)" next to it.

[ ] Clicking on an available player in the search results should open their expanded PlayerCard on the board.

Instructions for Cursor:

Implement the intuitive player search functionality as described. This involves state management for the search query, filtering logic, and rendering the dropdown results. Update the status when the search is working.

Phase 3: Draft Logic & Real-time Interaction
Step 3.1: Draft Lobby & Setup
Status: Incomplete
[ ]

To-Do:

[ ] Create a Lobby component that is shown before the draft starts.

[ ] This component should have 12 input fields for team names and 12 for email addresses.

[ ] Add a "Start Draft" button. When clicked, it should send the team information to the server via a Socket.IO event (e.g., start-draft).

[ ] On the server, receiving this event should initialize the team data in the draft state and broadcast the updated state to all clients, which should trigger navigation from the lobby to the main draft page.

Instructions for Cursor:

Build the Lobby component. Implement the client and server-side logic to initialize the draft with the entered team names and emails. Update the status when the draft can be successfully started.

Step 3.2: Implement the Draft Action
Status: Incomplete
[ ]

To-Do:

[ ] When the "Draft Player" button on an expanded card is clicked, show a confirmation modal ("Are you sure?").

[ ] If "Yes" is clicked, the client should emit a draft-player event to the server with the playerId.

[ ] Server-side logic:

Listen for the draft-player event.

Validate the pick: Is it the correct user's turn? Does the team have space for that position?

If valid, move the player from availablePlayers to the drafting team's roster.

Increment the currentPick.

Broadcast the updated draft-state to all connected clients.

[ ] Client-side logic:

Listen for the draft-state update.

Re-render the components with the new state. This will automatically remove the player from the player board and add them to the draft board/roster view.

Instructions for Cursor:

Implement the full draft-pick lifecycle. This includes the confirmation modal on the client, the draft-player event emission, all server-side validation and state updates, and the final broadcast to all clients. Update the status when a player can be drafted successfully.

Step 3.3: Draft Clock & Timer Logic
Status: Incomplete
[ ]

To-Do:

[ ] Server-side: When the currentPick changes, start a 90-second timer on the server. Broadcast the remaining time every second using an event like timer-update.

[ ] Client-side: Create a Timer component that displays the time received from the server.

[ ] Time Extension:

When the server's timer reaches 15 seconds, it should also send a flag indicating the extension is available.

On the client, if this flag is true and the current user has tokens, display an "Extend Time (+30s)" button.

Clicking this button emits an extend-time event. The server adds 30 seconds to the timer and decrements the user's token count.

Instructions for Cursor:

Implement the server-side draft clock and the client-side display. Add the logic for the time extension tokens. Update the status when the timer is fully functional.

Step 3.4: Implement Auto-Draft Logic
Status: Incomplete
[ ]

To-Do:

[ ] Server-side: If the timer reaches zero, trigger an auto-draft function.

[ ] The function should identify the team that needs to pick.

[ ] It will iterate through the availablePlayers in rank order.

[ ] For each player, it checks if the current team's roster is already full at that position.

[ ] It drafts the first player that the team is eligible to draft.

[ ] After auto-drafting, it proceeds with the normal state update and broadcast.

Instructions for Cursor:

Write the auto-draft logic on the server that runs when the timer expires. Ensure it respects roster position caps. Update the status when complete.

Phase 4: Visualizing the Draft
Step 4.1: Build the Draft Board Component
Status: Incomplete
[ ]

To-Do:

[ ] Create a DraftBoard component for the right-hand column.

[ ] It should display a grid where columns represent teams and rows represent draft rounds (1-16).

[ ] As players are drafted, fill the grid cells with the player's name.

[ ] The background color of each cell should correspond to the player's position, matching the PlayerCard colors.

[ ] The cell for the currentPick should be highlighted.

Instructions for Cursor:

Build the DraftBoard component. It should dynamically render the grid based on the draft-state received from the server, including player names, position colors, and highlighting the current pick. Update the status when done.

Step 4.2: Build the Team Roster View
Status: Incomplete
[ ]

To-Do:

[ ] Below the DraftBoard, create a TeamRoster component.

[ ] It should have a dropdown to select one of the 12 teams.

[ ] When a team is selected, it should display a list of players drafted by that team, grouped by position.

[ ] It should also show the remaining slots for each position (e.g., "RB (3/8)").

Instructions for Cursor:

Build the TeamRoster component with the team selector and roster display. Ensure it accurately reflects the selected team's drafted players and remaining position caps. Update the status upon completion.

Phase 5: Post-Draft Functionality
Step 5.1: Draft Completion and Final Board View
Status: Incomplete
[ ]

To-Do:

[ ] After the last pick is made, the app should display a confirmation: "Is the draft complete?"

[ ] If "Yes", the UI should transition to a final summary view. This view should primarily feature the full, non-interactive draft board.

[ ] Add a "Generate PDF" button and the email list section to this view.

Instructions for Cursor:

Implement the logic to detect draft completion and display the final summary view. Update the status when this is working.

Step 5.2: PDF Generation
Status: Incomplete
[ ]

To-Do:

[ ] Integrate jsPDF or a similar library into the client.

[ ] When the "Generate PDF" button is clicked, create a PDF document of the final draft board.

[ ] The function should trigger a download of the generated PDF file.

Instructions for Cursor:

Add the PDF generation library and implement the feature to create and download a PDF of the final draft board. Update the status when complete.

Step 5.3: Email List and Copy Functionality
Status: Incomplete
[ ]

To-Do:

[ ] In the final view, display a list of all the email addresses entered in the lobby.

[ ] Add a "Copy All" button next to the list.

[ ] Clicking the button should copy the comma-separated list of emails to the user's clipboard.

Instructions for Cursor:

Implement the display of the email list and the "Copy All" button with clipboard functionality. Update the status when done.

Phase 6: UI/UX Polish and Future-Proofing
Step 6.1: Styling and Theming
Status: Incomplete
[ ]

To-Do:

[ ] Apply a consistent and modern theme to the entire application using your chosen styling solution (e.g., Tailwind CSS).

[ ] Ensure the application is responsive and usable on different screen sizes.

[ ] Add smooth transitions for card expansion/collapse and other UI state changes.

Instructions for Cursor:

Go through the entire application and apply a polished and consistent design. Focus on user experience, including responsiveness and subtle animations. Update the status upon completion.

Step 6.2: Add Placeholders for Future Animations
Status: Incomplete
[ ]

To-Do:

[ ] When a player is drafted, introduce a 5-second modal or overlay that announces the pick. For example: "With the 5th pick, Team A selects... Patrick Mahomes!".

[ ] This modal should have a "Continue" button to immediately dismiss it and start the next pick's timer. If not clicked, it should auto-dismiss after 5 seconds.

[ ] Design this component in a way that the content (e.g., a simple text announcement) can be easily replaced with a more complex animation in the future without changing the surrounding logic.

Instructions for Cursor:

Implement the post-pick announcement modal. This will serve as the placeholder for the future commissioner animation. Ensure the draft flow pauses and resumes correctly around this modal. This is the final step. Update the status when complete.