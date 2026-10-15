import test from "node:test";
import assert from "node:assert/strict";
import { addTile, canMove, emptyBoard, hasWon, isValidBoard, moveBoard, newBoard, readSavedGame } from "../src/game.js";

const row = (values) => [...values, ...Array(12).fill(0)];

test("new games contain two starting tiles and do not mutate inputs", () => {
  const board = newBoard(() => 0);
  assert.equal(board.filter(Boolean).length, 2);
  assert.equal(board.reduce((a, b) => a + b), 4);
  const original = emptyBoard();
  const spawned = addTile(original, () => 0);
  assert.equal(spawned.index, 0);
  assert.equal(spawned.board[0], 2);
  assert.deepEqual(original, emptyBoard());
});

test("tiles merge just once per move", () => {
  const result = moveBoard(row([2, 2, 2, 2]), "left");
  assert.deepEqual(result.board, row([4, 4, 0, 0]));
  assert.equal(result.score, 8);
  assert.deepEqual(result.merged, [0, 1]);
  assert.deepEqual(moveBoard(row([2, 2, 4, 0]), "left").board, row([4, 4, 0, 0]));
  assert.deepEqual(moveBoard(row([4, 4, 8, 8]), "left").board, row([8, 16, 0, 0]));
});

test("empty spaces are compressed before matching", () => {
  assert.deepEqual(moveBoard(row([2, 0, 2, 4]), "left").board, row([4, 4, 0, 0]));
  assert.deepEqual(moveBoard(row([2, 0, 4, 2]), "right").board, row([0, 2, 4, 2]));
});

test("right and down moves merge from the leading edge", () => {
  assert.deepEqual(moveBoard(row([2, 2, 2, 0]), "right").board, row([0, 0, 2, 4]));
  const board = [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0];
  assert.deepEqual(moveBoard(board, "down").board, [0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 4, 0, 0, 0]);
  assert.deepEqual(moveBoard(board, "up").board, [4, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
});

test("no-op moves do not change the board or score", () => {
  const board = row([2, 4, 8, 16]);
  const result = moveBoard(board, "left");
  assert.equal(result.moved, false);
  assert.equal(result.score, 0);
  assert.deepEqual(result.board, board);
  assert.notEqual(result.board, board);
});

test("animation paths include each original tile exactly once", () => {
  const board = row([2, 0, 2, 4]);
  const result = moveBoard(board, "left");
  assert.deepEqual(result.movements, [{ from: 0, to: 0 }, { from: 2, to: 0 }, { from: 3, to: 1 }]);
  assert.deepEqual(board, row([2, 0, 2, 4]));
});

test("new tiles are 2 with 90% probability, otherwise 4; full boards are unchanged", () => {
  for (const [roll, expected] of [[0, 2], [0.8999, 2], [0.9, 4], [0.9999, 4]]) {
    let calls = 0;
    const result = addTile(emptyBoard(), () => calls++ === 0 ? 0.9999 : roll);
    assert.equal(result.index, 15);
    assert.equal(result.board[15], expected);
  }
  const full = Array(16).fill(2);
  assert.deepEqual(addTile(full), { board: full, index: null });
});

test("game over requires a full board without horizontal or vertical matches", () => {
  const locked = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
  assert.equal(canMove(locked), false);
  assert.equal(canMove(locked.with(15, 0)), true);
  assert.equal(canMove(locked.with(1, 2)), true);
  assert.equal(canMove(locked.with(4, 2)), true);
  // A match across row boundaries is not a legal move.
  assert.equal(canMove([2, 4, 2, 8, 8, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]), false);
});

test("2048 and higher win; play can continue beyond the target", () => {
  assert.equal(hasWon(row([1024, 1024, 0, 0])), false);
  const result = moveBoard(row([1024, 1024, 0, 0]), "left");
  assert.equal(result.score, 2048);
  assert.equal(hasWon(result.board), true);
  assert.equal(hasWon(row([4096, 0, 0, 0])), true);
  assert.equal(moveBoard(row([2048, 2048, 0, 0]), "left").board[0], 4096);
});

test("saved state validates dimensions, values, scores and version", () => {
  const saved = { version: 1, board: row([2, 4, 0, 0]), score: 4, moves: 3, continued: true };
  assert.deepEqual(readSavedGame(saved), { board: saved.board, score: 4, moves: 3, continued: true });
  assert.notEqual(readSavedGame(saved).board, saved.board);
  for (const invalid of [null, {}, { ...saved, version: 2 }, { ...saved, board: [2] }, { ...saved, score: -1 }, { ...saved, score: 2.5 }, { ...saved, board: emptyBoard() }, { ...saved, board: row([3, 0, 0, 0]) }]) {
    assert.equal(readSavedGame(invalid), null);
  }
  assert.equal(readSavedGame({ ...saved, moves: -3 }).moves, 0);
  assert.equal(isValidBoard(row([-2, 0, 0, 0])), false);
});

test("random legal games conserve value while shifting and terminate correctly", () => {
  let seed = 123456;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let game = 0; game < 12; game++) {
    let board = newBoard(random);
    let count = 0;
    while (canMove(board) && count++ < 1500) {
      const legal = ["left", "right", "up", "down"].map((direction) => moveBoard(board, direction)).filter((move) => move.moved);
      assert.ok(legal.length > 0);
      const result = legal[Math.floor(random() * legal.length)];
      assert.equal(result.board.reduce((a, b) => a + b), board.reduce((a, b) => a + b));
      assert.ok(isValidBoard(result.board));
      assert.ok(result.score >= 0);
      board = addTile(result.board, random).board;
    }
    assert.equal(canMove(board), false);
    assert.ok(count < 1500);
  }
});

test("invalid directions are rejected", () => {
  assert.throws(() => moveBoard(emptyBoard(), "diagonal"), RangeError);
});
