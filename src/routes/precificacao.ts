import { Router, Request, Response } from "express";
import db from "../database";

const router = Router();

// listar historico
router.get("/", (_req: Request, res: Response) => {
  const items = db.prepare("SELECT * FROM pricing ORDER BY created_at DESC").all();
  res.json(items);
});

// salvar calculo
router.post("/", (req: Request, res: Response) => {
  const { product_name, cost_price, markup_percent } = req.body;
  if (!product_name || cost_price == null || markup_percent == null) {
    res.status(400).json({ error: "Preencha todos os campos" });
    return;
  }
  const sell_price = cost_price * (1 + markup_percent / 100);
  const result = db.prepare(
    "INSERT INTO pricing (product_name, cost_price, markup_percent, sell_price) VALUES (?, ?, ?, ?)"
  ).run(product_name, cost_price, markup_percent, Math.round(sell_price * 100) / 100);
  res.json({ id: result.lastInsertRowid, sell_price: Math.round(sell_price * 100) / 100 });
});

// deletar
router.delete("/:id", (req: Request, res: Response) => {
  db.prepare("DELETE FROM pricing WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
