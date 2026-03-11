# OpenMusic API

REST API untuk mengelola data **Album**, **Lagu**, **Users**, **Playlist**, **Kolaborasi**, dan **Aktivitas Playlist**, dibangun menggunakan Express.js dan PostgreSQL.

## Tech Stack

- **Runtime:** Node.js (ESM)
- **Framework:** Express v5
- **Database:** PostgreSQL
- **Validation:** Joi
- **Migration:** node-pg-migrate
- **Authentication:** JWT (jsonwebtoken) + bcrypt
- **ID Generator:** nanoid

## Fitur

### Albums

| Method | Endpoint      | Auth | Deskripsi                                       |
| ------ | ------------- | ---- | ----------------------------------------------- |
| POST   | `/albums`     | -    | Menambahkan album baru                          |
| GET    | `/albums/:id` | -    | Mendapatkan detail album beserta daftar lagunya |
| PUT    | `/albums/:id` | -    | Mengubah data album                             |
| DELETE | `/albums/:id` | -    | Menghapus album                                 |

### Songs

| Method | Endpoint     | Auth | Deskripsi                                                           |
| ------ | ------------ | ---- | ------------------------------------------------------------------- |
| POST   | `/songs`     | -    | Menambahkan lagu baru                                               |
| GET    | `/songs`     | -    | Mendapatkan daftar lagu (mendukung query `?title=` & `?performer=`) |
| GET    | `/songs/:id` | -    | Mendapatkan detail lagu                                             |
| PUT    | `/songs/:id` | -    | Mengubah data lagu                                                  |
| DELETE | `/songs/:id` | -    | Menghapus lagu                                                      |

### Users

| Method | Endpoint | Auth | Deskripsi            |
| ------ | -------- | ---- | -------------------- |
| POST   | `/users` | -    | Registrasi user baru |

### Authentications

| Method | Endpoint           | Auth | Deskripsi                                  |
| ------ | ------------------ | ---- | ------------------------------------------ |
| POST   | `/authentications` | -    | Login (mendapatkan access & refresh token) |
| PUT    | `/authentications` | -    | Refresh access token                       |
| DELETE | `/authentications` | -    | Logout (menghapus refresh token)           |

### Playlists

| Method | Endpoint                    | Auth   | Deskripsi                             |
| ------ | --------------------------- | ------ | ------------------------------------- |
| POST   | `/playlists`                | Bearer | Menambahkan playlist baru             |
| GET    | `/playlists`                | Bearer | Mendapatkan daftar playlist           |
| DELETE | `/playlists/:id`            | Bearer | Menghapus playlist (hanya owner)      |
| POST   | `/playlists/:id/songs`      | Bearer | Menambahkan lagu ke playlist          |
| GET    | `/playlists/:id/songs`      | Bearer | Melihat daftar lagu di dalam playlist |
| DELETE | `/playlists/:id/songs`      | Bearer | Menghapus lagu dari playlist          |
| GET    | `/playlists/:id/activities` | Bearer | Melihat riwayat aktivitas playlist    |

### Collaborations

| Method | Endpoint          | Auth   | Deskripsi                           |
| ------ | ----------------- | ------ | ----------------------------------- |
| POST   | `/collaborations` | Bearer | Menambahkan kolaborator ke playlist |
| DELETE | `/collaborations` | Bearer | Menghapus kolaborator dari playlist |

## Prasyarat

- Node.js >= 18
- PostgreSQL

## Instalasi

1. **Clone repository**

   ```bash
   git clone <url-repo>
   cd <nama-folder>
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Buat database PostgreSQL**

   ```sql
   CREATE DATABASE music_db;
   ```

4. **Konfigurasi environment**

   Buat file `.env` di root project:

   ```env
   PORT=5000
   HOST=localhost

   PGUSER=postgres
   PGPASSWORD=<password-postgres-mu>
   PGDATABASE=music_db
   PGHOST=localhost
   PGPORT=5432

   ACCESS_TOKEN_SECRET=<secret-key-bebas>
   REFRESH_TOKEN_SECRET=<secret-key-bebas>
   ```

5. **Jalankan migrasi database**
   ```bash
   npm run migrate up
   ```

## Menjalankan Server

**Development** (dengan auto-reload):

```bash
npm run dev
```

**Production**:

```bash
npm start
```

Server akan berjalan di `http://localhost:5000`.

## Struktur Proyek

```
├── migrations/
│   ├── 1773071469401_initial-table.js           # Migrasi tabel albums & songs
│   └── 1773236333282_add-users-and-playlists.js # Migrasi tabel users, authentications, playlists, dll
├── src/
│   ├── server.js                                # Entry point & endpoint definitions
│   ├── middleware/
│   │   └── auth.js                              # JWT authentication middleware
│   └── validator/
│       └── schema.js                            # Joi validation schemas
├── .env                                         # Environment variables
├── package.json
└── README.md
```

## Contoh Request

### Register User

```bash
curl -X POST http://localhost:5000/users \
  -H "Content-Type: application/json" \
  -d '{"username": "johndoe", "password": "rahasia123", "fullname": "John Doe"}'
```

### Login

```bash
curl -X POST http://localhost:5000/authentications \
  -H "Content-Type: application/json" \
  -d '{"username": "johndoe", "password": "rahasia123"}'
```

### Tambah Album

```bash
curl -X POST http://localhost:5000/albums \
  -H "Content-Type: application/json" \
  -d '{"name": "Viva la Vida", "year": 2008}'
```

### Tambah Lagu

```bash
curl -X POST http://localhost:5000/songs \
  -H "Content-Type: application/json" \
  -d '{"title": "Viva la Vida", "year": 2008, "genre": "Alternative", "performer": "Coldplay", "duration": 242, "albumId": "album-xxxxxxxxxxxxxxxx"}'
```

### Cari Lagu

```bash
curl "http://localhost:5000/songs?title=viva&performer=coldplay"
```

### Buat Playlist (dengan Auth)

```bash
curl -X POST http://localhost:5000/playlists \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"name": "Playlist Favorit"}'
```

### Tambah Lagu ke Playlist

```bash
curl -X POST http://localhost:5000/playlists/<playlist_id>/songs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"songId": "song-xxxxxxxxxxxxxxxx"}'
```

### Tambah Kolaborator

```bash
curl -X POST http://localhost:5000/collaborations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"playlistId": "playlist-xxxxxxxxxxxxxxxx", "userId": "user-xxxxxxxxxxxxxxxx"}'
```

### Lihat Aktivitas Playlist

```bash
curl http://localhost:5000/playlists/<playlist_id>/activities \
  -H "Authorization: Bearer <access_token>"
```
