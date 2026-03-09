// Gunakan sintaks 'export' bukan 'exports.up'
export const up = (pgm) => {
  // Tabel Albums
  pgm.createTable('albums', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    name: { type: 'TEXT', notNull: true },
    year: { type: 'INTEGER', notNull: true },
  });

  // Tabel Songs
  pgm.createTable('songs', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    title: { type: 'TEXT', notNull: true },
    year: { type: 'INTEGER', notNull: true },
    performer: { type: 'TEXT', notNull: true },
    genre: { type: 'TEXT', notNull: true },
    duration: { type: 'INTEGER' },
    albumId: { 
      type: 'VARCHAR(50)', 
      references: '"albums"', 
      onDelete: 'CASCADE' 
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable('songs');
  pgm.dropTable('albums');
};