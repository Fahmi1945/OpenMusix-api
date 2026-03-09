# OpenMusic API

REST API sederhana untuk mengelola data **Album** dan **Lagu** (Songs), dibangun menggunakan Express.js dan PostgreSQL.

## Tech Stack

- **Runtime:** Node.js (ESM)
- **Framework:** Express v5
- **Database:** PostgreSQL
- **Validation:** Joi
- **Migration:** node-pg-migrate
- **ID Generator:** nanoid

## Fitur

### Albums

| Method | Endpoint      | Deskripsi                                       |
| ------ | ------------- | ----------------------------------------------- |
| POST   | `/albums`     | Menambahkan album baru                          |
| GET    | `/albums/:id` | Mendapatkan detail album beserta daftar lagunya |
| PUT    | `/albums/:id` | Mengubah data album                             |
| DELETE | `/albums/:id` | Menghapus album                                 |

### Songs

| Method | Endpoint     | Deskripsi                                                           |
| ------ | ------------ | ------------------------------------------------------------------- |
| POST   | `/songs`     | Menambahkan lagu baru                                               |
| GET    | `/songs`     | Mendapatkan daftar lagu (mendukung query `?title=` & `?performer=`) |
| GET    | `/songs/:id` | Mendapatkan detail lagu                                             |
| PUT    | `/songs/:id` | Mengubah data lagu                                                  |
| DELETE | `/songs/:id` | Menghapus lagu                                                      |

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
│   └── 1773071469401_initial-table.js   # Migrasi tabel albums & songs
├── src/
│   ├── server.js                        # Entry point & endpoint definitions
│   └── validator/
│       └── schema.js                    # Joi validation schemas
├── .env                                 # Environment variables
├── package.json
└── README.md
```

## Contoh Request

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
