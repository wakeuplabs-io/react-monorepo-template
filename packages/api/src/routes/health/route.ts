import { Request, Response, Router, NextFunction } from "express";

const router = Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).send("Ok");
  } catch (error) {
    next(error);
  }
});

export default router;
