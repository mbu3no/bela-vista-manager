import { Router, Request, Response } from "express";
import db from "../database";

const router = Router();

// listar todos os produtos
router.get("/", (_req: Request, res: Response) => {
  const products = db.prepare(`
    SELECT *,
      CASE
        WHEN date(expiry_date) < date('now', 'localtime') THEN 'vencido'
        WHEN date(expiry_date) <= date('now', 'localtime', '+7 days') THEN 'alerta'
        ELSE 'ok'
      END as status
    FROM products
    ORDER BY expiry_date ASC
  `).all();
  res.json(products);
});

// adicionar produto
router.post("/", (req: Request, res: Response) => {
  const { name, category, expiry_date, quantity, notes } = req.body;
  if (!name || !expiry_date) {
    res.status(400).json({ error: "Nome e data de validade são obrigatórios" });
    return;
  }
  const result = db.prepare(
    "INSERT INTO products (name, category, expiry_date, quantity, notes) VALUES (?, ?, ?, ?, ?)"
  ).run(name, category || "", expiry_date, quantity || 1, notes || "");
  res.json({ id: result.lastInsertRowid });
});

// atualizar produto
router.put("/:id", (req: Request, res: Response) => {
  const { name, category, expiry_date, quantity, notes } = req.body;
  db.prepare(
    "UPDATE products SET name=?, category=?, expiry_date=?, quantity=?, notes=? WHERE id=?"
  ).run(name, category, expiry_date, quantity, notes, req.params.id);
  res.json({ ok: true });
});

// deletar produto
router.delete("/:id", (req: Request, res: Response) => {
  db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// resumo
router.get("/resumo", (_req: Request, res: Response) => {
  const total = db.prepare("SELECT COUNT(*) as count FROM products").get() as any;
  const vencidos = db.prepare(
    "SELECT COUNT(*) as count FROM products WHERE date(expiry_date) < date('now', 'localtime')"
  ).get() as any;
  const alerta = db.prepare(
    "SELECT COUNT(*) as count FROM products WHERE date(expiry_date) >= date('now', 'localtime') AND date(expiry_date) <= date('now', 'localtime', '+7 days')"
  ).get() as any;
  const ok = db.prepare(
    "SELECT COUNT(*) as count FROM products WHERE date(expiry_date) > date('now', 'localtime', '+7 days')"
  ).get() as any;
  res.json({
    total: total.count,
    vencidos: vencidos.count,
    alerta: alerta.count,
    ok: ok.count,
  });
});

export default router;
