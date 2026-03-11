import 'dotenv/config';
import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import { nanoid } from 'nanoid';
import { AlbumPayloadSchema, SongPayloadSchema } from './validator/schema.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

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

// --- USERS ENDPOINTS (Register) ---

app.post('/users', async (req, res) => {
    try {
        const { username, password, fullname } = req.body;

        if (!username || !password || !fullname) {
            return res.status(400).json({ status: 'fail', message: 'Username, password, dan fullname wajib diisi' });
        }

        // Cek apakah username sudah ada
        const checkUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ status: 'fail', message: 'Username sudah digunakan' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = `user-${nanoid(16)}`;

        await pool.query(
            'INSERT INTO users(id, username, password, fullname) VALUES($1, $2, $3, $4)',
            [id, username, hashedPassword, fullname]
        );

        res.status(201).json({ status: 'success', data: { userId: id } });
    } catch (err) { handleError(res, err); }
});

// --- AUTHENTICATIONS ENDPOINTS (Login / Refresh / Logout) ---

// POST /authentications - Login
app.post('/authentications', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ status: 'fail', message: 'Username dan password wajib diisi' });
        }

        const result = await pool.query('SELECT id, password FROM users WHERE username = $1', [username]);
        if (!result.rows.length) {
            return res.status(401).json({ status: 'fail', message: 'Username tidak ditemukan' });
        }

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ status: 'fail', message: 'Password salah' });
        }

        const accessToken = jwt.sign({ userId: user.id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30m' });
        const refreshToken = jwt.sign({ userId: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

        // Simpan refresh token di database
        await pool.query('INSERT INTO authentications(token) VALUES($1)', [refreshToken]);

        res.status(201).json({
            status: 'success',
            data: { accessToken, refreshToken },
        });
    } catch (err) { handleError(res, err); }
});

// PUT /authentications - Refresh Access Token
app.put('/authentications', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ status: 'fail', message: 'Refresh token wajib diisi' });
        }

        // Cek apakah refresh token ada di database
        const tokenResult = await pool.query('SELECT token FROM authentications WHERE token = $1', [refreshToken]);
        if (!tokenResult.rows.length) {
            return res.status(403).json({ status: 'fail', message: 'Refresh token tidak valid' });
        }

        // Verifikasi refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const accessToken = jwt.sign({ userId: decoded.userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30m' });

        res.json({ status: 'success', data: { accessToken } });
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(403).json({ status: 'fail', message: 'Refresh token tidak valid' });
        }
        handleError(res, err);
    }
});

// DELETE /authentications - Logout
app.delete('/authentications', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ status: 'fail', message: 'Refresh token wajib diisi' });
        }

        const tokenResult = await pool.query('SELECT token FROM authentications WHERE token = $1', [refreshToken]);
        if (!tokenResult.rows.length) {
            return res.status(403).json({ status: 'fail', message: 'Refresh token tidak valid' });
        }

        await pool.query('DELETE FROM authentications WHERE token = $1', [refreshToken]);
        res.json({ status: 'success', message: 'Refresh token berhasil dihapus' });
    } catch (err) { handleError(res, err); }
});

// --- MIDDLEWARE & HELPERS ---

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

    if (token == null) {
        return res.status(401).json({
            status: 'fail',
            message: 'Akses ditolak, token tidak ada'
        });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                status: 'fail',
                message: 'Token tidak valid'
            });
        }

        // Simpan payload user (seperti userId) ke object req agar bisa dipakai di route handler
        req.user = user;
        next(); // Lanjut ke function selanjutnya (route handler)
    });
};

const logActivity = async (playlistId, songId, userId, action) => {
    const id = `activity-${nanoid(16)}`;
    const time = new Date().toISOString();
    await pool.query(
        'INSERT INTO playlist_song_activities(id, playlist_id, song_id, user_id, action, time) VALUES($1, $2, $3, $4, $5, $6)',
        [id, playlistId, songId, userId, action, time]
    );
};

// --- SERVER START (Kriteria 1) ---
const port = process.env.PORT || 5000;
const host = process.env.HOST || 'localhost';
app.listen(port, host, () => {
    console.log(`Server berjalan pada http://${host}:${port}`);
});

// POST /playlists
app.post('/playlists', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const { userId } = req.user; // Didapat dari JWT payload
        const id = `playlist-${nanoid(16)}`;

        await pool.query('INSERT INTO playlists(id, name, owner) VALUES($1, $2, $3)', [id, name, userId]);
        res.status(201).json({ status: 'success', data: { playlistId: id } });
    } catch (error) { handleError(res, error); }
});

// GET /playlists
app.get('/playlists', authenticateToken, async (req, res) => {
    const { userId } = req.user;
    // Query ini mengambil playlist milik sendiri ATAU playlist di mana user jadi kolaborator
    const query = `
    SELECT playlists.id, playlists.name, users.username 
    FROM playlists
    LEFT JOIN users ON users.id = playlists.owner
    LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
    WHERE playlists.owner = $1 OR collaborations.user_id = $1
    GROUP BY playlists.id, users.username`;

    const result = await pool.query(query, [userId]);
    res.json({ status: 'success', data: { playlists: result.rows } });
});

// DELETE /playlists
app.delete('/playlists/:playlistId', authenticateToken, async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { userId } = req.user;

        // Pastikan user adalah owner dari playlist
        const playlistResult = await pool.query('SELECT owner FROM playlists WHERE id = $1', [playlistId]);
        if (!playlistResult.rows.length) {
            return res.status(404).json({ status: 'fail', message: 'Playlist tidak ditemukan' });
        }

        if (playlistResult.rows[0].owner !== userId) {
            return res.status(403).json({ status: 'fail', message: 'Akses ditolak' });
        }

        await pool.query('DELETE FROM playlists WHERE id = $1', [playlistId]);
        res.json({ status: 'success', message: 'Playlist berhasil dihapus' });
    } catch (error) { handleError(res, error); }
});

// --- COLLABORATIONS ENDPOINTS ---

// POST /collaborations - Menambahkan kolaborator playlist
app.post('/collaborations', authenticateToken, async (req, res) => {
    try {
        const { playlistId, userId: targetUserId } = req.body;
        const { userId } = req.user;

        if (!playlistId || !targetUserId) {
            return res.status(400).json({ status: 'fail', message: 'playlistId dan userId wajib diisi' });
        }

        // Cek playlist ada dan user adalah owner
        const playlistResult = await pool.query('SELECT owner FROM playlists WHERE id = $1', [playlistId]);
        if (!playlistResult.rows.length) {
            return res.status(404).json({ status: 'fail', message: 'Playlist tidak ditemukan' });
        }
        if (playlistResult.rows[0].owner !== userId) {
            return res.status(403).json({ status: 'fail', message: 'Hanya owner yang bisa menambah kolaborator' });
        }

        // Cek target user ada
        const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [targetUserId]);
        if (!userResult.rows.length) {
            return res.status(404).json({ status: 'fail', message: 'User tidak ditemukan' });
        }

        const id = `collab-${nanoid(16)}`;
        await pool.query(
            'INSERT INTO collaborations(id, playlist_id, user_id) VALUES($1, $2, $3)',
            [id, playlistId, targetUserId]
        );

        res.status(201).json({ status: 'success', data: { collaborationId: id } });
    } catch (error) { handleError(res, error); }
});

// DELETE /collaborations - Menghapus kolaborator playlist
app.delete('/collaborations', authenticateToken, async (req, res) => {
    try {
        const { playlistId, userId: targetUserId } = req.body;
        const { userId } = req.user;

        if (!playlistId || !targetUserId) {
            return res.status(400).json({ status: 'fail', message: 'playlistId dan userId wajib diisi' });
        }

        // Cek playlist ada dan user adalah owner
        const playlistResult = await pool.query('SELECT owner FROM playlists WHERE id = $1', [playlistId]);
        if (!playlistResult.rows.length) {
            return res.status(404).json({ status: 'fail', message: 'Playlist tidak ditemukan' });
        }
        if (playlistResult.rows[0].owner !== userId) {
            return res.status(403).json({ status: 'fail', message: 'Hanya owner yang bisa menghapus kolaborator' });
        }

        const deleteResult = await pool.query(
            'DELETE FROM collaborations WHERE playlist_id = $1 AND user_id = $2 RETURNING id',
            [playlistId, targetUserId]
        );
        if (!deleteResult.rows.length) {
            return res.status(404).json({ status: 'fail', message: 'Kolaborasi tidak ditemukan' });
        }

        res.json({ status: 'success', message: 'Kolaborator berhasil dihapus' });
    } catch (error) { handleError(res, error); }
});

// --- PLAYLIST SONGS ENDPOINTS ---

// POST /playlists/{id}/songs - Menambahkan lagu ke playlist
app.post('/playlists/:id/songs', authenticateToken, async (req, res) => {
    try {
        const { id: playlistId } = req.params;
        const { songId } = req.body;
        const { userId } = req.user;

        if (!songId) {
            return res.status(400).json({ status: 'fail', message: 'songId wajib diisi' });
        }

        // Cek playlist ada dan user punya akses (owner atau kolaborator)
        const accessQuery = `
            SELECT playlists.id FROM playlists
            LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
            WHERE playlists.id = $1 AND (playlists.owner = $2 OR collaborations.user_id = $2)`;
        const accessResult = await pool.query(accessQuery, [playlistId, userId]);
        if (!accessResult.rows.length) {
            return res.status(403).json({ status: 'fail', message: 'Anda tidak berhak mengakses playlist ini' });
        }

        // Cek song ada
        const songResult = await pool.query('SELECT id FROM songs WHERE id = $1', [songId]);
        if (!songResult.rows.length) {
            return res.status(404).json({ status: 'fail', message: 'Lagu tidak ditemukan' });
        }

        const id = `playlist-song-${nanoid(16)}`;
        await pool.query(
            'INSERT INTO playlist_songs(id, playlist_id, song_id) VALUES($1, $2, $3)',
            [id, playlistId, songId]
        );

        await logActivity(playlistId, songId, userId, 'add');

        res.status(201).json({ status: 'success', message: 'Lagu berhasil ditambahkan ke playlist' });
    } catch (error) { handleError(res, error); }
});

// GET /playlists/{id}/songs - Melihat daftar lagu di dalam playlist
app.get('/playlists/:id/songs', authenticateToken, async (req, res) => {
    try {
        const { id: playlistId } = req.params;
        const { userId } = req.user;

        // Cek akses
        const accessQuery = `
            SELECT playlists.id, playlists.name, users.username
            FROM playlists
            LEFT JOIN users ON users.id = playlists.owner
            LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
            WHERE playlists.id = $1 AND (playlists.owner = $2 OR collaborations.user_id = $2)`;
        const accessResult = await pool.query(accessQuery, [playlistId, userId]);
        if (!accessResult.rows.length) {
            return res.status(403).json({ status: 'fail', message: 'Anda tidak berhak mengakses playlist ini' });
        }

        const playlist = accessResult.rows[0];

        // Ambil lagu-lagu di playlist
        const songsQuery = `
            SELECT songs.id, songs.title, songs.performer
            FROM songs
            JOIN playlist_songs ON playlist_songs.song_id = songs.id
            WHERE playlist_songs.playlist_id = $1`;
        const songsResult = await pool.query(songsQuery, [playlistId]);

        playlist.songs = songsResult.rows;

        res.json({ status: 'success', data: { playlist } });
    } catch (error) { handleError(res, error); }
});

// DELETE /playlists/{id}/songs - Menghapus lagu dari playlist
app.delete('/playlists/:id/songs', authenticateToken, async (req, res) => {
    try {
        const { id: playlistId } = req.params;
        const { songId } = req.body;
        const { userId } = req.user;

        if (!songId) {
            return res.status(400).json({ status: 'fail', message: 'songId wajib diisi' });
        }

        // Cek akses
        const accessQuery = `
            SELECT playlists.id FROM playlists
            LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
            WHERE playlists.id = $1 AND (playlists.owner = $2 OR collaborations.user_id = $2)`;
        const accessResult = await pool.query(accessQuery, [playlistId, userId]);
        if (!accessResult.rows.length) {
            return res.status(403).json({ status: 'fail', message: 'Anda tidak berhak mengakses playlist ini' });
        }

        const deleteResult = await pool.query(
            'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2 RETURNING id',
            [playlistId, songId]
        );
        if (!deleteResult.rows.length) {
            return res.status(404).json({ status: 'fail', message: 'Lagu tidak ditemukan di dalam playlist' });
        }

        await logActivity(playlistId, songId, userId, 'delete');

        res.json({ status: 'success', message: 'Lagu berhasil dihapus dari playlist' });
    } catch (error) { handleError(res, error); }
});

// GET /playlists/{id}/activities - Melihat riwayat aktivitas playlist
app.get('/playlists/:id/activities', authenticateToken, async (req, res) => {
    try {
        const { id: playlistId } = req.params;
        const { userId } = req.user;

        // Cek akses (owner atau kolaborator)
        const accessQuery = `
            SELECT playlists.id FROM playlists
            LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
            WHERE playlists.id = $1 AND (playlists.owner = $2 OR collaborations.user_id = $2)`;
        const accessResult = await pool.query(accessQuery, [playlistId, userId]);
        if (!accessResult.rows.length) {
            return res.status(403).json({ status: 'fail', message: 'Anda tidak berhak mengakses playlist ini' });
        }

        const activitiesQuery = `
            SELECT users.username, songs.title, playlist_song_activities.action, playlist_song_activities.time
            FROM playlist_song_activities
            JOIN users ON users.id = playlist_song_activities.user_id
            JOIN songs ON songs.id = playlist_song_activities.song_id
            WHERE playlist_song_activities.playlist_id = $1
            ORDER BY playlist_song_activities.time ASC`;
        const activitiesResult = await pool.query(activitiesQuery, [playlistId]);

        res.json({
            status: 'success',
            data: {
                playlistId,
                activities: activitiesResult.rows,
            },
        });
    } catch (error) { handleError(res, error); }
});

