import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Ambil string setelah "Bearer"

  if (!token) return res.status(401).json({ status: 'fail', message: 'Access token diperlukan' });

  jwt.verify(token, process.env.ACCESS_TOKEN_KEY, (err, user) => {
    if (err) return res.status(401).json({ status: 'fail', message: 'Token tidak valid' });
    req.user = user; // Simpan payload userId ke req.user
    next();
  });
};