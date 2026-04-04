import { Router, Request, Response } from "express";
import db from "../database";

const router = Router();

// criar tabela se nao existir
db.exec(`
  CREATE TABLE IF NOT EXISTS vasilhame (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT DEFAULT '',
    brand TEXT NOT NULL,
    type TEXT DEFAULT 'caixa',
    quantity INTEGER DEFAULT 1,
    returned INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    returned_at TEXT
  );
`);

// listar todos
router.get("/", (_req: Request, res: Response) => {
  const items = db.prepare(`
    SELECT *,
      CASE WHEN returned = 1 THEN 'devolvido' ELSE 'emprestado' END as status
    FROM vasilhame
    ORDER BY returned ASC, created_at DESC
  `).all();
  res.json(items);
});

// adicionar emprestimo
router.post("/", (req: Request, res: Response) => {
  const { customer_name, customer_phone, brand, type, quantity, notes } = req.body;
  if (!customer_name || !brand) {
    res.status(400).json({ error: "Nome do cliente e marca são obrigatórios" });
    return;
  }
  const created = req.body.date ? req.body.date + ' 00:00:00' : new Date().toISOString().slice(0, 19).replace('T', ' ');
  const result = db.prepare(
    "INSERT INTO vasilhame (customer_name, customer_phone, brand, type, quantity, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(customer_name, customer_phone || "", brand, type || "caixa", quantity || 1, notes || "", created);
  res.json({ id: result.lastInsertRowid });
});

// marcar como devolvido
router.put("/:id/devolver", (req: Request, res: Response) => {
  db.prepare(
    "UPDATE vasilhame SET returned=1, returned_at=datetime('now','localtime') WHERE id=?"
  ).run(req.params.id);
  res.json({ ok: true });
});

// deletar
router.delete("/:id", (req: Request, res: Response) => {
  db.prepare("DELETE FROM vasilhame WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// resumo
router.get("/resumo", (_req: Request, res: Response) => {
  const emprestados = db.prepare(
    "SELECT COALESCE(SUM(quantity), 0) as total FROM vasilhame WHERE returned=0"
  ).get() as any;
  const devolvidos = db.prepare(
    "SELECT COALESCE(SUM(quantity), 0) as total FROM vasilhame WHERE returned=1"
  ).get() as any;
  const clientes = db.prepare(
    "SELECT COUNT(DISTINCT customer_name) as total FROM vasilhame WHERE returned=0"
  ).get() as any;
  res.json({
    emprestados: emprestados.total,
    devolvidos: devolvidos.total,
    clientes: clientes.total,
  });
});

export default router;
