# Chess Demo

A local, two-player "hot-seat" chess app built for **BRD-001 — Interactive Chess App**.
Two players share one device/screen and play a full game of standard chess in the browser.

No build step, no external dependencies, no server-side code — just static
HTML/CSS/JS that runs entirely in the browser.

## Running it

Open `index.html` directly in a browser, or serve the folder with any static
file server, e.g.:

```bash
cd chess-demo
python3 -m http.server 8000
# then visit http://localhost:8000/
```

## How to play

- Click a piece to select it — legal destination squares are highlighted
  (a dot for a quiet move, a red ring for a capture).
- Click a highlighted square to make the move.
- Pawn promotion prompts you to choose the piece (queen, rook, bishop, or knight).
- **New Game** resets the board. **Resign** immediately ends the game for the
  side to move and declares the opponent the winner.
- The status bar shows whose turn it is and flags check, checkmate, stalemate,
  the fifty-move rule, and threefold repetition.

## What's implemented (per BRD-001)

- Standard starting position and alternating turn enforcement (FR-1, FR-2)
- Full legal move validation for every piece, illegal moves are rejected (FR-3)
- Castling (kingside/queenside), en passant, and pawn promotion with piece choice (FR-4)
- Check warning, checkmate detection with winner, and draw detection for
  stalemate, the fifty-move rule, and threefold repetition (FR-5, FR-6, FR-7)
- New Game and Resign controls (FR-8, FR-9)
- Legal-move highlighting on piece selection (FR-10)

Out of scope, per the BRD: online/networked multiplayer, accounts, PGN
import/export, chess clocks, an AI opponent, puzzles, ratings/matchmaking,
and non-default accessibility features.

## Files

- `chess-engine.js` — dependency-free rules engine (move generation, check/
  checkmate/stalemate detection, castling, en passant, promotion, fifty-move
  rule, threefold repetition). Usable from both the browser and Node.
- `chess-engine.test.js` — scripted test scenarios for the engine. Run with
  `node chess-engine.test.js`.
- `index.html` / `style.css` / `app.js` — the board UI and game controls.
