import { Router, Request, Response } from "express";
import db from "../database";

const router = Router();

// --- CLIENTES ---

router.get("/clientes", (_req: Request, res: Response) => {
  const customers = db.prepare(`
    SELECT c.*,
      COALESCE(SUM(CASE WHEN d.paid = 0 THEN d.amount ELSE 0 END), 0) as total_devido,
      COALESCE(SUM(CASE WHEN d.paid = 1 THEN d.amount ELSE 0 END), 0) as total_pago,
      COUNT(d.id) as total_registros
    FROM customers c
    LEFT JOIN debts d ON d.customer_id = c.id
    GROUP BY c.id
    ORDER BY total_devido DESC
  `).all();
  res.json(customers);
});

router.post("/clientes", (req: Request, res: Response) => {
  const { name, phone } = req.body;
  if (!name) {
    res.status(400).json({ error: "Nome é obrigatório" });
    return;
  }
  const result = db.prepare(
    "INSERT INTO customers (name, phone) VALUES (?, ?)"
  ).run(name, phone || "");
  res.json({ id: result.lastInsertRowid });
});

router.delete("/clientes/:id", (req: Request, res: Response) => {
  db.prepare("DELETE FROM customers WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// --- DIVIDAS ---

router.get("/dividas/:customerId", (req: Request, res: Response) => {
  const debts = db.prepare(
    "SELECT * FROM debts WHERE customer_id=? ORDER BY created_at DESC"
  ).all(req.params.customerId);
  res.json(debts);
});

router.post("/dividas", (req: Request, res: Response) => {
  const { customer_id, description, amount, date } = req.body;
  if (!customer_id || !description || amount == null) {
    res.status(400).json({ error: "Preencha todos os campos" });
    return;
  }
  const created = date ? date + ' 00:00:00' : new Date().toISOString().slice(0, 19).replace('T', ' ');
  const result = db.prepare(
    "INSERT INTO debts (customer_id, description, amount, created_at) VALUES (?, ?, ?, ?)"
  ).run(customer_id, description, amount, created);
  res.json({ id: result.lastInsertRowid });
});

router.put("/dividas/:id/pagar", (req: Request, res: Response) => {
  db.prepare(
    "UPDATE debts SET paid=1, paid_at=datetime('now','localtime') WHERE id=?"
  ).run(req.params.id);
  res.json({ ok: true });
});

router.delete("/dividas/:id", (req: Request, res: Response) => {
  db.prepare("DELETE FROM debts WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// --- RESUMO ---

router.get("/resumo", (_req: Request, res: Response) => {
  const total_clientes = db.prepare("SELECT COUNT(*) as count FROM customers").get() as any;
  const total_devido = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM debts WHERE paid=0"
  ).get() as any;
  const total_recebido = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM debts WHERE paid=1"
  ).get() as any;
  res.json({
    total_clientes: total_clientes.count,
    total_devido: total_devido.total,
    total_recebido: total_recebido.total,
  });
});

export default router;
