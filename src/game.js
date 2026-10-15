export const SIZE = 4;
export const TARGET = 2048;

export function emptyBoard() {
  return Array(SIZE * SIZE).fill(0);
}

export function isValidBoard(board) {
  return Array.isArray(board) && board.length === SIZE * SIZE && board.every(
    (value) => value === 0 || (Number.isSafeInteger(value) && value >= 2 && Number.isInteger(Math.log2(value))),
  );
}

export function addTile(board, random = Math.random) {
  const empty = board.flatMap((value, index) => value === 0 ? [index] : []);
  if (!empty.length) return { board: [...board], index: null };
  const index = empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))];
  const next = [...board];
  next[index] = random() < 0.9 ? 2 : 4;
  return { board: next, index };
}

export function newBoard(random = Math.random) {
  return addTile(addTile(emptyBoard(), random).board, random).board;
}

function lineIndices(direction, line) {
  return Array.from({ length: SIZE }, (_, position) => {
    if (direction === "left") return line * SIZE + position;
    if (direction === "right") return line * SIZE + (SIZE - 1 - position);
    if (direction === "up") return position * SIZE + line;
    return (SIZE - 1 - position) * SIZE + line;
  });
}

/** Shift and merge once per tile. Animation paths refer to the original board. */
export function moveBoard(board, direction) {
  if (!["left", "right", "up", "down"].includes(direction)) {
    throw new RangeError(`Unknown direction: ${direction}`);
  }
  const next = emptyBoard();
  const movements = [];
  const merged = [];
  let score = 0;

  for (let line = 0; line < SIZE; line++) {
    const indices = lineIndices(direction, line);
    const tiles = indices.filter((index) => board[index] !== 0);
    let destination = 0;
    for (let source = 0; source < tiles.length; source++) {
      const from = tiles[source];
      const to = indices[destination++];
      const value = board[from];
      movements.push({ from, to });
      if (source + 1 < tiles.length && value === board[tiles[source + 1]]) {
        movements.push({ from: tiles[++source], to });
        next[to] = value * 2;
        score += next[to];
        merged.push(to);
      } else {
        next[to] = value;
      }
    }
  }

  return {
    board: next,
    score,
    moved: next.some((value, index) => value !== board[index]),
    movements,
    merged,
  };
}

export function canMove(board) {
  return board.some((value, index) => value === 0
    || (index % SIZE < SIZE - 1 && value === board[index + 1])
    || (index < SIZE * (SIZE - 1) && value === board[index + SIZE]));
}

export function hasWon(board) {
  return board.some((value) => value >= TARGET);
}

export function readSavedGame(value) {
  if (!value || value.version !== 1 || !isValidBoard(value.board)
    || !value.board.some(Boolean) || !Number.isSafeInteger(value.score) || value.score < 0) return null;
  return {
    board: [...value.board],
    score: value.score,
    moves: Number.isSafeInteger(value.moves) && value.moves >= 0 ? value.moves : 0,
    continued: value.continued === true,
  };
}
