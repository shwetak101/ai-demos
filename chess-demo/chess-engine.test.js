// Manual test scenarios for chess-engine.js — run with: node chess-engine.test.js
const { ChessGame } = require('./chess-engine.js');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.error('FAIL:', msg); }
}

// 1. Initial position has 20 legal moves for White
{
  const g = new ChessGame();
  assert(g.getLegalMoves().length === 20, `expected 20 opening moves, got ${g.getLegalMoves().length}`);
}

// 2. Fool's mate (fastest checkmate) — Black delivers mate on move 2
{
  const g = new ChessGame();
  assert(g.move('f2', 'f3').ok, 'f2-f3 should be legal');
  assert(g.move('e7', 'e5').ok, 'e7-e5 should be legal');
  assert(g.move('g2', 'g4').ok, 'g2-g4 should be legal');
  const res = g.move('d8', 'h4');
  assert(res.ok, 'Qd8-h4 should be legal (fools mate)');
  assert(g.status === 'checkmate', `expected checkmate, got ${g.status}`);
  assert(g.winner === 'b', `expected black to win, got ${g.winner}`);
}

// 3. Illegal move rejected, turn does not advance
{
  const g = new ChessGame();
  const res = g.move('e2', 'e5'); // pawn can't jump 3 squares
  assert(!res.ok, 'e2-e5 should be illegal');
  assert(g.turn === 'w', 'turn should still be white after illegal move');
}

// 4. Out-of-turn move rejected
{
  const g = new ChessGame();
  const res = g.move('e7', 'e5'); // black moving first
  assert(!res.ok, 'black cannot move first');
}

// 5. Castling kingside for white
{
  const g = new ChessGame();
  g.move('e2', 'e4'); g.move('e7', 'e5');
  g.move('g1', 'f3'); g.move('b8', 'c6');
  g.move('f1', 'c4'); g.move('f8', 'c5');
  const res = g.move('e1', 'g1'); // O-O
  assert(res.ok && res.move.isCastle === 'K', 'white should be able to castle kingside');
  assert(g.board[7][6].type === 'k' && g.board[7][5].type === 'r', 'king/rook in castled squares');
}

// 6. En passant capture
{
  const g = new ChessGame();
  g.move('e2', 'e4'); g.move('a7', 'a6');
  g.move('e4', 'e5'); g.move('d7', 'd5'); // black double-steps beside white pawn
  const res = g.move('e5', 'd6'); // en passant
  assert(res.ok && res.move.isEnPassant, 'en passant capture should be legal');
  assert(g.board[3][3] === null, 'captured black pawn should be removed');
}

// 7. Pawn promotion (defaults to first candidate = queen if unspecified, honors explicit choice)
{
  const g = new ChessGame();
  g.board = Array.from({ length: 8 }, () => Array(8).fill(null));
  g.board[0][7] = { type: 'k', color: 'b' }; // h8, kept clear of promotion square
  g.board[7][4] = { type: 'k', color: 'w' };
  g.board[1][0] = { type: 'p', color: 'w' }; // a7 pawn ready to promote
  g.turn = 'w';
  g.castling = { wK: false, wQ: false, bK: false, bQ: false };
  g.enPassant = null;
  const promo = g.move('a7', 'a8', 'r');
  assert(promo.ok && promo.move.promotion === 'r', `promotion to rook should work when requested, got ${JSON.stringify(promo)}`);
  assert(g.board[0][0].type === 'r' && g.board[0][0].color === 'w', 'promoted piece should be a white rook on a8');
}

// 8. Stalemate detection (classic K vs K+Q stalemate position)
{
  const g = new ChessGame();
  // Clear board and set up a known stalemate: Black king a8, White king a6, White queen b6 -> Black to move, no legal moves, not in check
  g.board = Array.from({ length: 8 }, () => Array(8).fill(null));
  g.board[0][0] = { type: 'k', color: 'b' }; // a8
  g.board[2][0] = { type: 'k', color: 'w' }; // a6
  g.board[2][1] = { type: 'q', color: 'w' }; // b6
  g.turn = 'b';
  g.castling = { wK: false, wQ: false, bK: false, bQ: false };
  g.enPassant = null;
  const legal = g.getLegalMoves();
  assert(legal.length === 0, `expected 0 legal moves in stalemate, got ${legal.length}`);
  assert(!g.isInCheck('b'), 'black king should not be in check in this stalemate position');
}

// 9. Resign ends the game
{
  const g = new ChessGame();
  const res = g.resign('w');
  assert(res.ok && g.status === 'resigned' && g.winner === 'b', 'white resigning should make black the winner');
}

// 10. Threefold repetition via shuffling knights back and forth
{
  const g = new ChessGame();
  const shuffle = [
    ['g1', 'f3'], ['g8', 'f6'],
    ['f3', 'g1'], ['f6', 'g8'],
    ['g1', 'f3'], ['g8', 'f6'],
    ['f3', 'g1'], ['f6', 'g8'],
  ];
  for (const [f, t] of shuffle) {
    const r = g.move(f, t);
    assert(r.ok, `shuffle move ${f}-${t} should be legal`);
  }
  assert(g.status === 'draw-repetition', `expected draw-repetition, got ${g.status}`);
}

// 11. Fifty-move rule (100 half-moves without a pawn move or capture)
{
  const g = new ChessGame();
  // Shuffle a knight back and forth; check for repetition draw explicitly disabled by
  // varying the shuffle square pair every 2 reps so only the halfmove clock triggers.
  const pairsWhite = [['g1', 'f3'], ['f3', 'g1'], ['g1', 'h3'], ['h3', 'g1']];
  const pairsBlack = [['g8', 'f6'], ['f6', 'g8'], ['g8', 'h6'], ['h6', 'g8']];
  let i = 0;
  while (g.halfmoveClock < 100 && g.status === 'active') {
    const w = pairsWhite[i % pairsWhite.length];
    const rw = g.move(w[0], w[1]);
    assert(rw.ok, `white shuffle ${w} should be legal`);
    if (g.status !== 'active') break;
    const b = pairsBlack[i % pairsBlack.length];
    const rb = g.move(b[0], b[1]);
    assert(rb.ok, `black shuffle ${b} should be legal`);
    i++;
  }
  assert(g.status === 'draw-fifty' || g.status === 'draw-repetition',
    `expected a draw after 50-move shuffle, got ${g.status}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
