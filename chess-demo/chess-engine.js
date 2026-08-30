/**
 * Dependency-free chess rules engine implementing standard FIDE rules:
 * - Legal move generation for all pieces
 * - Check, checkmate, and stalemate detection
 * - Castling (kingside/queenside), en passant, pawn promotion
 * - Fifty-move rule and threefold repetition draw detection
 *
 * Works in both the browser (as a plain <script>) and Node.js (via module.exports),
 * so the same file can be unit tested with `node`.
 */
(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = engine;
  } else {
    root.ChessEngine = engine;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const WHITE = 'w';
  const BLACK = 'b';

  const PIECE_ORDER = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

  function otherColor(color) {
    return color === WHITE ? BLACK : WHITE;
  }

  function inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function squareName(r, c) {
    return String.fromCharCode(97 + c) + (8 - r);
  }

  function parseSquare(name) {
    const c = name.charCodeAt(0) - 97;
    const r = 8 - parseInt(name.slice(1), 10);
    return { r, c };
  }

  /**
   * Piece representation: { type: 'p'|'n'|'b'|'r'|'q'|'k', color: 'w'|'b' } or null for empty.
   */
  class ChessGame {
    constructor() {
      this.reset();
    }

    reset() {
      this.board = this._initialBoard();
      this.turn = WHITE;
      // Castling rights: king/rook have not moved
      this.castling = { wK: true, wQ: true, bK: true, bQ: true };
      // En passant target square {r,c} capturable this move, or null
      this.enPassant = null;
      this.halfmoveClock = 0; // resets on pawn move or capture; 100 half-moves = 50 full moves
      this.fullmoveNumber = 1;
      this.history = []; // list of move records for undo / display
      this.positionCounts = new Map(); // for threefold repetition
      this.status = 'active'; // 'active' | 'checkmate' | 'stalemate' | 'draw-fifty' | 'draw-repetition' | 'resigned'
      this.winner = null; // 'w' | 'b' | null
      this._recordPosition();
    }

    _initialBoard() {
      const board = Array.from({ length: 8 }, () => Array(8).fill(null));
      for (let c = 0; c < 8; c++) {
        board[0][c] = { type: PIECE_ORDER[c], color: BLACK };
        board[1][c] = { type: 'p', color: BLACK };
        board[6][c] = { type: 'p', color: WHITE };
        board[7][c] = { type: PIECE_ORDER[c], color: WHITE };
      }
      return board;
    }

    _positionKey() {
      // Board + turn + castling rights + en passant target column define a "position"
      // for threefold repetition purposes.
      let key = '';
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = this.board[r][c];
          key += p ? p.color + p.type : '--';
        }
      }
      key += this.turn;
      key += (this.castling.wK ? 'K' : '') + (this.castling.wQ ? 'Q' : '') +
        (this.castling.bK ? 'k' : '') + (this.castling.bQ ? 'q' : '');
      key += this.enPassant ? squareName(this.enPassant.r, this.enPassant.c) : '-';
      return key;
    }

    _recordPosition() {
      const key = this._positionKey();
      const count = (this.positionCounts.get(key) || 0) + 1;
      this.positionCounts.set(key, count);
      if (count >= 3 && this.status === 'active') {
        this.status = 'draw-repetition';
      }
    }

    findKing(color, board = this.board) {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.type === 'k' && p.color === color) return { r, c };
        }
      }
      return null;
    }

    isSquareAttacked(r, c, byColor, board = this.board) {
      // Pawn attacks
      const pawnDir = byColor === WHITE ? 1 : -1; // attacking pawn sits one rank "behind" from target's perspective
      for (const dc of [-1, 1]) {
        const pr = r + pawnDir;
        const pc = c + dc;
        if (inBounds(pr, pc)) {
          const p = board[pr][pc];
          if (p && p.type === 'p' && p.color === byColor) return true;
        }
      }
      // Knight attacks
      const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      for (const [dr, dc] of knightOffsets) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc)) {
          const p = board[nr][nc];
          if (p && p.type === 'n' && p.color === byColor) return true;
        }
      }
      // King attacks (adjacent squares)
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (inBounds(nr, nc)) {
            const p = board[nr][nc];
            if (p && p.type === 'k' && p.color === byColor) return true;
          }
        }
      }
      // Sliding pieces: rook/queen (orthogonal), bishop/queen (diagonal)
      const rookDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      const bishopDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of rookDirs) {
        let nr = r + dr, nc = c + dc;
        while (inBounds(nr, nc)) {
          const p = board[nr][nc];
          if (p) {
            if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
            break;
          }
          nr += dr; nc += dc;
        }
      }
      for (const [dr, dc] of bishopDirs) {
        let nr = r + dr, nc = c + dc;
        while (inBounds(nr, nc)) {
          const p = board[nr][nc];
          if (p) {
            if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
            break;
          }
          nr += dr; nc += dc;
        }
      }
      return false;
    }

    isInCheck(color, board = this.board) {
      const kingPos = this.findKing(color, board);
      if (!kingPos) return false;
      return this.isSquareAttacked(kingPos.r, kingPos.c, otherColor(color), board);
    }

    /**
     * Generates pseudo-legal moves for the piece at (r,c) — i.e. moves that follow
     * piece movement rules but may leave the mover's own king in check.
     * Each move: { from:{r,c}, to:{r,c}, piece, captured, promotion, isEnPassant, isCastle: 'K'|'Q'|null }
     */
    _pseudoMovesForSquare(r, c, board = this.board) {
      const piece = board[r][c];
      if (!piece) return [];
      const moves = [];
      const color = piece.color;
      const forward = color === WHITE ? -1 : 1;
      const startRank = color === WHITE ? 6 : 1;
      const promotionRank = color === WHITE ? 0 : 7;

      const pushMove = (tr, tc, extra = {}) => {
        moves.push(Object.assign({
          from: { r, c }, to: { r: tr, c: tc }, piece,
          captured: board[tr][tc], promotion: null, isEnPassant: false, isCastle: null,
        }, extra));
      };

      if (piece.type === 'p') {
        const oneStep = r + forward;
        if (inBounds(oneStep, c) && !board[oneStep][c]) {
          if (oneStep === promotionRank) {
            for (const promo of ['q', 'r', 'b', 'n']) pushMove(oneStep, c, { promotion: promo });
          } else {
            pushMove(oneStep, c);
          }
          const twoStep = r + forward * 2;
          if (r === startRank && !board[twoStep][c]) {
            pushMove(twoStep, c, { isDoubleStep: true });
          }
        }
        for (const dc of [-1, 1]) {
          const tr = r + forward, tc = c + dc;
          if (!inBounds(tr, tc)) continue;
          const target = board[tr][tc];
          if (target && target.color !== color) {
            if (tr === promotionRank) {
              for (const promo of ['q', 'r', 'b', 'n']) pushMove(tr, tc, { promotion: promo });
            } else {
              pushMove(tr, tc);
            }
          } else if (!target && this.enPassant && this.enPassant.r === tr && this.enPassant.c === tc) {
            pushMove(tr, tc, { isEnPassant: true, captured: board[r][tc] });
          }
        }
      } else if (piece.type === 'n') {
        const offsets = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1],
        ];
        for (const [dr, dc] of offsets) {
          const tr = r + dr, tc = c + dc;
          if (!inBounds(tr, tc)) continue;
          const target = board[tr][tc];
          if (!target || target.color !== color) pushMove(tr, tc);
        }
      } else if (piece.type === 'k') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const tr = r + dr, tc = c + dc;
            if (!inBounds(tr, tc)) continue;
            const target = board[tr][tc];
            if (!target || target.color !== color) pushMove(tr, tc);
          }
        }
        // Castling
        const rights = this.castling;
        const rank = color === WHITE ? 7 : 0;
        if (r === rank && c === 4) {
          const canCastleK = color === WHITE ? rights.wK : rights.bK;
          const canCastleQ = color === WHITE ? rights.wQ : rights.bQ;
          const enemy = otherColor(color);
          if (canCastleK && !board[rank][5] && !board[rank][6] &&
            board[rank][7] && board[rank][7].type === 'r' && board[rank][7].color === color) {
            if (!this.isSquareAttacked(rank, 4, enemy, board) &&
              !this.isSquareAttacked(rank, 5, enemy, board) &&
              !this.isSquareAttacked(rank, 6, enemy, board)) {
              pushMove(rank, 6, { isCastle: 'K' });
            }
          }
          if (canCastleQ && !board[rank][1] && !board[rank][2] && !board[rank][3] &&
            board[rank][0] && board[rank][0].type === 'r' && board[rank][0].color === color) {
            if (!this.isSquareAttacked(rank, 4, enemy, board) &&
              !this.isSquareAttacked(rank, 3, enemy, board) &&
              !this.isSquareAttacked(rank, 2, enemy, board)) {
              pushMove(rank, 2, { isCastle: 'Q' });
            }
          }
        }
      } else {
        // Sliding pieces: bishop, rook, queen
        let dirs = [];
        if (piece.type === 'b') dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        if (piece.type === 'r') dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        if (piece.type === 'q') dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of dirs) {
          let tr = r + dr, tc = c + dc;
          while (inBounds(tr, tc)) {
            const target = board[tr][tc];
            if (!target) {
              pushMove(tr, tc);
            } else {
              if (target.color !== color) pushMove(tr, tc);
              break;
            }
            tr += dr; tc += dc;
          }
        }
      }
      return moves;
    }

    _applyMoveToBoard(move, board) {
      const { from, to, piece } = move;
      const newBoard = cloneBoard(board);
      newBoard[from.r][from.c] = null;
      newBoard[to.r][to.c] = move.promotion ? { type: move.promotion, color: piece.color } : piece;
      if (move.isEnPassant) {
        newBoard[from.r][to.c] = null; // captured pawn sits beside the mover, on the origin rank
      }
      if (move.isCastle === 'K') {
        const rank = from.r;
        newBoard[rank][5] = newBoard[rank][7];
        newBoard[rank][7] = null;
      } else if (move.isCastle === 'Q') {
        const rank = from.r;
        newBoard[rank][3] = newBoard[rank][0];
        newBoard[rank][0] = null;
      }
      return newBoard;
    }

    /** All legal moves for the side to move (or a specific square if given). */
    getLegalMoves(square = null) {
      const color = this.turn;
      const squares = [];
      if (square) {
        squares.push(square);
      } else {
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const p = this.board[r][c];
            if (p && p.color === color) squares.push({ r, c });
          }
        }
      }
      const legal = [];
      for (const { r, c } of squares) {
        const piece = this.board[r][c];
        if (!piece || piece.color !== color) continue;
        const pseudo = this._pseudoMovesForSquare(r, c);
        for (const move of pseudo) {
          const resultingBoard = this._applyMoveToBoard(move, this.board);
          if (!this.isInCheck(color, resultingBoard)) {
            legal.push(move);
          }
        }
      }
      return legal;
    }

    getLegalMovesFrom(squareName_) {
      const { r, c } = parseSquare(squareName_);
      return this.getLegalMoves({ r, c });
    }

    /**
     * Attempts to play a move. Returns { ok: true, move } on success,
     * or { ok: false, reason } if illegal or the game has already ended.
     * `promotion` (optional 'q'|'r'|'b'|'n') selects the promotion piece when relevant.
     */
    move(fromName, toName, promotion) {
      if (this.status !== 'active') {
        return { ok: false, reason: 'Game is over.' };
      }
      const from = parseSquare(fromName);
      const to = parseSquare(toName);
      const piece = this.board[from.r][from.c];
      if (!piece || piece.color !== this.turn) {
        return { ok: false, reason: 'No piece of the side to move on that square.' };
      }
      const legal = this.getLegalMoves(from);
      const candidates = legal.filter((m) => m.to.r === to.r && m.to.c === to.c);
      if (candidates.length === 0) {
        return { ok: false, reason: 'Illegal move.' };
      }
      let chosen = candidates[0];
      if (candidates.length > 1) {
        // Multiple candidates only happens for pawn promotion choices.
        chosen = candidates.find((m) => m.promotion === promotion) || candidates[0];
      }

      const isPawnMove = piece.type === 'p';
      const isCapture = !!chosen.captured;

      this.board = this._applyMoveToBoard(chosen, this.board);

      // Update castling rights
      if (piece.type === 'k') {
        if (piece.color === WHITE) { this.castling.wK = false; this.castling.wQ = false; }
        else { this.castling.bK = false; this.castling.bQ = false; }
      }
      const rookMoved = (r, c) => {
        if (r === 7 && c === 0) this.castling.wQ = false;
        if (r === 7 && c === 7) this.castling.wK = false;
        if (r === 0 && c === 0) this.castling.bQ = false;
        if (r === 0 && c === 7) this.castling.bK = false;
      };
      if (piece.type === 'r') rookMoved(from.r, from.c);
      if (chosen.captured) {
        // A captured rook on its home square also revokes castling rights for that side.
        const capturedSquare = chosen.isEnPassant ? { r: from.r, c: to.c } : to;
        rookMoved(capturedSquare.r, capturedSquare.c);
      }

      // Update en passant target
      this.enPassant = chosen.isDoubleStep
        ? { r: (from.r + to.r) / 2, c: from.c }
        : null;

      // Halfmove clock for fifty-move rule
      this.halfmoveClock = (isPawnMove || isCapture) ? 0 : this.halfmoveClock + 1;

      if (this.turn === BLACK) this.fullmoveNumber += 1;
      this.turn = otherColor(this.turn);

      this.history.push({
        from: fromName, to: toName, piece: piece.type, color: piece.color,
        captured: chosen.captured ? chosen.captured.type : null,
        promotion: chosen.promotion, isCastle: chosen.isCastle, isEnPassant: chosen.isEnPassant,
        san: this._toSan(chosen),
      });

      this._evaluateGameEnd();
      this._recordPosition();

      return { ok: true, move: chosen };
    }

    _toSan(move) {
      // Lightweight, human-readable move notation (not full disambiguation-aware SAN).
      if (move.isCastle === 'K') return 'O-O';
      if (move.isCastle === 'Q') return 'O-O-O';
      const pieceLetter = move.piece.type === 'p' ? '' : move.piece.type.toUpperCase();
      const capture = move.captured ? 'x' : '';
      const fromFile = move.piece.type === 'p' && move.captured ? squareName(move.from.r, move.from.c)[0] : '';
      const promo = move.promotion ? '=' + move.promotion.toUpperCase() : '';
      return `${pieceLetter}${fromFile}${capture}${squareName(move.to.r, move.to.c)}${promo}`;
    }

    _evaluateGameEnd() {
      const color = this.turn; // side to move now, after the move just played
      const legalMoves = this.getLegalMoves();
      const inCheck = this.isInCheck(color);
      if (legalMoves.length === 0) {
        if (inCheck) {
          this.status = 'checkmate';
          this.winner = otherColor(color);
        } else {
          this.status = 'stalemate';
          this.winner = null;
        }
        return;
      }
      if (this.halfmoveClock >= 100) {
        this.status = 'draw-fifty';
        this.winner = null;
      }
      // Threefold repetition is checked in _recordPosition (called after this).
    }

    resign(color) {
      if (this.status !== 'active') return { ok: false, reason: 'Game is already over.' };
      this.status = 'resigned';
      this.winner = otherColor(color);
      return { ok: true };
    }

    isGameOver() {
      return this.status !== 'active';
    }

    getStatusMessage() {
      switch (this.status) {
        case 'checkmate':
          return `Checkmate — ${this.winner === WHITE ? 'White' : 'Black'} wins.`;
        case 'stalemate':
          return 'Stalemate — Draw.';
        case 'draw-fifty':
          return 'Draw — fifty-move rule.';
        case 'draw-repetition':
          return 'Draw — threefold repetition.';
        case 'resigned':
          return `${this.winner === WHITE ? 'White' : 'Black'} wins by resignation.`;
        default:
          return this.isInCheck(this.turn) ? `${this.turn === WHITE ? 'White' : 'Black'} is in check.` : '';
      }
    }
  }

  return { ChessGame, squareName, parseSquare, WHITE, BLACK };
});
