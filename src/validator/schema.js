import Joi from 'joi';

export const AlbumPayloadSchema = Joi.object({
  name: Joi.string().required(),
  year: Joi.number().integer().required(),
});

export const SongPayloadSchema = Joi.object({
  title: Joi.string().required(),
  year: Joi.number().integer().required(),
  genre: Joi.string().required(),
  performer: Joi.string().required(),
  duration: Joi.number(), // Opsional
  albumId: Joi.string(), // Opsional
});

export const UserPayloadSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
  fullname: Joi.string().required(),
});

export const AuthenticationPayloadSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

export const PlaylistPayloadSchema = Joi.object({
  name: Joi.string().required(),
});

export const PlaylistSongPayloadSchema = Joi.object({
  songId: Joi.string().required(),
});