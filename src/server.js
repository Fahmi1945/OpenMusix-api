import 'dotenv/config';
import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import { nanoid } from 'nanoid';
import { AlbumPayloadSchema, SongPayloadSchema } from './validator/schema.js';

const app = express();
app.use(express.json());

const pool = new Pool();

// --- Error Handling Middleware (Kriteria 5) ---
const handleError = (res, error) => {
    if (error.isJoi) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Terjadi kegagalan pada server kami' });
};

// --- ALBUMS ENDPOINTS ---

app.post('/albums', async (req, res) => {
    try {
        const { error } = AlbumPayloadSchema.validate(req.body);
        if (error) throw error;
        const { name, year } = req.body;
        const id = `album-${nanoid(16)}`;
        await pool.query('INSERT INTO albums(id, name, year) VALUES($1, $2, $3)', [id, name, year]);
        res.status(201).json({ status: 'success', data: { albumId: id } });
    } catch (err) { handleError(res, err); }
});

app.get('/albums/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Ambil data album spesifik
        const albumResult = await pool.query(
            'SELECT id, name, year FROM albums WHERE id = $1',
            [id]
        );

        // Jika album tidak ada, kembalikan 404
        if (albumResult.rows.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: 'Album tidak ditemukan',
            });
        }

        const album = albumResult.rows[0];

        // 2. Ambil daftar lagu yang memiliki albumId tersebut (Kriteria Opsional 1)
        // Gunakan tanda petik dua pada "albumId" karena PostgreSQL sensitif huruf besar
        const songsResult = await pool.query(
            'SELECT id, title, performer FROM songs WHERE "albumId" = $1',
            [id]
        );

        // 3. MASUKKAN array lagu ke dalam objek album (Inilah kuncinya!)
        album.songs = songsResult.rows;

        // 4. Kirim respons dengan struktur data -> album -> songs
        return res.status(200).json({
            status: 'success',
            data: {
                album,
            },
        });
    } catch (error) {
        return handleError(res, error);
    }
});

app.put('/albums/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = AlbumPayloadSchema.validate(req.body);
        if (error) throw error;
        const { name, year } = req.body;
        const result = await pool.query('UPDATE albums SET name = $1, year = $2 WHERE id = $3 RETURNING id', [name, year, id]);
        if (!result.rows.length) return res.status(404).json({ status: 'fail', message: 'Id tidak ditemukan' });
        res.json({ status: 'success', message: 'Album berhasil diperbarui' });
    } catch (err) { handleError(res, err); }
});

app.delete('/albums/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM albums WHERE id = $1 RETURNING id', [id]);
        if (!result.rows.length) return res.status(404).json({ status: 'fail', message: 'Id tidak ditemukan' });
        res.json({ status: 'success', message: 'Album berhasil dihapus' });
    } catch (err) { handleError(res, err); }
});

// --- SONGS ENDPOINTS ---

app.post('/songs', async (req, res) => {
    try {
        const { error } = SongPayloadSchema.validate(req.body);
        if (error) throw error;
        const { title, year, genre, performer, duration, albumId } = req.body;
        const id = `song-${nanoid(16)}`;
        await pool.query(
            'INSERT INTO songs(id, title, year, genre, performer, duration, "albumId") VALUES($1, $2, $3, $4, $5, $6, $7)',
            [id, title, year, genre, performer, duration, albumId]
        );
        res.status(201).json({ status: 'success', data: { songId: id } });
    } catch (err) { handleError(res, err); }
});

// Kriteria Opsional 2: Search dengan Query Parameter (?title & ?performer)
app.get('/songs', async (req, res) => {
    try {
        const { title = '', performer = '' } = req.query;
        const result = await pool.query(
            'SELECT id, title, performer FROM songs WHERE title ILIKE $1 AND performer ILIKE $2',
            [`%${title}%`, `%${performer}%`]
        );
        res.json({ status: 'success', data: { songs: result.rows } });
    } catch (err) { handleError(res, err); }
});

app.get('/songs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM songs WHERE id = $1', [id]);
        if (!result.rows.length) return res.status(404).json({ status: 'fail', message: 'Lagu tidak ditemukan' });
        res.json({ status: 'success', data: { song: result.rows[0] } });
    } catch (err) { handleError(res, err); }
});

app.put('/songs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = SongPayloadSchema.validate(req.body);
        if (error) throw error;
        const { title, year, genre, performer, duration, albumId } = req.body;
        const result = await pool.query(
            'UPDATE songs SET title = $1, year = $2, genre = $3, performer = $4, duration = $5, "albumId" = $6 WHERE id = $7 RETURNING id',
            [title, year, genre, performer, duration, albumId, id]
        );
        if (!result.rows.length) return res.status(404).json({ status: 'fail', message: 'Id tidak ditemukan' });
        res.json({ status: 'success', message: 'Lagu berhasil diperbarui' });
    } catch (err) { handleError(res, err); }
});

app.delete('/songs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM songs WHERE id = $1 RETURNING id', [id]);
        if (!result.rows.length) return res.status(404).json({ status: 'fail', message: 'Id tidak ditemukan' });
        res.json({ status: 'success', message: 'Lagu berhasil dihapus' });
    } catch (err) { handleError(res, err); }
});

// --- SERVER START (Kriteria 1) ---
const port = process.env.PORT || 5000;
const host = process.env.HOST || 'localhost';
app.listen(port, host, () => {
    console.log(`Server berjalan pada http://${host}:${port}`);
});