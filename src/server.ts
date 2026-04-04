import express from "express";
import path from "path";
import validadeRoutes from "./routes/validade";
import precificacaoRoutes from "./routes/precificacao";
import fiadoRoutes from "./routes/fiado";
import vasilhameRoutes from "./routes/vasilhame";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// rotas da API
app.use("/api/validade", validadeRoutes);
app.use("/api/precificacao", precificacaoRoutes);
app.use("/api/fiado", fiadoRoutes);
app.use("/api/vasilhame", vasilhameRoutes);

app.listen(PORT, () => {
  console.log(`\n  Bela Vista Manager rodando em http://localhost:${PORT}\n`);
});
