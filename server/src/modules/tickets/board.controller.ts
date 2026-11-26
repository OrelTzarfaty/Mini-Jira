import {
  boardColumnParamsSchema,
  boardColumnQuerySchema,
  boardQuerySchema,
  INVALID_BOARD_CURSOR_MESSAGE,
} from '@mini-jira/shared';
import type { Board, BoardColumn } from '@mini-jira/shared';
import type { RequestHandler } from 'express';

import { decodeBoardCursor } from '../../lib/board-cursor.js';
import type { BoardCursor } from '../../lib/board-cursor.js';
import { ValidationError } from '../../lib/errors.js';
import { requireProjectAccess } from '../../middleware/project-access.js';
import { parseParams, parseQuery } from '../../middleware/validate.js';
import type { BoardService } from './board.service.js';

type GetBoardHandler = RequestHandler<{ projectKey: string }, Board>;
type GetBoardColumnHandler = RequestHandler<{ projectKey: string; status: string }, BoardColumn>;

export interface BoardController {
  getBoard: GetBoardHandler;
  getColumn: GetBoardColumnHandler;
}

/** The cursor of a "load more" request; a value the API never produced is a 400. */
function parseCursor(cursor: string | undefined): BoardCursor | null {
  if (cursor === undefined) {
    return null;
  }

  const decoded = decodeBoardCursor(cursor);
  if (!decoded) {
    throw new ValidationError(INVALID_BOARD_CURSOR_MESSAGE, [
      { field: 'cursor', message: INVALID_BOARD_CURSOR_MESSAGE },
    ]);
  }

  return decoded;
}

export function createBoardController(boardService: BoardService): BoardController {
  return {
    // BRD-1: loadProjectAccess already checked that the caller is a member. The input is parsed
    // after it, so an outsider gets the 404 and never learns the query rules. The board changes
    // all the time and only members may see it, so no browser or shared cache keeps it.
    async getBoard(req, res) {
      const { project } = requireProjectAccess(req);
      parseQuery(boardQuerySchema, req.query);
      const board = await boardService.getBoard(project);
      res.set('Cache-Control', 'no-store');
      res.json(board);
    },

    // BRD-1 "load more" for one column.
    async getColumn(req, res) {
      const { project } = requireProjectAccess(req);
      const { status } = parseParams(boardColumnParamsSchema, req.params);
      const { cursor } = parseQuery(boardColumnQuerySchema, req.query);
      const column = await boardService.getColumn(project, status, parseCursor(cursor));
      res.set('Cache-Control', 'no-store');
      res.json(column);
    },
  };
}
