const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MongoDB Atlas (nube)
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch((err) => console.error('Error de conexión:', err.message));

// Esquema flexible del historial clínico
const historialSchema = new mongoose.Schema(
  {
    mascota_id: { type: Number, required: true, index: true },
    fecha: { type: Date, default: Date.now },
    diagnostico: { type: String, required: true },
    tratamiento: [String],
    vacunas: [{ nombre: String, dosis: Number }],
    notas: String,
    estado: { type: Boolean, default: true },
  },
  { collection: 'historial_clinico', timestamps: true }
);

const Historial = mongoose.model('Historial', historialSchema);

// CREATE
app.post('/historial', async (req, res) => {
  try {
    const doc = await Historial.create({ ...req.body, estado: true });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// READ: historial activo de una mascota (?estado=false lista los inactivos)
app.get('/historial/mascota/:id', async (req, res) => {
  try {
    const estado = req.query.estado === 'false' ? false : true;
    const docs = await Historial.find({
      mascota_id: Number(req.params.id),
      estado,
    }).sort({ fecha: -1 });
    res.json(docs);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// UPDATE
app.put('/historial/:id', async (req, res) => {
  try {
    const datos = { ...req.body };
    delete datos.estado;
    const doc = await Historial.findOneAndUpdate(
      { _id: req.params.id, estado: true },
      datos,
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE LÓGICO: no borra, solo estado = false
app.delete('/historial/:id', async (req, res) => {
  try {
    const doc = await Historial.findByIdAndUpdate(
      req.params.id,
      { estado: false },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    res.json({ mensaje: 'Registro desactivado', doc });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// RESTAURAR (opcional, útil para la demo)
app.patch('/historial/:id/restaurar', async (req, res) => {
  try {
    const doc = await Historial.findByIdAndUpdate(
      req.params.id,
      { estado: true },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    res.json({ mensaje: 'Registro restaurado', doc });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/', (req, res) => res.send('API Veterinaria funcionando'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API en http://localhost:${PORT}`));
