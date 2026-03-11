export const up = (pgm) => {
  // 1. Table Users
  pgm.createTable('users', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    username: { type: 'VARCHAR(50)', notNull: true, unique: true },
    password: { type: 'TEXT', notNull: true },
    fullname: { type: 'TEXT', notNull: true },
  });

  // 2. Table Authentications (Simpan Refresh Token)
  pgm.createTable('authentications', {
    token: { type: 'TEXT', notNull: true },
  });

  // 3. Table Playlists
  pgm.createTable('playlists', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    name: { type: 'TEXT', notNull: true },
    owner: { type: 'VARCHAR(50)', references: '"users"', onDelete: 'CASCADE' },
  });

  // 4. Table Playlist_Songs (Relasi Song ke Playlist)
  pgm.createTable('playlist_songs', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    playlist_id: { type: 'VARCHAR(50)', references: '"playlists"', onDelete: 'CASCADE' },
    song_id: { type: 'VARCHAR(50)', references: '"songs"', onDelete: 'CASCADE' },
  });

  // 5. Table Collaborations (Opsional 1)
  pgm.createTable('collaborations', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    playlist_id: { type: 'VARCHAR(50)', references: '"playlists"', onDelete: 'CASCADE' },
    user_id: { type: 'VARCHAR(50)', references: '"users"', onDelete: 'CASCADE' },
  });

  // 6. Table Activities (Opsional 2)
  pgm.createTable('playlist_song_activities', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    playlist_id: { type: 'VARCHAR(50)', references: '"playlists"', onDelete: 'CASCADE' },
    song_id: { type: 'VARCHAR(50)', notNull: true }, // Kita simpan ID lagunya
    user_id: { type: 'VARCHAR(50)', notNull: true },
    action: { type: 'TEXT', notNull: true },
    time: { type: 'TEXT', notNull: true },
  });
};