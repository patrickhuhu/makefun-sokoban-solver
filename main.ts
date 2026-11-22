import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const letters = 'urdl';
type State = { player: number; boxes: number[]; moves: string };

function walks(player: number, floor: Set<number>, boxes: number[], steps: number[]) {
  const paths = new Map([[player, '']]);
  for (const [cell, path] of paths) {
    for (const [direction, step] of steps.entries()) {
      const next = cell + step;
      if (floor.has(next) && !paths.has(next) && !boxes.includes(next)) {
        paths.set(next, path + letters[direction]);
      }
    }
  }
  return paths;
}

function solveRoom(entry: number, floor: Set<number>, goals: Set<number>, boxes: number[], steps: number[]) {
  // Reverse pushes give an optimistic distance to the nearest goal.
  const distance = new Map<number, number>();
  for (const goal of goals) distance.set(goal, 0);
  for (const [cell, cost] of distance) {
    for (const step of steps) {
      const previous = cell - step;
      if (previous !== entry && floor.has(previous) && floor.has(previous - step) && !distance.has(previous)) {
        distance.set(previous, cost + 1);
      }
    }
  }

  const lowerBound = boxes.reduce((sum, box) => sum + (distance.get(box) ?? Infinity), 0);
  if (!Number.isFinite(lowerBound)) return;
  const buckets: State[][] = [];
  buckets[lowerBound] = [{ player: entry, boxes: boxes.sort((a, b) => a - b), moves: '' }];
  const visited = new Set<string>();
  for (let estimate = lowerBound; estimate < buckets.length; estimate++) {
    const bucket = buckets[estimate];
    if (!bucket) continue;
    while (bucket.length) {
      const state = bucket.pop()!;
      const paths = walks(state.player, floor, state.boxes, steps);
      // All walking positions in the same region offer the same available pushes.
      const key = `${Math.min(...paths.keys())}:${state.boxes.join(',')}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (state.boxes.every(box => goals.has(box))) return state.moves + (paths.get(entry) ?? '');

      for (const box of state.boxes) {
        for (const [direction, step] of steps.entries()) {
          const target = box + step;
          const path = paths.get(box - step);
          const rest = distance.get(target);
          if (path === undefined || rest === undefined || state.boxes.includes(target)) continue;
          const next = state.boxes.map(cell => cell === box ? target : cell).sort((a, b) => a - b);
          // A legal push changes this box's distance by at most one downward.
          const priority = estimate + 1 + rest - distance.get(box)!;
          (buckets[priority] ??= []).push({ player: box, boxes: next, moves: state.moves + path + letters[direction] });
        }
      }
    }
  }
}

function solve(level: string) {
  const rows = level.trimEnd().split(/\r?\n/);
  const width = rows[0].length;
  const board = rows.join('');
  const steps = [-width, 1, width, -1];
  let player = board.search(/[@+]/);
  const hall = player - player % width;
  let moves = '';

  for (let entry = hall + 1; entry < hall + width - 1; entry++) {
    const floor = new Set([entry]);
    const goals = new Set<number>();
    const boxes: number[] = [];
    for (const cell of floor) {
      for (const step of steps) {
        const next = cell + step;
        if ((next < hall || next >= hall + width) && board[next] && board[next] !== '#') {
          floor.add(next);
        }
      }
      if ('.*+'.includes(board[cell])) goals.add(cell);
      if ('$*'.includes(board[cell])) boxes.push(cell);
    }
    if (!boxes.length) continue;

    const room = solveRoom(entry, floor, goals, boxes, steps);
    if (room === undefined) return '';
    moves += (entry < player ? 'l' : 'r').repeat(Math.abs(entry - player)) + room;
    player = entry;
  }
  return moves;
}

const input = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(input).sort()) {
  const moves = solve(readFileSync(`${input}/${id}/level.txt`, 'utf8'));
  mkdirSync(`${output}/${id}`, { recursive: true });
  writeFileSync(`${output}/${id}/solution.txt`, `${moves}\n`);
}
