const jwt = require('jsonwebtoken');

function makeAuth(allowedRoles) {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ success: false, message: 'Access Denied.' });

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ success: false, message: 'Access Denied.' });
      }

      const token = parts[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ success: false, message: 'Access Denied.' });
      }

      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
  };
}

const superAdminAuth = makeAuth(['super_admin']);
const flexAuth = makeAuth(['super_admin', 'admin']);
const allStaffAuth = makeAuth(['super_admin', 'admin', 'production']);

module.exports = { superAdminAuth, flexAuth, allStaffAuth };