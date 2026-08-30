(function () {
  'use strict';

  const { ChessGame, squareName } = window.ChessEngine;

  const PIECE_GLYPHS = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
  };

  const boardEl = document.getElementById('board');
  const turnIndicatorEl = document.getElementById('turn-indicator');
  const messageEl = document.getElementById('message');
  const newGameBtn = document.getElementById('new-game-btn');
  const resignBtn = document.getElementById('resign-btn');
  const moveHistoryEl = document.getElementById('move-history');
  const promotionModal = document.getElementById('promotion-modal');
  const promotionChoicesEl = document.getElementById('promotion-choices');
  const gameOverModal = document.getElementById('game-over-modal');
  const gameOverTextEl = document.getElementById('game-over-text');
  const gameOverNewGameBtn = document.getElementById('game-over-new-game-btn');

  let game = new ChessGame();
  let selected = null; // { r, c } of currently selected square, or null
  let legalTargets = []; // legal moves from the selected square

  function squareElAt(r, c) {
    return boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  }

  function buildBoardSkeleton() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement('div');
        sq.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
        sq.dataset.r = String(r);
        sq.dataset.c = String(c);
        sq.addEventListener('click', () => onSquareClick(r, c));
        const label = document.createElement('span');
        label.className = 'square-label';
        if (c === 0 || r === 7) {
          label.textContent = c === 0 && r === 7 ? squareName(r, c) : (c === 0 ? squareName(r, c)[1] : squareName(r, c)[0]);
        }
        sq.appendChild(label);
        boardEl.appendChild(sq);
      }
    }
  }

  function render() {
    // Clear dynamic content (pieces / dots) but keep the square skeleton.
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = squareElAt(r, c);
        sq.classList.remove('selected', 'in-check');
        sq.querySelectorAll('.piece, .move-dot, .capture-ring').forEach((el) => el.remove());
        const piece = game.board[r][c];
        if (piece) {
          const span = document.createElement('span');
          span.className = 'piece';
          span.textContent = PIECE_GLYPHS[piece.color][piece.type];
          sq.appendChild(span);
        }
      }
    }

    if (selected) {
      squareElAt(selected.r, selected.c).classList.add('selected');
      for (const move of legalTargets) {
        const targetSq = squareElAt(move.to.r, move.to.c);
        const marker = document.createElement('div');
        marker.className = move.captured || move.isEnPassant ? 'capture-ring' : 'move-dot';
        targetSq.appendChild(marker);
      }
    }

    if (game.status === 'active' || game.status === undefined) {
      const kingInCheck = game.isInCheck(game.turn);
      if (kingInCheck) {
        const kingPos = game.findKing(game.turn);
        if (kingPos) squareElAt(kingPos.r, kingPos.c).classList.add('in-check');
      }
    }

    turnIndicatorEl.textContent = game.isGameOver()
      ? 'Game over'
      : `${game.turn === 'w' ? 'White' : 'Black'} to move`;
    messageEl.textContent = game.status === 'active' ? game.getStatusMessage() : '';

    renderHistory();

    if (game.isGameOver()) {
      showGameOver();
    }
  }

  function renderHistory() {
    moveHistoryEl.innerHTML = '';
    game.history.forEach((m, i) => {
      const li = document.createElement('li');
      const moveNo = Math.floor(i / 2) + 1;
      const prefix = i % 2 === 0 ? `${moveNo}. ` : '';
      li.textContent = `${prefix}${m.san}`;
      moveHistoryEl.appendChild(li);
    });
    moveHistoryEl.scrollTop = moveHistoryEl.scrollHeight;
  }

  function showGameOver() {
    gameOverTextEl.textContent = game.getStatusMessage() || 'Game over.';
    gameOverModal.classList.remove('hidden');
  }

  function hideGameOver() {
    gameOverModal.classList.add('hidden');
  }

  function onSquareClick(r, c) {
    if (game.isGameOver()) return;
    const piece = game.board[r][c];

    if (selected) {
      const chosen = legalTargets.find((m) => m.to.r === r && m.to.c === c);
      if (chosen) {
        if (chosen.promotion) {
          askPromotion(chosen.piece.color, (promo) => {
            game.move(squareName(selected.r, selected.c), squareName(r, c), promo);
            clearSelection();
            render();
          });
          return;
        }
        game.move(squareName(selected.r, selected.c), squareName(r, c));
        clearSelection();
        render();
        return;
      }
      // Clicking another own piece re-selects; clicking elsewhere deselects.
      if (piece && piece.color === game.turn) {
        selectSquare(r, c);
      } else {
        clearSelection();
        render();
      }
      return;
    }

    if (piece && piece.color === game.turn) {
      selectSquare(r, c);
    }
  }

  function selectSquare(r, c) {
    selected = { r, c };
    legalTargets = game.getLegalMoves(selected);
    render();
  }

  function clearSelection() {
    selected = null;
    legalTargets = [];
  }

  function askPromotion(color, callback) {
    promotionChoicesEl.innerHTML = '';
    ['q', 'r', 'b', 'n'].forEach((type) => {
      const btn = document.createElement('button');
      btn.textContent = PIECE_GLYPHS[color][type];
      btn.addEventListener('click', () => {
        promotionModal.classList.add('hidden');
        callback(type);
      });
      promotionChoicesEl.appendChild(btn);
    });
    promotionModal.classList.remove('hidden');
  }

  function startNewGame() {
    game = new ChessGame();
    clearSelection();
    hideGameOver();
    render();
  }

  newGameBtn.addEventListener('click', startNewGame);
  gameOverNewGameBtn.addEventListener('click', startNewGame);
  resignBtn.addEventListener('click', () => {
    if (game.isGameOver()) return;
    game.resign(game.turn);
    clearSelection();
    render();
  });

  buildBoardSkeleton();
  render();
})();
