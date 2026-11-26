import { boardQuerySchema } from '@mini-jira/shared';
import type { Board } from '@mini-jira/shared';
import type { RequestHandler } from 'express';

import { requireProjectAccess } from '../../middleware/project-access.js';
import { parseQuery } from '../../middleware/validate.js';
import type { BoardService } from './board.service.js';

type GetBoardHandler = RequestHandler<{ projectKey: string }, Board>;

export interface BoardController {
  getBoard: GetBoardHandler;
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
  };
}
