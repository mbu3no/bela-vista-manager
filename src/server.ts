import express from "express";
import path from "path";
import fs from "fs";
import db from "./database";
import validadeRoutes from "./routes/validade";
import precificacaoRoutes from "./routes/precificacao";
import fiadoRoutes from "./routes/fiado";
import vasilhameRoutes from "./routes/vasilhame";

const app = express();
const PORT = 3000;

const DATA_DIR = path.join(__dirname, "..", "data");
const BACKUP_DIR = path.join(__dirname, "..", "backups");

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// rotas da API
app.use("/api/validade", validadeRoutes);
app.use("/api/precificacao", precificacaoRoutes);
app.use("/api/fiado", fiadoRoutes);
app.use("/api/vasilhame", vasilhameRoutes);

// backup manual — baixa o arquivo do banco
app.get("/api/backup/download", (_req, res) => {
  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
    const dbPath = path.join(DATA_DIR, "belavista.db");
    const date = new Date().toISOString().slice(0, 10);
    res.download(dbPath, `belavista-backup-${date}.db`);
  } catch (e) {
    res.status(500).json({ error: "Erro ao gerar backup" });
  }
});

// backup automatico — salva copia na pasta backups
app.post("/api/backup/save", (_req, res) => {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    db.pragma("wal_checkpoint(TRUNCATE)");
    const dbPath = path.join(DATA_DIR, "belavista.db");
    const date = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupPath = path.join(BACKUP_DIR, `belavista-${date}.db`);
    fs.copyFileSync(dbPath, backupPath);

    // manter apenas os ultimos 10 backups
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith(".db"))
      .sort()
      .reverse();
    for (const old of files.slice(10)) {
      fs.unlinkSync(path.join(BACKUP_DIR, old));
    }

    res.json({ ok: true, file: backupPath });
  } catch (e) {
    res.status(500).json({ error: "Erro ao salvar backup" });
  }
});

// listar backups existentes
app.get("/api/backup/list", (_req, res) => {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith(".db"))
      .sort()
      .reverse()
      .map(f => ({
        name: f,
        size: Math.round(fs.statSync(path.join(BACKUP_DIR, f)).size / 1024) + " KB",
        date: f.replace("belavista-", "").replace(".db", "").replace(/-/g, "/").slice(0, 10),
      }));
    res.json(files);
  } catch (_) {
    res.json([]);
  }
});

app.listen(PORT, () => {
  console.log(`\n  Bela Vista Manager rodando em http://localhost:${PORT}\n`);
});
