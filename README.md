# Open Historia

**Open Historia** is an LLM-powered grand strategy engine where history is written by you and the AI.

![Open Historia](https://placehold.co/600x400/1e293b/amber?text=Open+Historia)

## Features

*   **Generative Game Master:** Choose your AI provider (DeepSeek, Google Gemini, OpenAI, Anthropic) to drive the simulation.
*   **Infinite Scenarios:** Play in 2026, 1945, Ancient Rome, or a Cyberpunk future. The game adapts visually and narratively to your prompt.
*   **Diplomacy Engine:** Chat directly with AI-controlled nations. They will react based on their geopolitical situation and the difficulty level.
*   **Dynamic Maps:** A real-world map engine (D3.js + TopoJSON) that updates territories dynamically as you conquer or trade.

## Getting Started

1.  **Clone the repo:**
    ```bash
    git clone https://github.com/sarthakagrawal927/open-historia.git
    cd open-historia
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the game:**
    ```bash
    npm run dev
    ```

4.  **Play:**
    *   Open `http://localhost:3000`.
    *   Enter your API Key (stored locally and encrypted).
    *   Pick a nation and start rewriting history.

## Tech Stack

*   **Framework:** Next.js 15 (React, TypeScript)
*   **Styling:** Tailwind CSS
*   **Map Engine:** D3.js + TopoJSON
*   **AI Integration:** Google Generative AI SDK, OpenAI SDK, Anthropic SDK

## Credits

Created by **Sarthak Agrawal** and **Gemini**.

*   **Lead Developer:** Sarthak Agrawal
*   **AI Co-Pilot:** Google Gemini